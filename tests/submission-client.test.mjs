import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createLoader, plain } from './helpers/load-typescript.mjs';

test('client repository imports safely on server and refuses server initialization', () => {
  const { getLocalRepository } = createLoader()('../../src/lib/submission-client.ts');
  assert.throws(() => getLocalRepository(), e => e.code === 'UNAVAILABLE');
});
test('client initializes lazily once, shared across handlers, without import-time storage access', () => {
  let reads = 0;
  const browser = { get localStorage() { reads++; return {getItem:()=>null,setItem:()=>{}}; } };
  const { getLocalRepository } = createLoader({window:browser})('../../src/lib/submission-client.ts');
  assert.equal(reads,0);
  assert.equal(getLocalRepository(),getLocalRepository());
  assert.equal(reads,1);
});
test('denied storage getter yields standardized UNAVAILABLE and can retry later', () => {
  let blocked=true;
  const browser={get localStorage(){if(blocked) throw new Error('denied');return {getItem:()=>null,setItem:()=>{}};}};
  const {getLocalRepository}=createLoader({window:browser})('../../src/lib/submission-client.ts');
  assert.throws(()=>getLocalRepository(),e=>e.code==='UNAVAILABLE');
  blocked=false;assert.ok(getLocalRepository());
});
test('history labels derive section numbers from question keys, never arbitrary answer text', () => {
  const { describeSubmission }=createLoader()('../../src/lib/submission-presentation.ts');
  const snapshot={test_key:'cambridge:13:3',skill:'reading',scope:'section',results:[{question_key:'cambridge:13:3:reading:2:14',user_answer:'<script>bad</script>'}]};
  assert.deepEqual(plain(describeSubmission(snapshot)),{title:'Cambridge 13 · Test 3',skill:'Reading',scope:'Passage 2'});
  snapshot.skill='listening';snapshot.results=[{question_key:'cambridge:13:3:listening:4:31'}];
  assert.equal(describeSubmission(snapshot).scope,'Section 4');
});
test('full and custom scopes are truthful and sorted without mutating snapshot', () => {
  const {describeSubmission}=createLoader()('../../src/lib/submission-presentation.ts');
  const x={test_key:'cambridge:20:1',skill:'listening',scope:'custom',results:[{question_key:'cambridge:20:1:listening:3:21'},{question_key:'cambridge:20:1:listening:1:1'}]};
  const before=plain(x);assert.equal(describeSubmission(x).scope,'Tùy chọn · Section 1, 3');assert.deepEqual(x,before);
  x.scope='full_skill';assert.equal(describeSubmission(x).scope,'Full đề');
});
