import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
function load(relative) {
  const path = new URL(relative, import.meta.url);
  const source = readFileSync(path, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  });
  const exports = {};
  runInNewContext(outputText, { exports, require: name => name.endsWith('.module.css') ? { default: {} }
    : name.includes('type-labels') ? load('../src/lib/type-labels.ts')
    : name.includes('result-statistics') ? load('../src/lib/result-statistics.ts') : require(name) });
  return exports;
}
const { gradeExam } = load('../src/lib/gradingEngine.ts');
const many = { id: 'many', question_order: 1, type: 'MULTIPLE_CHOICE_MANY', answer_mode: 'all_of', answer: ['B', 'C'], options: ['A','B','C','D'].map(option => ({ option, text: option })) };
const gap = { id: 'gap', question_order: 3, type: 'SUMMARY_COMPLETION', answer_mode: 'any_of', answer: ['harbour', 'harbor'] };

for (const [answer, expected] of [[['B'], [2,1,0,1]], [['A','B'], [2,1,1,0]], [[], [2,0,0,2]], [['b',' B '], [2,1,0,1]]]) {
  test(`MCQ-many ${JSON.stringify(answer)} counts marks correctly`, () => {
    const { summarizeResults } = load('../src/lib/result-statistics.ts');
    const stats = summarizeResults([many], gradeExam([many], { many: answer }, 'reading', 'section'), 'reading');
    assert.deepEqual([stats.total, stats.correct, stats.wrong, stats.skipped], expected);
    assert.equal(stats.scope, 'section');
  });
}

test('Gap Filling synonyms and sentence variants merge using shared label mapping', () => {
  const { summarizeResults } = load('../src/lib/result-statistics.ts');
  const other = { ...gap, id: 'sentence', type: 'SENTENCE_COMPLETION', question_order: 4 };
  const stats = summarizeResults([gap, other], gradeExam([gap, other], { gap: ' HARBOR ', sentence: 'wrong' }, 'reading', 'section'), 'reading');
  assert.equal(stats.rows.length, 1);
  assert.equal(stats.rows[0].label, 'Gap Filling');
  assert.deepEqual([stats.total, stats.correct, stats.wrong, stats.skipped], [2,1,1,0]);
});

test('blank any_of answer counts as skipped, not wrong', () => {
  const { summarizeResults } = load('../src/lib/result-statistics.ts');
  const stats = summarizeResults([gap], gradeExam([gap], { gap: '  ' }, 'listening', 'section'), 'listening');
  assert.deepEqual([stats.total, stats.correct, stats.wrong, stats.skipped], [1,0,0,1]);
});

test('Listening matching uses standalone Matching group; totals equal row sums', () => {
  const { summarizeResults } = load('../src/lib/result-statistics.ts');
  const matching = { ...gap, id: 'matching', type: 'MATCHING_FEATURES', answer_mode: 'single', answer: ['A'] };
  const questions = [many, gap, matching];
  const summary = gradeExam(questions, { many: ['B'], matching: 'A' }, 'listening', 'section');
  const before = JSON.stringify(summary);
  const stats = summarizeResults(questions, summary, 'listening');
  assert.equal(stats.rows[2].label, 'Matching');
  assert.equal(stats.total, stats.correct + stats.wrong + stats.skipped);
  assert.equal(stats.total, stats.rows.reduce((sum, row) => sum + row.total, 0));
  assert.equal(JSON.stringify(summary), before);
});

test('results screen has active inline-review action, real marks/time, no band/PRO/mascot', () => {
  const { ResultsScreen } = load('../src/components/results-screen.tsx');
  const summary = gradeExam([many], { many: ['B'] }, 'reading', 'section');
  let reviewed = false;
  const tree = ResultsScreen({ questions: [many], summary, skill: 'reading', elapsedSeconds: 61, onReview: () => { reviewed = true; } });
  const html = renderToStaticMarkup(tree);
  assert.match(html, /1\/2/);
  assert.match(html, /01:01/);
  assert.match(html, /YouFat/);
  assert.match(html, /Xem giải thích/);
  assert.doesNotMatch(html, /disabled|YouPass|Band|PRO|<img/);
  tree.props.children.props.children[0].props.children[3].props.children.props.onClick();
  assert.equal(reviewed, true);
});

test('shared filter mapping retains Reading 10 and Listening 7 categories', () => {
  const { getTypeFilterOptions } = load('../src/lib/type-labels.ts');
  assert.equal(getTypeFilterOptions('reading').length, 10);
  assert.equal(getTypeFilterOptions('listening').length, 7);
});
