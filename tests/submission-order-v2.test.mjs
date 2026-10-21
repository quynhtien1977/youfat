import assert from 'node:assert/strict';
import test from 'node:test';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createLoader, plain } from './helpers/load-typescript.mjs';

const load = createLoader();
const uid = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const snapshots = () => load('../../src/lib/submission-snapshot.ts');
const {gradeExam} = load('../../src/lib/gradingEngine.ts');
function context(answer = ['B','A'], skill = 'reading') {
  const test = {id:uid(1),book:11,test_number:2};
  const sections = [{id:uid(10),test_id:test.id,skill,section_number:2}];
  const questions = [{id:uid(100),section_id:uid(10),question_order:25,type:'MULTIPLE_CHOICE_MANY',
    answer_mode:'all_of',answer:['B','C'],options:['A','B','C','D','E'].map(option=>({option,text:option}))}];
  return {test,sections,questions,graded:gradeExam(questions,{[uid(100)]:answer},skill,'section'),skill,
    scope:'section',mode:'practice',attempt_id:uid(1000),started_at:'2026-10-09T00:00:00Z',
    submitted_at:'2026-10-09T00:01:00Z',time_spent_seconds:60};
}
function snapshot(answer, version = 2, skill = 'reading') {
  const result = plain(snapshots().buildSnapshot(context(answer,skill)));
  result.schema_version = version;
  return snapshots().validateSnapshot(result);
}
function model(s) {return load('../../src/lib/reading-review.ts').buildReviewModel(s,{sections:[],questions:[]});}
const pills = s => load('../../src/lib/reading-review-slots.ts').buildReviewPills(model(s));

