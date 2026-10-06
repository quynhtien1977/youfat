import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createLoader, plain } from './helpers/load-typescript.mjs';

const load = createLoader();
const { gradeExam } = load('../../src/lib/gradingEngine.ts');
const uid = number => `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
export function fixture(skill = 'reading', count = 1, scope = 'section') {
  const test = { id:uid(1), book:20, test_number:1 };
  const sections = Array.from({length:count}, (_, i) => ({ id:uid(10+i), test_id:test.id, skill, section_number:i+1 }));
  const questions = sections.map((section, i) => ({id:uid(100+i), section_id:section.id, question_order:i+1,
    type:'SUMMARY_COMPLETION', answer_mode:'any_of', answer:['harbour','harbor'], prompt:'not stored'}));
  const graded = gradeExam(questions, {}, skill, scope);
  return { test, sections, questions, graded, skill, scope, mode:'practice',
    attempt_id:uid(1000), started_at:'2026-10-06T01:00:00Z', submitted_at:'2026-10-06T01:01:00Z', time_spent_seconds:60 };
}
const build = input => load('../../src/lib/submission-snapshot.ts').buildSnapshot(input);
const rejects = (input, reason) => assert.throws(() => build(input), error => error.code === 'VALIDATION_ERROR' && error.reason === reason);

test('snapshot records question_type, keys, blank result and fixed grading version without mutation', () => {
  const input = fixture(); const before = plain(input); const snapshot = build(input);
  assert.equal(snapshot.results[0].question_type, 'SUMMARY_COMPLETION');
  assert.equal(snapshot.results[0].user_answer, '');
  assert.equal(snapshot.test_key, 'cambridge:20:1');
  assert.equal(snapshot.results[0].question_key, 'cambridge:20:1:reading:1:1');
  assert.equal(snapshot.grading_version, 'marks-v1');
  assert.equal(snapshot.schema_version, 1);
  assert.equal(snapshot.started_at, '2026-10-06T01:00:00.000Z');
  assert.deepEqual(plain(input), before);
  assert.ok(!JSON.stringify(snapshot).includes('not stored'));
  snapshot.results[0].correct_answers.push('mutated'); snapshot.section_ids.push(uid(999));
  assert.deepEqual(plain(input),before);
});
for (const [name, change, reason] of [
  ['mixed test', x=>{x.sections[0].test_id=uid(2)}, 'SECTION_CONTEXT'],
  ['mixed skill', x=>{x.sections[0].skill='listening'}, 'SECTION_CONTEXT'],
  ['duplicate sections', x=>{x.sections.push(x.sections[0])}, 'DUPLICATE_SECTION'],
  ['duplicate section numbers', x=>{x.sections[1].section_number=1}, 'DUPLICATE_SECTION'],
  ['section scope needs one', ()=>{}, 'SECTION_SCOPE'],
  ['full incomplete coverage', x=>{x.scope='full_skill';x.graded.scope=x.scope}, 'FULL_SCOPE'],
  ['question outside scope', x=>{x.questions[0].section_id=uid(999)}, 'QUESTION_SCOPE'],
  ['answer outside scope', x=>{x.answers={[uid(999)]:'x'}}, 'ANSWER_SCOPE'],
  ['result outside scope', x=>{x.graded.results[0].questionId=uid(999)}, 'RESULT_SCOPE'],
  ['missing blank result', x=>{x.graded.results.pop()}, 'RESULT_COVERAGE'],
  ['duplicate question', x=>{x.questions.push(x.questions[0])}, 'DUPLICATE_QUESTION'],
  ['duplicate result', x=>{x.graded.results.push(x.graded.results[0])}, 'RESULT_COVERAGE'],
  ['wrong total', x=>{x.graded.totalMarks++}, 'MARKS_MISMATCH'],
  ['negative correct', x=>{x.graded.correctMarks=-1}, 'MARKS_MISMATCH'],
  ['correct above total', x=>{x.graded.correctMarks=100}, 'MARKS_MISMATCH'],
  ['wrong per-question marks', x=>{x.graded.results[0].maxPoints=2}, 'RESULT_MARKS'],
  ['answer target detached from source', x=>{x.graded.results[0].correctAnswers=['other']}, 'RESULT_CONTEXT'],
  ['scope mismatch', x=>{x.graded.scope='custom'}, 'SCOPE_MISMATCH'],
  ['invalid mode', x=>{x.mode='writing'}, 'MODE'],
  ['invalid attempt UUID', x=>{x.attempt_id='retry-new-id'}, 'ID'],
  ['invalid timestamp', x=>{x.started_at='invalid'}, 'TIMESTAMP'],
  ['impossible calendar date', x=>{x.started_at='2026-02-30T01:00:00Z'}, 'TIMESTAMP'],
  ['end before start', x=>{x.submitted_at='2026-10-05T01:00:00Z'}, 'TIMESTAMP'],
  ['negative elapsed', x=>{x.time_spent_seconds=-1}, 'TIME_SPENT'],
  ['UTF8 cap', x=>{x.graded.results[0].userAnswer='界'.repeat(35000)}, 'PAYLOAD_TOO_LARGE'],
]) test(`snapshot rejects ${name}`, () => {
  const input = fixture('reading', name === 'duplicate section numbers' || name === 'section scope needs one' ? 2 : 1);
  change(input); rejects(input, reason);
});

test('custom snapshot orders section IDs by section_number', () => {
  const input = fixture('reading', 3, 'custom'); input.sections.reverse();
  assert.deepEqual(plain(build(input).section_ids), [uid(10),uid(11),uid(12)]);
});

for (const skill of ['reading','listening']) test(`complete ${skill} full snapshot requires exact section set and 40 marks`, () => {
  const input = fixture(skill, skill==='reading'?3:4, 'full_skill');
  input.questions = Array.from({length:40}, (_, i)=>({...input.questions[0],id:uid(100+i),question_order:i+1,section_id:input.sections[i % input.sections.length].id}));
  input.graded = gradeExam(input.questions, {}, skill, 'full_skill');
  assert.equal(build(input).total_marks,40);
});

test('C20T1 Listening 30-mark section is valid, not a full skill', () => {
  const input = fixture('listening');
  input.questions = Array.from({length:27},(_,i)=>({...input.questions[0],id:uid(100+i),question_order:i+1,
    ...(i<3?{type:'MULTIPLE_CHOICE_MANY',answer_mode:'all_of',answer:['A','B'],options:['A','B','C'].map(option=>({option,text:option}))}:{})}));
  input.graded = gradeExam(input.questions, {}, 'listening', 'section');
  assert.equal(build(input).total_marks,30); assert.equal(build(input).question_count,27);
  input.sections = fixture('listening',4,'full_skill').sections;
  input.questions.forEach((q,i)=>{q.section_id=input.sections[i%4].id});
  input.scope='full_skill'; input.graded=gradeExam(input.questions,{},'listening','full_skill');
  rejects(input,'FULL_MARKS');
  input.sections.splice(1,1); rejects(input,'FULL_SCOPE');
});

for (const skill of ['reading','listening']) for (const answer of [['B'],['A','B'],[]]) test(`snapshot/live statistics match ${skill} MCQ ${JSON.stringify(answer)} and blank gap`, () => {
  const input=fixture(skill);
  const many={...input.questions[0],type:'MULTIPLE_CHOICE_MANY',answer_mode:'all_of',answer:['B','C'],options:['A','B','C'].map(option=>({option,text:option}))};
  input.questions=[many,{...input.questions[0],id:uid(101),question_order:3}];
  input.graded=gradeExam(input.questions,{[many.id]:answer},skill,'section');
  const {summarizeResults,summarizeSnapshot}=load('../../src/lib/result-statistics.ts');
  assert.deepEqual(plain(summarizeSnapshot(build(input))),plain(summarizeResults(input.questions,input.graded,skill)));
});

test('snapshot cap is inclusive at exactly 102400 UTF8 bytes',()=>{
  const input=fixture(); const {canonicalJson,utf8Bytes}=load('../../src/lib/submission-snapshot.ts');
  const size=utf8Bytes(canonicalJson(build(input)));
  input.graded.results[0].userAnswer='x'.repeat(102400-size);
  assert.equal(utf8Bytes(canonicalJson(build(input))),102400);
  input.graded.results[0].userAnswer+='x'; rejects(input,'PAYLOAD_TOO_LARGE');
});
test('any_of synonym answer and incorrect sentence grouping are equivalent without live content',()=>{
  const input=fixture();input.questions.push({...input.questions[0],id:uid(101),question_order:2,type:'SENTENCE_COMPLETION'});
  input.graded=gradeExam(input.questions,{[uid(100)]:' HARBOR ',[uid(101)]:'wrong'},'reading','section');
  const {summarizeResults,summarizeSnapshot}=load('../../src/lib/result-statistics.ts');
  const stats=summarizeSnapshot(build(input));
  assert.deepEqual(plain(stats),plain(summarizeResults(input.questions,input.graded,'reading')));
  assert.deepEqual([stats.total,stats.correct,stats.wrong,stats.skipped],[2,1,1,0]);
});
