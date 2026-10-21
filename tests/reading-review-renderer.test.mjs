import assert from 'node:assert/strict';
import test from 'node:test';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createLoader } from './helpers/load-typescript.mjs';

const load = createLoader();
const { ChoiceQuestionReview } = load('../../src/components/reading-review/choice-question-review.tsx');
function question(type, answer, target, points = 0, max = 1) {
  return {
    historical: { question_id: 'q1', question_key: 'cambridge:11:2:reading:2:25', section_id: 's2',
      question_order: 25, question_type: type, answer_mode: max > 1 ? 'all_of' : 'single',
      user_answer: answer, correct_answers: target, points_awarded: points, max_marks: max,
      is_fully_correct: points === max },
    status: points === max ? 'correct' : points > 0 ? 'partial' : answer.length ? 'incorrect' : 'skipped',
    availability: 'available', drift: [],
    content: { prompt: 'Synthetic review fixture', options: [], locate_info: null },
  };
}
function renderChoice(q) {
  return renderToStaticMarkup(React.createElement(ChoiceQuestionReview, { question: q }));
}

for (const [type, yes, no] of [['TRUE_FALSE', 'TRUE', 'FALSE'], ['YES_NO', 'YES', 'NO']]) {
  for (const answer of ['NOT GIVEN', '  not given  ']) {
    test(`${type}: ${JSON.stringify(answer)} remains one selected correct label`, () => {
      const q = question(type, answer, ['NOT GIVEN'], 1);
      const before = JSON.stringify(q);
      const html = renderChoice(q);
      assert.equal((html.match(/radio-selected-correct/g) ?? []).length, 1);
      assert.doesNotMatch(html, /radio-target-missed/);
      assert.match(html, /radioDot/);
      assert.equal(JSON.stringify(q), before);
    });
  }
  test(`${type}: wrong choice stays selected-wrong; NOT GIVEN target is missed`, () => {
    const html = renderChoice(question(type, no, ['NOT GIVEN']));
    assert.equal((html.match(/radio-selected-wrong/g) ?? []).length, 1);
    assert.equal((html.match(/radio-target-missed/g) ?? []).length, 1);
  });
  test(`${type}: blank stays unselected`, () => {
    const html = renderChoice(question(type, '', ['NOT GIVEN']));
    assert.doesNotMatch(html, /radio-selected-(correct|wrong)/);
    assert.doesNotMatch(html, /radioDot/);
    assert.equal((html.match(/radio-target-missed/g) ?? []).length, 1);
  });
  test(`${type}: one-word correct label still works`, () => {
    assert.equal((renderChoice(question(type, yes, [yes], 1)).match(/radio-selected-correct/g) ?? []).length, 1);
  });
}

test('MCQ-many array selections keep separate labels and historical answers unchanged', () => {
  const q = question('MULTIPLE_CHOICE_MANY', [' b ', 'c'], ['B', 'C'], 2, 2);
  q.content.options = ['A', 'B', 'C'].map(option => ({ option, text: option }));
  const before = JSON.stringify(q);
  const html = renderChoice(q);
  assert.equal((html.match(/cb-selected-correct/g) ?? []).length, 2);
  assert.doesNotMatch(html, /cb-target-missed/);
  assert.equal(JSON.stringify(q), before);
});