for (const skill of ['reading','listening']) test(`new ${skill} snapshot v2 preserves remaining selection order without mutation`,()=>{
  const input = context([' b ','A','B'],skill), before = plain(input);
  const s = snapshots().buildSnapshot(input);
  assert.equal(s.schema_version,2);
  assert.deepEqual(plain(s.results[0].user_answer),['B','A']);
  assert.equal(s.grading_version,'marks-v1');
  assert.deepEqual(plain(input),before);
});
test('legacy v1 normalization and canonical payload are unchanged; unknown versions rejected',()=>{
  const s = plain(snapshot(['A','B'],1)); s.results[0].user_answer=[' b ','A','B'];
  assert.deepEqual(plain(snapshots().validateSnapshot(s).results[0].user_answer),['A','B']);
  s.schema_version=3;
  assert.throws(()=>snapshots().validateSnapshot(s),e=>e.reason==='VERSION');
});
// YouPass 7352/Q20864 measured 2026-10-09: response detail follows selection order.
for (const [answer, expected] of [
  [[],['skipped','skipped']], [['B'],['correct','skipped']], [['C'],['correct','skipped']],
  [['A'],['incorrect','skipped']], [['A','B'],['incorrect','correct']],
  [['B','A'],['correct','incorrect']], [['C','B'],['correct','correct']], [['D','A'],['incorrect','incorrect']],
]) test(`v2 review slots ${JSON.stringify(answer)} reflect source order without changing scores`,()=>{
  const s = snapshot(answer), before = plain(s);
  const slots = pills(s);
  assert.deepEqual(plain(slots.map(p=>p.status)),expected);
  assert.deepEqual(plain(slots.map(p=>p.order)),[25,26]);
  assert.deepEqual(plain(slots.map(p=>p.questionId)),[`${uid(100)}-0`,`${uid(100)}-1`]);
  assert.deepEqual(plain(s),before);
  const stats = load('../../src/lib/result-statistics.ts').summarizeSnapshot(s);
  assert.equal(slots.filter(p=>p.status==='correct').length,stats.correct);
  assert.equal(slots.filter(p=>p.status==='incorrect').length,stats.wrong);
  assert.equal(slots.filter(p=>p.status==='skipped').length,stats.skipped);
});
for (const [answer, expected] of [
  [[],['skipped','skipped']], [['C'],['correct','skipped']], [['A'],['incorrect','skipped']],
  [['B','C'],['correct','correct']], [['A','D'],['incorrect','incorrect']],
  [['B','A'],['unknown','unknown']],
]) test(`v1 review ${JSON.stringify(answer)} only assigns slots that can be established`,()=>{
  assert.deepEqual(plain(pills(snapshot(answer,1)).map(p=>p.status)),expected);
});
test('inconsistent imported historical points are preserved, not regraded to classify slots',()=>{
  for (const version of [1,2]) {
    const s=plain(snapshot(['B','A'],version));s.results[0].points_awarded=0;s.correct_marks=0;
    assert.deepEqual(plain(pills(s).map(p=>p.status)),['unknown','unknown']);
    assert.equal(s.correct_marks,0);
  }
});
test('mixed v1/v2 storage roundtrip, retry and order conflict preserve legacy attempts',async()=>{
  const {LocalRepository,LOCAL_SUBMISSIONS_KEY}=load('../../src/lib/local-submission-repository.ts');
  const {canonicalJson}=snapshots();
  const old=plain(snapshot(['A','B'],1));old.id=uid(999);
  const data=new Map([[LOCAL_SUBMISSIONS_KEY,canonicalJson({schema_version:1,submissions:[old]})]]);
  let writes=0;
  const repo=new LocalRepository({getItem:key=>data.get(key)??null,setItem:(key,value)=>{writes++;data.set(key,value);}}, {locks:null});
  const before=data.get(LOCAL_SUBMISSIONS_KEY);
  assert.deepEqual(plain(await repo.get(old.id)),old);assert.equal(data.get(LOCAL_SUBMISSIONS_KEY),before);assert.equal(writes,0);
  const current=snapshot(['B','A']);await repo.save(current);await repo.save(current);assert.equal(writes,1);
  const changed=plain(current);changed.results[0].user_answer.reverse();
  await assert.rejects(repo.save(changed),e=>e.code==='PAYLOAD_CONFLICT');assert.equal(writes,1);
  const envelope=JSON.parse(await repo.exportSubmissions());assert.equal(envelope.schema_version,1);
  assert.deepEqual(envelope.submissions.map(s=>s.schema_version),[1,2]);assert.deepEqual(envelope.submissions[0],old);
  const {parseImport}=load('../../src/lib/submission-transfer.ts');
  const report=parseImport(JSON.stringify(envelope),[old,current]);
  assert.equal(report.duplicates.length,2);assert.equal(report.errors.length,0);
  const conflict=parseImport(JSON.stringify({schema_version:1,submissions:[changed]}),[current]);
  assert.equal(conflict.conflicts.length,1);
});
test('ReviewRoom renderer uses source-order statuses and labels legacy unknown slots honestly',()=>{
  for (const [answer,version,expected] of [[['A','B'],2,['incorrect','correct']], [['B','A'],2,['correct','incorrect']], [['B','A'],1,['unknown','unknown']]]) {
    const s=snapshot(answer,version), m=model(s);let cursor=0;
    const seed=[m,false,null,s,null,new Set()];
    const roomLoad=createLoader({}, {'@/lib/supabase':{supabase:{}},react:{...React,
      useState(initial){return [cursor<seed.length?seed[cursor++]:initial,()=>{}];},useMemo:fn=>fn(),useCallback:fn=>fn,useEffect(){}}});
    const Room=roomLoad('../../src/components/reading-review/reading-review-room.tsx').ReadingReviewRoom;
    const html=renderToStaticMarkup(React.createElement(Room,{snapshot:s,onBack(){}}));
    const titles=[...html.matchAll(/title="(Câu (?:25|26)[^"]*)"/g)].map(m=>m[1]);
    assert.equal(titles.length,2);
    expected.forEach((status,i)=>assert.match(titles[i],status==='unknown'?/chưa xác định/i:new RegExp(status)));
    assert.doesNotMatch(html,/questionPill undefined/);
  }
});
