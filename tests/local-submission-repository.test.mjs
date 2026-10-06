import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createLoader, plain } from './helpers/load-typescript.mjs';

const load=createLoader();
const repository=()=>load('../../src/lib/local-submission-repository.ts');
const transfer=()=>load('../../src/lib/submission-transfer.ts');
const uid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
function snapshot(n=1, answer='') {
  return {schema_version:1,id:uid(n),test_id:uid(200),test_key:'cambridge:20:1',skill:'reading',mode:'practice',scope:'section',
    section_ids:[uid(300)],started_at:'2026-10-06T01:00:00.000Z',submitted_at:'2026-10-06T01:01:00.000Z',time_spent_seconds:60,
    question_count:1,correct_marks:0,total_marks:1,band_score:null,band_reason:'partial_scope',grading_version:'marks-v1',
    results:[{question_id:uid(400),question_key:'cambridge:20:1:reading:1:1',section_id:uid(300),question_order:1,
      question_type:'SUMMARY_COMPLETION',answer_mode:'any_of',user_answer:answer,correct_answers:['harbour','harbor'],
      points_awarded:0,max_marks:1,is_fully_correct:false}]};
}
class MemoryStorage {
  data=new Map(); failRead=false; failWrite=null;
  getItem(key) { if(this.failRead) throw new Error('denied'); return this.data.get(key)??null; }
  setItem(key,value) { if(this.failWrite) throw {name:this.failWrite}; this.data.set(key,value); }
}
const hasError=(code,reason)=>error=>error.code===code && (!reason || error.reason===reason);

