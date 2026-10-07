import assert from 'node:assert/strict';
import test from 'node:test';
import { createLoader, plain } from './helpers/load-typescript.mjs';

const load = createLoader();
const api = () => load('../../src/lib/reading-review.ts');
const uid = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
function fixture(mode = 'single', answer = 'A', points = 1) {
  const targets = mode === 'all_of' ? ['A','B'] : mode === 'any_of' ? ['harbour','harbor'] : ['A'];
  const max = mode === 'all_of' ? 2 : 1;
  const result = {question_id:uid(100),question_key:'cambridge:13:3:reading:1:1',section_id:uid(10),
    question_order:1,question_type:mode === 'all_of' ? 'MULTIPLE_CHOICE_MANY' : 'SUMMARY_COMPLETION',
    answer_mode:mode,user_answer:answer,correct_answers:targets,points_awarded:points,max_marks:max,is_fully_correct:points === max};
  const snapshot = {schema_version:1,id:uid(1000),test_id:uid(1),test_key:'cambridge:13:3',skill:'reading',mode:'practice',
    scope:'section',section_ids:[uid(10)],started_at:'2026-10-06T00:00:00.000Z',submitted_at:'2026-10-06T00:01:00.000Z',
    time_spent_seconds:60,question_count:1,correct_marks:points,total_marks:max,band_score:null,band_reason:'partial_scope',
    grading_version:'marks-v1',results:[result]};
  const live = {sections:[{id:uid(10),test_id:uid(1),skill:'reading',section_number:1,title:'Passage',passage_text:'Live passage'}],
    questions:[{id:uid(100),section_id:uid(10),question_order:1,type:result.question_type,answer_mode:mode,
      answer:[...targets],prompt:'Live prompt',instruction:null,question_set_title:null,image_url:null,
      explanation:'<p>Live explanation</p>',options:[{option:'A',text:'Alpha'},{option:'B',text:'Beta'},{option:'C',text:'Gamma'}]}]};
  return {snapshot,live};
}

