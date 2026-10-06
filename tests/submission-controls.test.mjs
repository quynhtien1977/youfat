import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import ts from 'typescript';

function loadSource(relative) {
  const source = readFileSync(new URL(relative, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  });
  const exports = {};
  const realRequire = createRequire(import.meta.url);
  runInNewContext(outputText, { exports, require: name => name.endsWith('.module.css') ? { default: {} } : realRequire(name) });
  return exports;
}

const { ResultBanner } = loadSource('../src/components/result-banner.tsx');

test('unanswered warning counts marks, including one unfilled MCQ slot', () => {
  const { countUnansweredMarks } = loadSource('../src/lib/submission-controls.ts');
  const questions = [
    { id: 'gap', answer_mode: 'any_of', answer: ['word', 'synonym'] },
    { id: 'many', answer_mode: 'all_of', answer: ['A', 'B'] },
  ];
  assert.equal(countUnansweredMarks(questions, {}), 3);
  assert.equal(countUnansweredMarks(questions, { gap: '  ', many: ['a', ' A '] }), 2);
  assert.equal(countUnansweredMarks(questions, { gap: 'wrong', many: ['A'] }), 1);
  assert.equal(countUnansweredMarks(questions, { gap: 'word', many: ['A', 'C'] }), 0);
});

test('elapsed timer formatting keeps hours and whole seconds', () => {
  const { formatElapsedTime } = loadSource('../src/lib/submission-controls.ts');
  assert.equal(formatElapsedTime(0), '00:00:00');
  assert.equal(formatElapsedTime(3661), '01:01:01');
});

test('malformed all_of content cannot crash the confirmation before grading', () => {
  const { countUnansweredMarks } = loadSource('../src/lib/submission-controls.ts');
  assert.equal(countUnansweredMarks([{ id: 'bad', answer_mode: 'all_of', answer: null }], {}), 1);
  assert.equal(countUnansweredMarks([{ id: 'bad', answer_mode: 'all_of', answer: [42] }], {}), 1);
});

test('confirmation uses approved missing-answer wording and no fake brand', () => {
  const { SubmitConfirmation } = loadSource('../src/components/submit-confirmation.tsx');
  const html = renderToStaticMarkup(createElement(SubmitConfirmation, {
    open: false, unansweredMarks: 12, onCancel() {}, onConfirm() {},
  }));
  assert.match(html, /Xác nhận nộp bài/);
  assert.match(html, /Bạn còn 12 câu hỏi chưa hoàn thành/);
  assert.match(html, /Hủy/);
  assert.match(html, /Nộp bài/);
  assert.doesNotMatch(html, /YouPass/);
});

test('complete-answer confirmation does not claim missing questions', () => {
  const { SubmitConfirmation } = loadSource('../src/components/submit-confirmation.tsx');
  const html = renderToStaticMarkup(createElement(SubmitConfirmation, {
    open: false, unansweredMarks: 0, onCancel() {}, onConfirm() {},
  }));
  assert.match(html, /Bạn có chắc chắn muốn nộp bài không/);
  assert.doesNotMatch(html, /Bạn còn/);
});

test('MCQ-many UI never sends more selections than answer slots', () => {
  const { CheckboxGroup } = loadSource('../src/components/question-inputs.tsx');
  let emitted;
  const tree = CheckboxGroup({
    question: { answer_mode: 'all_of', answer: ['A', 'B'], options: ['A', 'B', 'C'].map(option => ({ option, text: option })) },
    value: ['A', 'B'], onChange: value => { emitted = value; }, submitted: false,
  });
  tree.props.children[1][2].props.onClick();
  assert.equal(emitted.length, 2);
  assert.equal(new Set(emitted).size, 2);
});

test('result banner renders real marks without touching nullable band', () => {
  const html = renderToStaticMarkup(ResultBanner({
    skill: 'reading',
    summary: { correctMarks: 1, totalMarks: 2, bandScore: null, totalCorrect: 99, totalQuestions: 100 },
  }));
  assert.match(html, /1/);
  assert.match(html, /2/);
  assert.match(html, /50%/);
  assert.doesNotMatch(html, /Band|99|100 câu/);
});

test('result banner has finite percentage for an empty question scope', () => {
  const html = renderToStaticMarkup(ResultBanner({
    skill: 'listening', summary: { correctMarks: 0, totalMarks: 0, bandScore: null },
  }));
  assert.match(html, /0%/);
  assert.doesNotMatch(html, /NaN|Infinity|Band/);
});
