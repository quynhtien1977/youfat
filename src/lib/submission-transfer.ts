import type { SubmissionSnapshot } from '../types/database';
import type { SubmissionEnvelope, SubmissionImportReport } from '../types/submission-storage';
import { requireValid, SubmissionError } from './submission-errors';
import { canonicalJson, validateSnapshot } from './submission-snapshot';

export function readEnvelope(raw: unknown): SubmissionEnvelope {
  requireValid(raw !== null && typeof raw === 'object' && !Array.isArray(raw), 'ENVELOPE');
  const envelope = raw as Record<string, unknown>;
  requireValid(Object.keys(envelope).length === 2 && envelope.schema_version === 1 && Array.isArray(envelope.submissions), 'ENVELOPE');
  const submissions = envelope.submissions.map(validateSnapshot);
  requireValid(new Set(submissions.map(s=>s.id)).size === submissions.length, 'DUPLICATE_ATTEMPT');
  return {schema_version:1, submissions};
}

/** Pure JSON export: caller owns download UI and any storage access. */
export function exportSubmissions(submissions: SubmissionSnapshot[]): string {
  return canonicalJson(readEnvelope({schema_version:1,submissions}));
}

/** Pure preview. valid contains new admissible attempts, never duplicates/conflicts. Does not write. */
export function parseImport(json: string, existing: SubmissionSnapshot[] = []): SubmissionImportReport {
  const report: SubmissionImportReport = {valid:[], errors:[], duplicates:[], conflicts:[]};
  let envelope: unknown;
  try { envelope = JSON.parse(json); }
  catch { report.errors.push({index:-1,reason:'INVALID_JSON'}); return report; }
  if (envelope === null || typeof envelope !== 'object' || Array.isArray(envelope)
    || Object.keys(envelope).length !== 2 || (envelope as Record<string,unknown>).schema_version !== 1
    || !Array.isArray((envelope as Record<string,unknown>).submissions)) {
    report.errors.push({index:-1,reason:'ENVELOPE'}); return report;
  }
  const seen = new Map(readEnvelope({schema_version:1,submissions:existing}).submissions.map(s=>[s.id,canonicalJson(s)]));
  const incoming = (envelope as {submissions:unknown[]}).submissions;
  incoming.forEach((raw,index)=>{
    try {
      const snapshot = validateSnapshot(raw), serialized = canonicalJson(snapshot);
      const previous = seen.get(snapshot.id);
      if (previous !== undefined) {
        (previous === serialized ? report.duplicates : report.conflicts).push({index,id:snapshot.id,
          reason:previous === serialized ? 'DUPLICATE_ATTEMPT' : 'PAYLOAD_CONFLICT'});
      } else { seen.set(snapshot.id,serialized); report.valid.push(snapshot); }
    } catch (error) {
      report.errors.push({index,reason:error instanceof SubmissionError ? error.reason : 'INVALID_SNAPSHOT'});
    }
  });
  return report;
}