test('no drift: historical marks/answers + live content; raw live answers excluded from renderer content', () => {
  const {snapshot,live} = fixture();
  const model = api().buildReviewModel(snapshot,live);
  assert.equal(model.warning,null);
  assert.equal(model.questions[0].availability,'available');
  assert.equal(model.questions[0].status,'correct');
  assert.equal(model.questions[0].content.prompt,'Live prompt');
  assert.equal(model.questions[0].content.explanation,'<p>Live explanation</p>');
  assert.equal(Object.hasOwn(model.questions[0].content,'answer'),false);
  assert.deepEqual(plain(model.snapshot),snapshot);
});
test('single changes and ordering differences warn, without regrading historical score', () => {
  const {snapshot,live} = fixture(); live.questions[0].answer = ['B'];
  const model = api().buildReviewModel(snapshot,live);
  assert.deepEqual(plain(model.questions[0].drift),['correct_answers']);
  assert.equal(model.warning,'Đề đã được cập nhật sau khi bạn làm bài, điểm giữ nguyên theo lúc nộp');
  assert.equal(model.snapshot.correct_marks,1);
  assert.equal(model.questions[0].status,'correct');
  snapshot.results[0].correct_answers = ['A','B']; live.questions[0].answer = ['B','A'];
  assert.equal(api().buildReviewModel(snapshot,live).driftCount,1);
});
test('single case and trim use grading choice normalization', () => {
  const {snapshot,live} = fixture(); live.questions[0].answer = [' a '];
  assert.equal(api().buildReviewModel(snapshot,live).driftCount,0);
});
test('all_of reorder and normalized set do not drift', () => {
  const {snapshot,live} = fixture('all_of',['A'],1); live.questions[0].answer = [' b ','a'];
  assert.equal(api().buildReviewModel(snapshot,live).driftCount,0);
});
test('all_of changed set drifts while old partial score stays 1/2', () => {
  const {snapshot,live} = fixture('all_of',['A'],1); live.questions[0].answer = ['B','C'];
  const model = api().buildReviewModel(snapshot,live);
  assert.equal(model.driftCount,1); assert.equal(model.questions[0].status,'partial');
  assert.deepEqual(plain(model.questions[0].historical.correct_answers),['A','B']);
  assert.equal(model.snapshot.correct_marks,1); assert.equal(model.snapshot.total_marks,2);
});
for (const targets of [['harbour'],['harbour','harbor','port']]) {
  test(`any_of accepted-answer set changed: ${targets.join('/')}`, () => {
    const {snapshot,live} = fixture('any_of','harbor',1); live.questions[0].answer = targets;
    assert.equal(api().buildReviewModel(snapshot,live).driftCount,1);
  });
}
test('any_of order, casing, punctuation and repeated equivalent synonym are not drift', () => {
  const {snapshot,live} = fixture('any_of','harbor',1); live.questions[0].answer = [' Harbor. ','HARBOUR','harbor'];
  assert.equal(api().buildReviewModel(snapshot,live).driftCount,0);
});
test('answer_mode change drifts even when target labels match', () => {
  const {snapshot,live} = fixture(); live.questions[0].answer_mode = 'any_of';
  assert.deepEqual(plain(api().buildReviewModel(snapshot,live).questions[0].drift),['answer_mode']);
});
for (const missing of ['question','section','moved_question']) {
  test(`${missing} keeps historical answers/marks; never fabricates content`, () => {
    const {snapshot,live} = fixture();
    if (missing === 'question') live.questions = [];
    if (missing === 'section') live.sections = [];
    if (missing === 'moved_question') live.questions[0].section_id = uid(11);
    const model = api().buildReviewModel(snapshot,live);
    assert.equal(model.missingCount,1); assert.equal(model.questions[0].content,null);
    assert.deepEqual(plain(model.questions[0].historical),snapshot.results[0]);
    assert.ok(model.warning);
  });
}
test('blank is skipped, not incorrect', () => {
  const {snapshot,live} = fixture('any_of','',0);
  assert.equal(api().buildReviewModel(snapshot,live).questions[0].status,'skipped');
});
test('one selected wrong answer is incorrect', () => {
  const {snapshot,live} = fixture('single','C',0);
  assert.equal(api().buildReviewModel(snapshot,live).questions[0].status,'incorrect');
});
test('all_of fully correct and completely blank have separate statuses', () => {
  const full = fixture('all_of',['A','B'],2), blank = fixture('all_of',[],0);
  assert.equal(api().buildReviewModel(full.snapshot,full.live).questions[0].status,'correct');
  assert.equal(api().buildReviewModel(blank.snapshot,blank.live).questions[0].status,'skipped');
});
test('prompt-only updates/new live questions do not change historical scope or trigger answer drift', () => {
  const {snapshot,live} = fixture(); live.questions[0].prompt = 'Updated';
  live.questions.push({...live.questions[0],id:uid(101),question_order:2});
  const model = api().buildReviewModel(snapshot,live);
  assert.equal(model.questions.length,1); assert.equal(model.driftCount,0);
  assert.equal(model.snapshot.total_marks,1);
});
test('malformed live HTML fields/options and duplicate sections fail with coded validation', () => {
  for (const field of ['explanation','instruction','image_url','question_set_title']) {
    const {snapshot,live} = fixture(); live.questions[0][field] = {bad:true};
    assert.throws(()=>api().buildReviewModel(snapshot,live),e=>e.code === 'VALIDATION_ERROR');
  }
  const {snapshot,live} = fixture(); live.sections.push({...live.sections[0]});
  assert.throws(()=>api().buildReviewModel(snapshot,live),e=>e.reason === 'DUPLICATE_LIVE_SECTION');
});
for (const answers of [['A'],['A','C'],[]]) {
  test(`legacy adapter uses snapshot only, partial/blank ${JSON.stringify(answers)}`, () => {
    const points = answers.length ? 1 : 0;
    const {snapshot,live} = fixture('all_of',answers,points); live.questions[0].answer = ['B','C'];
    const model = api().buildReviewModel(snapshot,live);
    const inline = api().toInlineReviewData(model,uid(10));
    assert.deepEqual(plain(inline.questions[0].answer),['A','B']);
    assert.deepEqual(plain(inline.answers[uid(100)]),answers);
    assert.equal(inline.results[uid(100)].pointsAwarded,points);
    assert.equal(inline.results[uid(100)].maxPoints,2);
    assert.equal(inline.results[uid(100)].explanation,'<p>Live explanation</p>');
  });
}
test('missing content stays explicit in adapter, no fake legacy question', () => {
  const {snapshot,live} = fixture(); live.sections = [];
  const inline = api().toInlineReviewData(api().buildReviewModel(snapshot,live),uid(10));
  assert.equal(inline.section,null); assert.equal(inline.questions.length,0); assert.equal(inline.missing.length,1);
});
test('no mutation or alias of snapshot, live objects/options/answers', () => {
  const {snapshot,live} = fixture('all_of',['A'],1); const before = JSON.stringify({snapshot,live});
  const model = api().buildReviewModel(snapshot,live);
  const inline = api().toInlineReviewData(model,uid(10));
  inline.questions[0].options[0].text = 'changed'; inline.answers[uid(100)].push('C');
  model.questions[0].content.prompt = 'other';
  assert.equal(JSON.stringify({snapshot,live}),before);
  assert.equal(model.questions[0].historical.user_answer.length,1);
});
test('reject non-Reading snapshot and duplicate live IDs/wrong section context', () => {
  const {snapshot,live} = fixture();
  live.questions.push({...live.questions[0]});
  assert.throws(()=>api().buildReviewModel(snapshot,live),e=>e.code === 'VALIDATION_ERROR' && e.reason === 'DUPLICATE_LIVE_QUESTION');
  live.questions.pop(); live.sections[0].test_id = uid(2);
  assert.throws(()=>api().buildReviewModel(snapshot,live),e=>e.reason === 'LIVE_SECTION_CONTEXT');
  const other = fixture(); other.snapshot.skill = 'listening';
  other.snapshot.results[0].question_key = 'cambridge:13:3:listening:1:1';
  assert.throws(()=>api().buildReviewModel(other.snapshot,other.live),e=>e.reason === 'REVIEW_READING_ONLY');
});

