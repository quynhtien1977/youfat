import type { SubmissionSnapshot } from '../types/database';
import type { LockProvider, StorageLike, SubmissionListOptions, SubmissionPage, SubmissionRepository, SubmissionSummary } from '../types/submission-storage';
import { requireValid, SubmissionError } from './submission-errors';
import { canonicalJson, utf8Bytes, validateSnapshot, validateSubmissionId } from './submission-snapshot';
import { exportSubmissions, readEnvelope } from './submission-transfer';

export const LOCAL_SUBMISSIONS_KEY = 'youfat:submissions:v1';
export const LOCAL_MAX_ATTEMPTS = 100;
export const LOCAL_MAX_BYTES = 3 * 1024 * 1024;
// Same-realm instances share a queue. Cross-tab atomicity requires Web Locks.
const queues = new WeakMap<StorageLike, Promise<unknown>>();
interface LocalOptions { locks?: LockProvider | null; now?: () => number }
function storageError(error: unknown, reason: string): never {
  if (error instanceof SubmissionError) throw error;
  const name = typeof error === 'object' && error !== null && 'name' in error ? error.name : '';
  throw new SubmissionError(name === 'QuotaExceededError' ? 'STORAGE_FULL' : 'UNAVAILABLE', reason);
}
const compare = (a: {submitted_at:string;id:string}, b: {submitted_at:string;id:string}) =>
  a.submitted_at === b.submitted_at ? (a.id < b.id ? 1 : a.id > b.id ? -1 : 0) : a.submitted_at < b.submitted_at ? 1 : -1;

/** Inject storage explicitly; no browser/global storage access at import or construction. */
export class LocalRepository implements SubmissionRepository {
  constructor(private readonly storage: StorageLike, private readonly options: LocalOptions = {}) {}

  private getRaw(key: string): string | null {
    try { return this.storage.getItem(key); } catch (error) { return storageError(error,'READ_FAILED'); }
  }
  private backup(raw: string): never {
    let stamp = (this.options.now ?? Date.now)();
    let key = `${LOCAL_SUBMISSIONS_KEY}:corrupt-${stamp}`;
    // A repeated corrupt read must not overwrite a different backup at the same millisecond.
    while (this.getRaw(key) !== null && this.getRaw(key) !== raw) key = `${LOCAL_SUBMISSIONS_KEY}:corrupt-${++stamp}`;
    try { if (this.getRaw(key) !== raw) this.storage.setItem(key,raw); }
    catch (error) { storageError(error,'BACKUP_FAILED'); }
    throw new SubmissionError('VALIDATION_ERROR','CORRUPT_DATA',{backup_key:key});
  }
  private read(): SubmissionSnapshot[] {
    const raw = this.getRaw(LOCAL_SUBMISSIONS_KEY);
    if (raw === null) return [];
    try { return readEnvelope(JSON.parse(raw)).submissions; }
    catch { return this.backup(raw); }
  }
  private write(submissions: SubmissionSnapshot[]): void {
    if (submissions.length > LOCAL_MAX_ATTEMPTS) throw new SubmissionError('STORAGE_FULL','ATTEMPT_LIMIT');
    const serialized = exportSubmissions(submissions);
    // Our deterministic UX cap measures the WHOLE canonical envelope in UTF-8 bytes,
    // not JS string.length. Browser localStorage may count UTF-16 and fail earlier.
    if (utf8Bytes(serialized) > LOCAL_MAX_BYTES) throw new SubmissionError('STORAGE_FULL','BYTE_LIMIT');
    try { this.storage.setItem(LOCAL_SUBMISSIONS_KEY,serialized); }
    catch (error) { storageError(error,'WRITE_FAILED'); }
  }
  private async exclusive<T>(work: () => T): Promise<T> {
    const previous = queues.get(this.storage) ?? Promise.resolve();
    const operation = previous.catch(()=>{}).then(async()=>{
      try {
        const locks = this.options.locks === undefined
          ? (typeof navigator !== 'undefined' && navigator.locks ? navigator.locks : null)
          : this.options.locks;
        if (!locks) return work(); // Synchronous fresh read/check/write, no awaited gap.
        return await locks.request(LOCAL_SUBMISSIONS_KEY,async()=>work());
      }
      catch (error) { return storageError(error,'LOCK_FAILED'); }
    });
    queues.set(this.storage,operation);
    try { return await operation; }
    finally { if (queues.get(this.storage) === operation) queues.delete(this.storage); }
  }

  async save(raw: SubmissionSnapshot): Promise<SubmissionSnapshot> {
    const snapshot = validateSnapshot(raw);
    return this.exclusive(()=>{
      const latest = this.read(); // No cached envelope: reread after lock acquisition, immediately before write.
      const existing = latest.find(s=>s.id === snapshot.id);
      if (existing) {
        if (canonicalJson(existing) !== canonicalJson(snapshot)) throw new SubmissionError('PAYLOAD_CONFLICT','ID_REUSED');
        return existing;
      }
      if (latest.length >= LOCAL_MAX_ATTEMPTS) throw new SubmissionError('STORAGE_FULL','ATTEMPT_LIMIT');
      this.write([...latest,snapshot]);
      return snapshot;
    });
  }
  async get(id: string): Promise<SubmissionSnapshot | null> {
    validateSubmissionId(id);
    return this.read().find(s=>s.id === id.toLowerCase()) ?? null;
  }
  async list(options: SubmissionListOptions = {}): Promise<SubmissionPage> {
    const limit = options.limit ?? 20;
    requireValid(Number.isInteger(limit) && limit > 0 && limit <= LOCAL_MAX_ATTEMPTS,'PAGE_LIMIT');
    if (options.cursor) {
      validateSubmissionId(options.cursor.id);
      requireValid(typeof options.cursor.submitted_at === 'string' && Number.isFinite(Date.parse(options.cursor.submitted_at))
        && new Date(options.cursor.submitted_at).toISOString() === options.cursor.submitted_at,'CURSOR');
    }
    const cursor = options.cursor ? {...options.cursor,id:options.cursor.id.toLowerCase()} : null;
    const eligible = this.read().sort(compare).filter(s=>!cursor || compare(s,cursor) > 0);
    const page = eligible.slice(0,limit);
    const items: SubmissionSummary[] = page.map(snapshot=>{
      const {results,grading_version,schema_version,...summary} = snapshot;
      void results; void grading_version; void schema_version;
      return summary;
    });
    const last = page.at(-1);
    return {items, next_cursor:eligible.length > limit && last ? {submitted_at:last.submitted_at,id:last.id} : null};
  }
  /** Local-only, idempotent removal; intentionally absent from the cloud-neutral interface. */
  async remove(id: string): Promise<void> {
    validateSubmissionId(id);
    return this.exclusive(()=>{
      const latest = this.read(), remaining = latest.filter(s=>s.id !== id.toLowerCase());
      if (remaining.length !== latest.length) this.write(remaining);
    });
  }
  async exportSubmissions(): Promise<string> { return exportSubmissions(this.read()); }
}