test('repository is safe at module import without window, navigator or storage', () => {
  // No browser globals are injected into the VM; importing must succeed in SSR.
  const exports=createLoader()( '../../src/lib/local-submission-repository.ts');
  assert.equal(typeof exports.LocalRepository,'function');
});
test('save/get/list/remove and export/import roundtrip without alias mutation',async()=>{
  const {LocalRepository}=repository(); const storage=new MemoryStorage(); const repo=new LocalRepository(storage,{locks:null});
  assert.equal(await repo.get(uid(1)),null); assert.deepEqual(plain((await repo.list()).items),[]);
  const original=snapshot(); const saved=await repo.save(original); saved.results[0].user_answer='mutated';
  assert.equal((await repo.get(original.id)).results[0].user_answer,'');
  const page=await repo.list(); assert.equal(page.items.length,1); assert.equal('results' in page.items[0],false);
  const json=await repo.exportSubmissions(); assert.equal(JSON.parse(json).schema_version,1);
  assert.equal(transfer().parseImport(json).valid.length,1);
  await repo.remove(original.id); await repo.remove(original.id); assert.equal(await repo.get(original.id),null);
});
test('retry same ID and normalized payload returns original without another write',async()=>{
  const {LocalRepository,LOCAL_SUBMISSIONS_KEY}=repository(); const storage=new MemoryStorage(); const repo=new LocalRepository(storage,{locks:null});
  await repo.save(snapshot()); const before=storage.getItem(LOCAL_SUBMISSIONS_KEY);
  const reordered=Object.fromEntries(Object.entries(snapshot()).reverse()); reordered.started_at='2026-10-06T01:00:00Z';
  storage.failWrite='QuotaExceededError'; assert.equal((await repo.save(reordered)).id,uid(1));
  assert.equal(storage.getItem(LOCAL_SUBMISSIONS_KEY),before);
});
test('same ID changed payload is PAYLOAD_CONFLICT, never overwrites',async()=>{
  const {LocalRepository}=repository(); const repo=new LocalRepository(new MemoryStorage(),{locks:null});
  await repo.save(snapshot()); await assert.rejects(repo.save(snapshot(1,'wrong')),hasError('PAYLOAD_CONFLICT'));
  assert.equal((await repo.get(uid(1))).results[0].user_answer,'');
});
for(const name of ['QuotaExceededError','SecurityError']) test(`storage ${name} uses standard error`,async()=>{
  const {LocalRepository}=repository(); const storage=new MemoryStorage(); storage.failWrite=name;
  await assert.rejects(new LocalRepository(storage,{locks:null}).save(snapshot()),hasError(name==='QuotaExceededError'?'STORAGE_FULL':'UNAVAILABLE'));
});
test('storage read failure is UNAVAILABLE',async()=>{
  const {LocalRepository}=repository(); const storage=new MemoryStorage(); storage.failRead=true;
  await assert.rejects(new LocalRepository(storage,{locks:null}).list(),hasError('UNAVAILABLE'));
});
for(const raw of ['{broken',JSON.stringify({schema_version:2,submissions:[]})]) test(`corrupt data is backed up verbatim and never overwritten: ${raw}`,async()=>{
  const {LocalRepository,LOCAL_SUBMISSIONS_KEY}=repository(); const storage=new MemoryStorage(); storage.data.set(LOCAL_SUBMISSIONS_KEY,raw);
  const repo=new LocalRepository(storage,{locks:null,now:()=>1234});
  await assert.rejects(repo.save(snapshot()),hasError('VALIDATION_ERROR','CORRUPT_DATA'));
  assert.equal(storage.getItem(LOCAL_SUBMISSIONS_KEY),raw);
  assert.equal(storage.getItem(LOCAL_SUBMISSIONS_KEY+':corrupt-1234'),raw);
});
test('backup quota error preserves corrupt main value and reports STORAGE_FULL',async()=>{
  const {LocalRepository,LOCAL_SUBMISSIONS_KEY}=repository(); const storage=new MemoryStorage(); storage.data.set(LOCAL_SUBMISSIONS_KEY,'broken'); storage.failWrite='QuotaExceededError';
  await assert.rejects(new LocalRepository(storage,{locks:null}).list(),hasError('STORAGE_FULL','BACKUP_FAILED'));
  assert.equal(storage.getItem(LOCAL_SUBMISSIONS_KEY),'broken');
});
test('cursor with equal timestamps has deterministic descending ID, no omissions',async()=>{
  const {LocalRepository}=repository(); const repo=new LocalRepository(new MemoryStorage(),{locks:null});
  for(const n of [1,3,2]) await repo.save(snapshot(n));
  const first=await repo.list({limit:2}); assert.deepEqual(plain(first.items.map(s=>s.id)),[uid(3),uid(2)]);
  await repo.remove(uid(2)); // Cursor is a tuple, not an index or a required existing row.
  const second=await repo.list({limit:2,cursor:first.next_cursor}); assert.deepEqual(plain(second.items.map(s=>s.id)),[uid(1)]);
  assert.equal(second.next_cursor,null);
});
test('history sorts submitted_at descending before id',async()=>{
  const {LocalRepository}=repository();const repo=new LocalRepository(new MemoryStorage(),{locks:null});
  const newer=snapshot(1);newer.submitted_at='2026-10-06T02:00:00.000Z';
  await repo.save(snapshot(3));await repo.save(newer);
  assert.deepEqual(plain((await repo.list()).items.map(s=>s.id)),[uid(1),uid(3)]);
});
test('100 attempts limit does not evict, retries at limit still work',async()=>{
  const {LocalRepository}=repository(); const repo=new LocalRepository(new MemoryStorage(),{locks:null});
  for(let n=1;n<=100;n++) await repo.save(snapshot(n));
  assert.equal((await repo.save(snapshot(1))).id,uid(1));
  await assert.rejects(repo.save(snapshot(101)),hasError('STORAGE_FULL','ATTEMPT_LIMIT'));
  assert.equal((await repo.list({limit:100})).items.length,100);
});
test('3 MiB UTF8 envelope cap is checked before writing and never evicts',async()=>{
  const {LocalRepository}=repository(); const repo=new LocalRepository(new MemoryStorage(),{locks:null});
  const large=n=>snapshot(n,'界'.repeat(32000)); let stored=0;
  for(let n=1;n<=40;n++) {try{await repo.save(large(n));stored++}catch(error){assert.equal(error.code,'STORAGE_FULL');assert.equal(error.reason,'BYTE_LIMIT');break}}
  assert.ok(stored>0 && stored<40); assert.equal((await repo.list({limit:100})).items.length,stored);
});
test('near-simultaneous fallback writes through two instances keep both attempts',async()=>{
  const {LocalRepository}=repository(); const storage=new MemoryStorage();
  const a=new LocalRepository(storage,{locks:null}), b=new LocalRepository(storage,{locks:null});
  await Promise.all([a.save(snapshot(1)),b.save(snapshot(2))]);
  assert.equal((await a.list()).items.length,2);
});
test('fallback reads external changes immediately before a write',async()=>{
  const {LocalRepository,LOCAL_SUBMISSIONS_KEY}=repository(); const storage=new MemoryStorage(); const repo=new LocalRepository(storage,{locks:null});
  await repo.save(snapshot(1)); await repo.get(uid(1));
  storage.data.set(LOCAL_SUBMISSIONS_KEY,JSON.stringify({schema_version:1,submissions:[snapshot(1),snapshot(2)]}));
  await repo.save(snapshot(3)); assert.equal((await repo.list()).items.length,3);
});
test('injected Web Locks serializes two independent module realms',async()=>{
  const storage=new MemoryStorage(); let tail=Promise.resolve(); const names=[];
  const locks={request(name,callback){names.push(name);const operation=tail.then(callback);tail=operation.then(()=>{},()=>{});return operation}};
  const A=createLoader()('../../src/lib/local-submission-repository.ts').LocalRepository;
  const B=createLoader()('../../src/lib/local-submission-repository.ts').LocalRepository;
  const a=new A(storage,{locks}), b=new B(storage,{locks});
  await Promise.all([a.save(snapshot(1)),b.save(snapshot(2)),a.remove(uid(1)),b.save(snapshot(3))]);
  assert.deepEqual(plain((await a.list()).items.map(s=>s.id)),[uid(3),uid(2)]);
  assert.ok(names.every(n=>n==='youfat:submissions:v1'));
});
test('uses navigator.locks lazily when no explicit lock provider is supplied',async()=>{
  let used=0; const locks={async request(name,callback){assert.equal(name,'youfat:submissions:v1');used++;return callback()}};
  const {LocalRepository}=createLoader({navigator:{locks}})('../../src/lib/local-submission-repository.ts');
  const repo=new LocalRepository(new MemoryStorage()); assert.equal(used,0);
  await repo.save(snapshot()); assert.equal(used,1);
});
test('lock denial is UNAVAILABLE and a failed write does not poison the queue',async()=>{
  const {LocalRepository}=repository(); const storage=new MemoryStorage(); let denied=true;
  const locks={request(name,callback){if(denied)throw new Error('lock denied');return callback()}};
  const repo=new LocalRepository(storage,{locks});
  await assert.rejects(repo.save(snapshot()),hasError('UNAVAILABLE','LOCK_FAILED'));
  denied=false; await repo.save(snapshot()); assert.equal((await repo.list()).items.length,1);
});
test('MCQ normalization makes reordered/deduplicated case-insensitive choices idempotent',async()=>{
  const {LocalRepository}=repository();const repo=new LocalRepository(new MemoryStorage(),{locks:null});
  const a=snapshot(); a.total_marks=2;a.correct_marks=1;
  Object.assign(a.results[0],{answer_mode:'all_of',question_type:'MULTIPLE_CHOICE_MANY',correct_answers:['B','C'],user_answer:['B'],points_awarded:1,max_marks:2});
  await repo.save(a);const b=plain(a);b.results[0].user_answer=['b',' B '];b.results[0].correct_answers=['c','b'];
  assert.deepEqual(plain(await repo.save(b)),plain(await repo.get(a.id)));
});
test('invalid snapshots and cursors fail with VALIDATION_ERROR',async()=>{
  const {LocalRepository}=repository();const repo=new LocalRepository(new MemoryStorage(),{locks:null});
  const invalid=snapshot(); delete invalid.results[0].question_type;
  await assert.rejects(repo.save(invalid),hasError('VALIDATION_ERROR'));
  await assert.rejects(repo.list({limit:0}),hasError('VALIDATION_ERROR'));
  await assert.rejects(repo.list({cursor:{id:'invalid',submitted_at:'bad'}}),hasError('VALIDATION_ERROR'));
});
test('import preview distinguishes valid / duplicate / conflict / invalid and writes nothing',()=>{
  const {parseImport,exportSubmissions}=transfer(); const a=snapshot(1), b=snapshot(2), bad=snapshot(3);delete bad.results[0].question_type;
  const raw=JSON.stringify({schema_version:1,submissions:[a,b,b,snapshot(2,'changed'),bad]});
  const before=JSON.stringify([a]);const report=parseImport(raw,[a]);
  assert.equal(report.valid.length,1);assert.equal(report.duplicates.length,2);assert.equal(report.conflicts.length,1);assert.equal(report.errors.length,1);
  assert.equal(JSON.stringify([a]),before);assert.equal(parseImport(exportSubmissions([a])).valid.length,1);
});
for(const raw of ['not JSON','[]','{"schema_version":2,"submissions":[]}']) test(`invalid import returns a report: ${raw}`,()=>{
  const report=transfer().parseImport(raw); assert.equal(report.valid.length,0);assert.equal(report.errors.length,1);
});
test('no token, HTML, media or arbitrary fields accepted at import/storage boundaries',()=>{
  const bad=snapshot(); bad.token='secret';
  const report=transfer().parseImport(JSON.stringify({schema_version:1,submissions:[bad]}));
  assert.equal(report.errors[0].reason,'FIELDS');
});
test('import reports over-cap snapshot and incoherent marks without writing',()=>{
  const huge=snapshot(1,'界'.repeat(35000)), marks=snapshot(2);marks.correct_marks=2;
  const report=transfer().parseImport(JSON.stringify({schema_version:1,submissions:[huge,marks]}));
  assert.deepEqual(plain(report.errors.map(error=>error.reason)),['PAYLOAD_TOO_LARGE','MARKS_MISMATCH']);
});
test('corrupt backup does not overwrite a prior backup from the same timestamp',async()=>{
  const {LocalRepository,LOCAL_SUBMISSIONS_KEY}=repository();const storage=new MemoryStorage();
  storage.data.set(LOCAL_SUBMISSIONS_KEY,'new corrupt');storage.data.set(LOCAL_SUBMISSIONS_KEY+':corrupt-1234','old corrupt');
  await assert.rejects(new LocalRepository(storage,{locks:null,now:()=>1234}).get(uid(1)),hasError('VALIDATION_ERROR','CORRUPT_DATA'));
  assert.equal(storage.getItem(LOCAL_SUBMISSIONS_KEY+':corrupt-1234'),'old corrupt');
  assert.equal(storage.getItem(LOCAL_SUBMISSIONS_KEY+':corrupt-1235'),'new corrupt');
});
