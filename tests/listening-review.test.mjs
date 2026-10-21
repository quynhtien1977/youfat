import assert from 'node:assert/strict';
import test from 'node:test';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createLoader, plain } from './helpers/load-typescript.mjs';

const load = createLoader();
const { gradeExam } = load('../../src/lib/gradingEngine.ts');
const { QuestionNavBar } = load('../../src/components/question-nav-bar.tsx');
const section = { id:'s1',test_id:'t1',skill:'listening',section_number:1,title:'Review fixture',audio_url:null };
const many = { id:'q1',section_id:'s1',question_order:25,type:'MULTIPLE_CHOICE_MANY',answer_mode:'all_of',
  answer:['B','C'],options:['A','B','C','D'].map(option=>({option,text:option})) };
const gap = { ...many,question_order:1,type:'FILL_BLANK',answer_mode:'any_of',answer:['answer'],options:[] };

function grade(question, answer) {
  const answers = { [question.id]:answer };
  const summary = gradeExam([question],answers,'listening','section');
  return { questions:[question],answers,summary,results:Object.fromEntries(summary.results.map(r=>[r.questionId,r])) };
}
function nav(input, extra = {}) {
  return QuestionNavBar({ ...input,submitted:true,hideSubmit:true,activeId:null,onPillClick(){},onSubmit(){},...extra });
}
function buttons(tree) { return tree.props.children.flat(Infinity).filter(child=>child?.type==='button'); }
function statuses(tree) {
  return plain(buttons(tree).map(button=>{
    const classes=button.props.className.split(/\s+/);
    return classes.includes('correct-pill')?'correct':classes.includes('incorrect-pill')?'incorrect':
      classes.includes('answered')?'answered':'skipped';
  }));
}
function pageFixture(input, { reviewing = true, submitted = true } = {}) {
  const seed = [{...section,audio_url:'/not-requested.mp3'},input.questions,false,null,null,input.answers,
    submitted,input.summary,input.results,null,false,reviewing,null,true,10,100,1,1,1];
  let cursor=0;
  const updates=[],effects=[];
  const audio={ paused:false,pause(){this.paused=true;} };
  const roomLoad=createLoader({}, {
    react:{ ...React,
      useState(initial){ const at=cursor++;return [at<seed.length?seed[at]:initial,value=>updates.push({at,value})]; },
      useEffect(fn,deps){effects.push({fn,deps});},useCallback:fn=>fn,useRef:()=>({current:audio}),
    },
    'next/navigation':{useParams:()=>({sectionId:section.id})},
    '@/lib/supabase':{supabase:{}},
    '@/components/use-practice-timer':{usePracticeTimer:()=>({elapsedSeconds:14,stop(){}})},
    '@/components/question-panel':{QuestionPanel:()=>null},
  });
  const Page=roomLoad('../../src/app/listening/[sectionId]/page.tsx').default;
  return { tree:Page(),audio,updates,effects };
}
function find(tree, predicate) {
  if(Array.isArray(tree))return tree.map(child=>find(child,predicate)).find(Boolean);
  if(!tree || typeof tree!=='object')return null;
  return predicate(tree)?tree:find(tree.props?.children,predicate);
}

for(const [name,question,answer,expected,marks] of [
  ['one correct, one blank',many,['B'],['correct','skipped'],'1/2'],
  ['both correct',many,['B','C'],['correct','correct'],'2/2'],
  ['wrong then correct',many,['A','B'],['incorrect','correct'],'1/2'],
  ['correct then wrong',many,['B','A'],['correct','incorrect'],'1/2'],
  ['completely blank gap',gap,'',['skipped'],'0/1'],
  ['case-normalized correct gap',gap,'ANSWER',['correct'],'1/1'],
]) test(`Listening review: ${name} uses marks and graded slot order`,()=>{
  const input=grade(question,answer);
  assert.deepEqual(statuses(nav(input)),expected);
  const {tree}=pageFixture(input);
  const badge=find(tree,node=>node.props?.className==='yf-listening-review-score');
  assert.ok(badge);
  assert.equal(renderToStaticMarkup(badge).replace(/<[^>]*>/g,''),`${marks} câu đúng`);
});

test('all_of uses deduplicated graded choices rather than counting duplicate raw answers',()=>{
  const input=grade(many,[' b ','B']);
  assert.deepEqual(plain(input.summary.results[0].userAnswer),['B']);
  assert.deepEqual(statuses(nav(input)),['correct','skipped']);
});
for(const mode of ['single','any_of']) test(`${mode} remains one slot even if type is MCQ-many and has several targets`,()=>{
  const input=grade({...many,answer_mode:mode},'B');
  assert.equal(input.summary.totalMarks,1);
  assert.deepEqual(statuses(nav(input)),['correct']);
});
test('all_of remains multi-slot even if its display type is not MCQ-many',()=>{
  assert.deepEqual(statuses(nav(grade({...many,type:'FILL_BLANK'},['C']))),['correct','skipped']);
});
test('submitted pills use graded maxPoints, targets and answer, not mutable raw props',()=>{
  const input=grade(many,['B','A']);
  input.questions=[{...many,answer:['D']}];
  input.answers={q1:['C','D','B']};
  const before=plain(input);
  assert.deepEqual(statuses(nav(input)),['correct','incorrect']);
  assert.deepEqual(plain(input),before);
});
test('missing grading result never labels raw answers correct or incorrect',()=>{
  const input=grade(many,['B']);input.results={};
  assert.deepEqual(statuses(nav(input)),['skipped','skipped']);
});
test('practice navigation follows answer_mode and does not require grading results',()=>{
  const input=grade({...many,answer_mode:'any_of'},'B');input.results={};
  assert.deepEqual(statuses(nav(input,{submitted:false})),['answered']);
  const multi=grade(many,['A']);multi.results={};
  assert.deepEqual(statuses(nav(multi,{submitted:false})),['answered','skipped']);
});
test('hideSubmit affects the action only, keeping all question pills',()=>{
  const input=grade(many,['B']);
  assert.equal(buttons(nav(input)).length,2);
  const withSubmit=buttons(nav(input,{hideSubmit:false}));
  assert.equal(withSubmit.length,3);
  assert.equal(withSubmit[2].props.disabled,true);
});
test('back to results pauses audio, clears playing state and exits review',()=>{
  const fixture=pageFixture(grade(many,['B']));
  const button=find(fixture.tree,node=>node.props?.className==='yf-listening-review-back');
  assert.ok(button);button.props.onClick();
  assert.equal(fixture.audio.paused,true);
  assert.ok(fixture.updates.some(update=>update.at===11 && update.value===false));
  assert.ok(fixture.updates.some(update=>update.at===13 && update.value===false));
});
for(const [submitted,reviewing,paused] of [[true,false,true],[true,true,false],[false,false,false]]) {
  test(`audio result guard: submitted=${submitted}, reviewing=${reviewing}`,()=>{
    const fixture=pageFixture(grade(many,['B']),{submitted,reviewing});
    const guard=fixture.effects.find(({deps})=>deps?.length===2 && deps[0]===submitted && deps[1]===reviewing);
    assert.ok(guard);guard.fn();assert.equal(fixture.audio.paused,paused);
  });
}
