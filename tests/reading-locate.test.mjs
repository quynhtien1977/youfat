import assert from 'node:assert/strict';
import test from 'node:test';
import {createLoader, plain} from './helpers/load-typescript.mjs';
const load = createLoader();
const api = () => load('../../src/lib/reading-locate.ts');
const pos = (paragraph,sentence,index) => ({paragraph,sentence,index});
const locate = (start=pos(3,1,1),end=pos(3,1,2)) => ({paragraph_ranges:[{start,end}]});
function structure() {
  return {schema_version:1,coordinate_system:'youpass-dom-word-v1',reference_passage_text:'DB passage',
    paragraphs:[{paragraph:1,sentences:[]},
      {paragraph:2,sentences:[{sentence:1,tokens:[{index:1,text:'Title '}]}]},
      {paragraph:3,sentences:[{sentence:1,tokens:[{index:1,text:'A. '},{index:2,text:'🍀 text. '}]},
        {sentence:2,tokens:[{index:1,text:'More '}]}]},
      {paragraph:4,sentences:[{sentence:1,tokens:[{index:1,text:'B. '}]},
        {sentence:2,tokens:[{index:1,text:'Body '},{index:2,text:' '}]}]}]};
}
const resolve = (s,l,options={passageText:'DB passage'}) => api().resolveReadingLocate(s,l,options);
test('inclusive endpoints preserve source token IDs and UTF-16 offsets, not DB offsets',()=>{
  const r=resolve(structure(),locate());
  assert.equal(r.available,true);
  assert.deepEqual(plain(r.tokenIds),['word-3-1-1','word-3-1-2']);
  assert.deepEqual(plain(r.ranges[0].tokens.map(t=>[t.text,t.start,t.end])),[['A. ',0,3],['🍀 text. ',3,12]]);
});
test('multi-sentence/multi-paragraph ranges, empty blocks and nonzero source indices survive',()=>{
  const r=resolve(structure(),locate(pos(3,1,2),pos(4,2,1)));
  assert.deepEqual(plain(r.tokenIds),['word-3-1-2','word-3-2-1','word-4-1-1','word-4-2-1']);
});
test('overlapping ranges retain segments but never duplicate highlighted token IDs',()=>{
  const l={paragraph_ranges:[...locate().paragraph_ranges,...locate(pos(3,1,2),pos(3,2,1)).paragraph_ranges]};
  const r=resolve(structure(),l);
  assert.equal(r.ranges.length,2); assert.equal(r.tokenIds.length,3);
});
test('MCQ-many slots 0/1 select Q slots, independent of chosen answer labels',()=>{
  const l={'0':locate(),'1':locate(pos(4,1,1),pos(4,2,1))};
  const all=resolve(structure(),l);
  assert.deepEqual(plain(all.ranges.map(r=>r.slot)),[0,1]);
  const second=resolve(structure(),l,{passageText:'DB passage',slot:1});
  assert.deepEqual(plain(second.tokenIds),['word-4-1-1','word-4-2-1']);
});
for (const [name,s,l,options,reason] of [
  ['missing structure',null,locate(),undefined,'missing_structure'],
  ['invalid structure',{},locate(),undefined,'invalid_structure'],
  ['missing locate',structure(),null,undefined,'missing_locate'],
  ['invalid locate',structure(),{},undefined,'invalid_locate'],
  ['text drift',structure(),locate(),{passageText:'changed'},'passage_text_changed'],
  ['missing passage',structure(),locate(),{passageText:null},'passage_text_changed'],
  ['nonexistent paragraph',structure(),locate(pos(7,1,1),pos(7,1,2)),undefined,'out_of_range'],
  ['nonexistent sentence',structure(),locate(pos(3,8,1),pos(3,8,2)),undefined,'out_of_range'],
  ['nonexistent token',structure(),locate(pos(3,1,3),pos(3,1,3)),undefined,'out_of_range'],
  ['absent slot',structure(),{'0':locate()},{passageText:'DB passage',slot:1},'invalid_slot'],
  ['empty ranges',structure(),{paragraph_ranges:[]},undefined,'empty_ranges'],
]) test(`${name} fails closed without throwing or guessed fallback`,()=>{
  assert.deepEqual(plain(resolve(s,l,options)),{available:false,reason});
});
test('strict range validator rejects zero, fractional, string, reversed and prototype-like keys',()=>{
  for(const l of [locate(pos(0,1,1)),locate(pos(3,1,1.5)),locate(pos('3',1,1)),
    locate(pos(4,1,1),pos(3,1,1)),{'A':locate()},{'1':locate()},
    {paragraph_ranges:'text'},JSON.parse('{"__proto__":{"paragraph_ranges":[]}}')]) {
    assert.equal(api().parseReadingLocateInfo(l),null);
  }
});
test('structure validator preserves sentence gaps, but rejects duplicate/missing/out-of-order tokens',()=>{
  const s=structure(); s.paragraphs[2].sentences[1].sentence=5;
  assert.equal(api().parsePassageStructure(s).paragraphs[2].sentences[1].sentence,5);
  for(const change of [s=>s.paragraphs[2].paragraph=9,
    s=>s.paragraphs[2].sentences[1].sentence=1,
    s=>s.paragraphs[2].sentences[0].tokens[1].index=1,
    s=>s.paragraphs[2].sentences[0].tokens[1].index=3,
    s=>s.paragraphs[2].sentences[0].tokens[1].text=null,
    s=>delete s.reference_passage_text]) {
    const bad=structure();change(bad);assert.equal(api().parsePassageStructure(bad),null);
  }
});
test('parser/resolver do not mutate or expose input objects; malformed optional content is bounded',()=>{
  const s=structure(),l=locate(),before=JSON.stringify([s,l]);
  const parsed=api().parsePassageStructure(s); parsed.paragraphs[2].sentences[0].tokens[0].text='modified';
  const r=resolve(s,l); r.ranges[0].tokens[0].text='modified';
  assert.equal(JSON.stringify([s,l]),before);
  const huge=structure();huge.paragraphs[2].sentences[0].tokens[0].text='x'.repeat(4097);
  assert.equal(api().parsePassageStructure(huge),null);
});

test('aggregate token text is bounded, not just individual tokens',()=>{
  const s=structure();
  s.paragraphs[2].sentences[0].tokens=Array.from({length:4000},(_,i)=>({index:i+1,text:'x'.repeat(200)}));
  assert.equal(api().parsePassageStructure(s)===null,true);
});
test('many overlapping ranges cannot amplify resolver output without bound',()=>{
  const s=structure();
  s.paragraphs[2].sentences[0].tokens=Array.from({length:4000},(_,i)=>({index:i+1,text:'x '}));
  const l={paragraph_ranges:Array.from({length:20},()=>({start:pos(3,1,1),end:pos(3,1,4000)}))};
  const result=resolve(s,l);
  assert.equal(result.available,false);
  assert.equal(result.reason,'invalid_locate');
});
