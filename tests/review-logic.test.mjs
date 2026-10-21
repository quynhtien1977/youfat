import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createLoader } from './helpers/load-typescript.mjs';

function hooks(seed = {}) {
  let cursor = 0;
  const cells = [], effects = [];
  return {
    effects,
    reset() { cursor = 0; effects.length = 0; },
    react: { ...React,
      useState(initial) {
        const index = cursor++;
        if (!(index in cells)) cells[index] = index in seed ? seed[index] : initial;
        return [cells[index], next => { cells[index] = typeof next === 'function' ? next(cells[index]) : next; }];
      },
      useRef(initial) { const index = cursor++; return cells[index] ??= { current: initial }; },
      useEffect(effect) { effects.push(effect); },
      useCallback(callback) { return callback; },
    },
  };
}
const settle = () => new Promise(resolve => setImmediate(resolve));
const snapshot = (answer, points) => ({
  id: 'attempt', test_key: 'cambridge:11:2', skill: 'reading', scope: 'section', mode: 'practice',
  submitted_at: '2026-10-06T01:00:00Z', time_spent_seconds: 60, correct_marks: points, total_marks: 2,
  results: [{question_key:'cambridge:11:2:reading:2:25',question_type:'MULTIPLE_CHOICE_MANY',
    answer_mode:'all_of',user_answer:answer,points_awarded:points,max_marks:2,is_fully_correct:points===2}],
});

for (const [answer, expected] of [[['B'], ['1 / 2','1','0','1']], [['A','B'], ['2 / 2','1','1','0']], [[], ['0 / 2','0','0','2']]]) {
  test(`history desktop and mobile count marks for ${JSON.stringify(answer)}`, () => {
    const data = snapshot(answer, answer.includes('B') ? 1 : 0);
    const h = hooks({1:[data],3:false});
    const load = createLoader({}, {
      react:h.react, 'next/link':{default:'a'},
      '@/components/submission-transfer-panel':{SubmissionTransferPanel:()=>null},
    });
    const {default:HistoryPage} = load('../../src/app/history/page.tsx');
    const html = renderToStaticMarkup(HistoryPage());
    const cells = [...html.match(/<tbody>([\s\S]*?)<\/tbody>/)[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)]
      .map(match => match[1].replace(/<[^>]+>/g,'').trim());
    assert.deepEqual(cells.slice(3,7), expected);
    const mobile = html.match(/class="mobileStats"([\s\S]*?)class="mobileActions"/)[1];
    const values = [...mobile.matchAll(/class="mobileStatVal"[^>]*>([\s\S]*?)<\/span>/g)].map(match=>match[1].trim());
    assert.deepEqual(values, [expected[0].replaceAll(' ',''), ...expected.slice(1)]);
  });
}

test('Listening history does not expose an inert review callback; Reading keeps its callback', () => {
  for (const skill of ['listening','reading']) {
    const data = {...snapshot([],0),skill};
    const h = hooks({0:data,1:false});
    let props;
    const load = createLoader({}, {
      react:h.react,'next/navigation':{useParams:()=>({attemptId:'attempt'})},'next/link':{default:'a'},
      '@/components/results-screen':{ResultsScreen:p=>{props=p;return null;}},
      '@/components/reading-review/reading-review-room':{ReadingReviewRoom:()=>null},
    });
    renderToStaticMarkup(load('../../src/app/history/[attemptId]/page.tsx').default());
    assert.equal(typeof props.onReview, skill==='reading' ? 'function' : 'undefined');
  }
});

function saveHarness({contextError = null, storageError = null, snapshotError = null} = {}) {
  const h = hooks();
  const saved = new Map(), ready = [], preparationErrors = [];
  let builds = 0;
  let currentContextError = contextError;
  const data = snapshot(['B'],1);
  const load = createLoader({}, {
    react:h.react,'next/link':{default:'a'},
    '@/lib/supabase':{supabase:{from:()=>({select:()=>({eq:()=>({single:async()=>({data:{id:'test'},error:currentContextError})})})})}},
    '@/lib/submission-snapshot':{buildSnapshot:()=>{builds++;if(snapshotError)throw snapshotError;return data;}},
    '@/lib/submission-client':{getLocalRepository:()=>({save:async value=>{
      assert.equal(ready.length>0,true,'RAM snapshot must be delivered before storage');
      if(storageError)throw storageError;
      saved.set(value.id,value);return value;
    }})},
    console:{error:()=>{}},
  });
  const component = load('../../src/components/submission-save-status.tsx').SubmissionSaveStatus;
  const input = {sections:[{test_id:'test'}],attempt_id:'attempt'};
  const props = {input,onSnapshotReady:value=>ready.push(value),onPreparationError:error=>preparationErrors.push(error)};
  return {h,component,props,saved,ready,preparationErrors,builds:()=>builds,
    setContextError:error=>{currentContextError=error;}};
}

test('RAM snapshot is available even when storage save fails', async () => {
  const x = saveHarness({storageError:new Error('quota')});
  x.component(x.props);x.h.effects[0]();await settle();
  assert.equal(x.ready.length,1);assert.equal(x.saved.size,0);assert.equal(x.preparationErrors.length,0);
});

test('context failure is reported and retry builds the same attempt instead of waiting forever', async () => {
  const x = saveHarness({contextError:new Error('offline')});
  x.component(x.props);x.h.effects[0]();await settle();
  assert.equal(x.ready.length,0);assert.equal(x.preparationErrors.length,1);
  assert.equal(x.preparationErrors[0].reason,'TEST_CONTEXT');
  x.h.reset();
  const failedHtml=renderToStaticMarkup(x.component(x.props));
  assert.match(failedHtml,/Không chuẩn bị được dữ liệu bài làm/);
  assert.doesNotMatch(failedHtml,/Hãy cho phép lưu trữ/);
  x.setContextError(null);x.h.reset();x.component(x.props);x.h.effects[0]();await settle();
  assert.equal(x.ready[0].id,x.props.input.attempt_id);assert.equal(x.saved.size,1);
});

test('snapshot validation failure reports preparation failure without saving invalid data', async () => {
  const error=Object.assign(new Error('invalid snapshot'),{code:'VALIDATION_ERROR',reason:'SNAPSHOT_CAP'});
  const x=saveHarness({snapshotError:error});
  x.component(x.props);x.h.effects[0]();await settle();
  assert.equal(x.preparationErrors[0],error);assert.equal(x.ready.length,0);assert.equal(x.saved.size,0);
});

test('Strict Mode repeated save effects deliver a RAM snapshot and one stored attempt', async () => {
  const x = saveHarness();
  x.component(x.props);
  const effect=x.h.effects[0];const cleanup=effect();cleanup();effect();await settle();
  assert.equal(x.ready.length,1);assert.equal(x.saved.size,1);assert.equal(x.builds(),1);
});

test('review HTML fails closed on SSR, including instructions and gap templates', () => {
  const load = createLoader();
  const {sanitizeReviewContentHtml,sanitizeReviewGapTemplate} = load('../../src/lib/sanitizer.ts');
  assert.equal(sanitizeReviewContentHtml('<img src=x onerror=alert(1)>'),'');
  assert.equal(sanitizeReviewGapTemplate('<span data-question-id="q1">evil</span>'),'');
});
