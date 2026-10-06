import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

// Compile the real, pure engine in memory: no app bootstrap, env, network or DB.
const source = readFileSync(new URL('../src/lib/gradingEngine.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
});
const { gradeSingleQuestion, gradeExam } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
);

function question(overrides = {}) {
  return {
    id: 'q1', section_id: 's1', question_order: 1,
    type: 'MULTIPLE_CHOICE_MANY', answer_mode: 'all_of',
    prompt: 'Choose TWO letters.', answer: ['A', 'B'], created_at: '',
    options: ['A', 'B', 'C', 'D', 'E'].map((option) => ({
      id: option, question_id: 'q1', option, text: option, created_at: '',
    })),
    ...overrides,
  };
}

function singles(count) {
  return Array.from({ length: count }, (_, index) => question({
    id: `q${index + 1}`, question_order: index + 1,
    type: 'TRUE_FALSE', answer_mode: 'single', answer: ['TRUE'],
  }));
}

for (const [input, points, fullyCorrect, normalized] of [
  [[], 0, false, []],
  [['A'], 1, false, ['A']],
  [['A', 'C'], 1, false, ['A', 'C']],
  [['B', 'A'], 2, true, ['B', 'A']],
  [['A', 'A', 'A'], 1, false, ['A']],
  [['a', ' A ', 'b'], 2, true, ['A', 'B']],
  [['C', 'D'], 0, false, ['C', 'D']],
]) {
  test(`all_of ${JSON.stringify(input)} gives ${points}/2 without duplicate marks`, () => {
    const result = gradeSingleQuestion(question(), input);
    assert.equal(result.pointsAwarded, points);
    assert.equal(result.maxPoints, 2);
    assert.equal(result.isCorrect, fullyCorrect);
    assert.deepEqual(result.userAnswer, normalized);
  });
}

for (const input of [['A', 'B', 'C'], ['A', 'B', 'C', 'D', 'E'], ['Z'], {}, ['A', 1], 'A']) {
  test(`rejects invalid selection ${JSON.stringify(input)}`, () => {
    assert.throws(() => gradeSingleQuestion(question(), input), { code: 'VALIDATION_ERROR' });
  });
}

for (const answer of [[], ['A', ' a '], [''], [42]]) {
  test(`rejects invalid all_of content ${JSON.stringify(answer)}`, () => {
    assert.throws(() => gradeSingleQuestion(question({ answer }), []), { code: 'CONTENT_ERROR' });
  });
}

test('all_of needs real options to validate submitted labels', () => {
  assert.throws(() => gradeSingleQuestion(question({ options: undefined }), []), {
    code: 'CONTENT_ERROR',
  });
});

test('target labels must exist in options', () => {
  assert.throws(() => gradeSingleQuestion(question({ answer: ['A', 'Z'] }), []), {
    code: 'CONTENT_ERROR',
  });
});

test('missing all_of answer is blank, not malformed', () => {
  assert.equal(gradeSingleQuestion(question(), undefined).pointsAwarded, 0);
});

test('all_of denominator follows answer_mode even when type differs', () => {
  const result = gradeExam([question({ type: 'MATCHING' })], { q1: ['A'] }, 'listening', 'section');
  assert.equal(result.correctMarks, 1);
  assert.equal(result.totalMarks, 2);
  assert.equal(result.questionCount, 1);
  assert.equal(result.scorePercentage, 50);
  assert.equal(result.totalCorrect, 1);
  assert.equal(result.totalQuestions, 2);
});

test('any_of synonyms count as one mark regardless of type or answer length', () => {
  const q = question({ answer_mode: 'any_of', answer: ['four sides', '4 sides'] });
  const result = gradeExam([q], { q1: '  FOUR   SIDES. ' }, 'reading', 'section');
  assert.equal(result.correctMarks, 1);
  assert.equal(result.totalMarks, 1);
});

test('single answer uses case-insensitive trimmed comparison', () => {
  assert.equal(gradeSingleQuestion(singles(1)[0], ' true ').pointsAwarded, 1);
});

test('section 13/13 never gets a scaled band', () => {
  const questions = singles(13);
  const result = gradeExam(questions, Object.fromEntries(questions.map((q) => [q.id, 'TRUE'])), 'reading', 'section');
  assert.equal(result.correctMarks, 13);
  assert.equal(result.totalMarks, 13);
  assert.equal(result.scorePercentage, 100);
  assert.equal(result.bandScore, null);
  assert.equal(result.bandReason, 'partial_scope');
  assert.equal(result.scope, 'section');
});

for (const skill of ['reading', 'listening']) {
  test(`${skill} full 40 with all blanks keeps denominator but no band in MVP`, () => {
    const result = gradeExam(singles(40), {}, skill, 'full_skill');
    assert.equal(result.correctMarks, 0);
    assert.equal(result.totalMarks, 40);
    assert.equal(result.scorePercentage, 0);
    assert.equal(result.bandScore, null);
    assert.equal(result.bandReason, 'not_displayed_mvp');
  });
}

test('C20T1 Listening fixture: 27 rows including three all_of rows = 30 marks', () => {
  const questions = [
    ...singles(24),
    ...[25, 26, 27].map((n) => question({ id: `q${n}`, question_order: n })),
  ];
  const result = gradeExam(questions, {}, 'listening', 'full_skill');
  assert.equal(result.questionCount, 27);
  assert.equal(result.totalMarks, 30);
  assert.equal(result.bandScore, null);
  assert.equal(result.bandReason, 'incomplete_content');
});

test('custom scope gets no band even at 40 marks', () => {
  assert.equal(gradeExam(singles(40), {}, 'reading', 'custom').bandReason, 'partial_scope');
});

test('unscoped legacy calls conservatively default to section', () => {
  const result = gradeExam(singles(13), {}, 'reading');
  assert.equal(result.scope, 'section');
  assert.equal(result.bandScore, null);
});

test('empty full scope returns zero marks without dividing by zero', () => {
  const result = gradeExam([], {}, 'reading', 'full_skill');
  assert.equal(result.totalMarks, 0);
  assert.equal(result.scorePercentage, 0);
  assert.equal(result.bandReason, 'incomplete_content');
});

test('duplicate question IDs cannot inflate scores', () => {
  assert.throws(() => gradeExam([question(), question()], {}, 'reading', 'section'), {
    code: 'CONTENT_ERROR',
  });
});

test('input answers cannot include questions outside the supplied scope', () => {
  assert.throws(() => gradeExam(singles(1), { unrelated: 'TRUE' }, 'reading', 'section'), {
    code: 'VALIDATION_ERROR',
  });
});

test('grading does not mutate source answers, options, or submitted selections', () => {
  const q = question();
  const input = ['a', ' A ', 'b'];
  const before = structuredClone({ q, input });
  gradeSingleQuestion(q, input);
  assert.deepEqual({ q, input }, before);
});