function fakeClient({sections=[],questions=[],options=[]}, failure = null, maxPage = 500) {
  const calls = [];
  return {calls, from(table) {
    let values = [], field;
    return {select() {return this;}, in(name,ids) {field=name;values=ids;return this;},
      order() {return this;}, async range(from,to) {
        calls.push({table,from,to});
        if (failure === table) return {data:null,error:{message:'Do not expose server response'}};
        const source = {sections,questions,options}[table].filter(row=>values.includes(row[field]));
        return {data:source.slice(from,Math.min(to+1,from+maxPage)),error:null};
      }};
  }};
}
test('GET loader reads beyond 1000 questions AND options, without embedded-option limit', async () => {
  const {snapshot,live} = fixture();
  const questions = Array.from({length:1201},(_,i)=>({...live.questions[0],id:uid(100+i)}));
  const options = questions.map((q,i)=>({id:uid(10000+i),question_id:questions[0].id,option:String(i),text:'Choice'}));
  const client = fakeClient({sections:live.sections,questions,options});
  const content = await api().fetchReadingLiveContent(snapshot,client);
  assert.equal(content.questions.length,1201);
  assert.equal(content.questions.reduce((n,q)=>n+q.options.length,0),1201);
  assert.ok(client.calls.some(c=>c.table === 'questions' && c.from === 1000));
  assert.ok(client.calls.some(c=>c.table === 'options' && c.from === 1000));
});
test('pagination respects a server cap smaller than requested range', async () => {
  const {snapshot,live} = fixture();
  const questions = Array.from({length:251},(_,i)=>({...live.questions[0],id:uid(100+i)}));
  const client = fakeClient({sections:live.sections,questions,options:[]},null,100);
  assert.equal((await api().fetchReadingLiveContent(snapshot,client)).questions.length,251);
});
test('empty GET content builds missing model, but failed GET is UNAVAILABLE (not missing)', async () => {
  const {snapshot} = fixture();
  assert.equal((await api().loadReadingReview(snapshot,fakeClient({}))).missingCount,1);
  await assert.rejects(api().loadReadingReview(snapshot,fakeClient({},'questions')),
    e=>e.code === 'UNAVAILABLE' && e.reason === 'REVIEW_CONTENT_FETCH');
});
test('adapter load result equals pure builder: same seam for submission/history', async () => {
  const {snapshot,live} = fixture();
  const options = live.questions[0].options.map((o,i)=>({...o,id:uid(900+i),question_id:uid(100)}));
  const client = fakeClient({...live,options});
  const fetched = await api().fetchReadingLiveContent(snapshot,client);
  assert.deepEqual(plain(await api().loadReadingReview(snapshot,client)),plain(api().buildReviewModel(snapshot,fetched)));
});
