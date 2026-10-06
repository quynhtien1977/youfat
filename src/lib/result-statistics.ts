import type { ExamGradingSummary, Question, SkillType } from '@/types/database';
import { getQuestionTypeGroup, TYPE_LABELS } from './type-labels';

export interface MarkStatistics { total: number; correct: number; wrong: number; skipped: number }
export interface TypeStatistics extends MarkStatistics { key: string; label: string }

/** Source audit: all_of B/blank = 2/1/0/1; A/B (wrong/right) = 2/1/1/0. */
export function summarizeResults(questions: Question[], summary: ExamGradingSummary, skill: SkillType) {
  const byId = new Map(questions.map(question => [question.id, question]));
  const rows = new Map<string, TypeStatistics>();
  const totals: MarkStatistics = { total: 0, correct: 0, wrong: 0, skipped: 0 };
  for (const result of summary.results) {
    const question = byId.get(result.questionId);
    if (!question) throw new Error('Result question is outside scope');
    const selected = question.answer_mode === 'all_of'
      ? new Set((Array.isArray(result.userAnswer) ? result.userAnswer : [])
        .map(answer => answer.trim().toUpperCase()).filter(Boolean)).size
      : typeof result.userAnswer === 'string' && result.userAnswer.trim() ? 1 : 0;
    const marks: MarkStatistics = {
      total: result.maxPoints,
      correct: result.pointsAwarded,
      wrong: selected - result.pointsAwarded,
      skipped: result.maxPoints - selected,
    };
    const key = getQuestionTypeGroup(question.type, skill);
    const row = rows.get(key) ?? { key, label: TYPE_LABELS[key], total: 0, correct: 0, wrong: 0, skipped: 0 };
    for (const field of ['total', 'correct', 'wrong', 'skipped'] as const) {
      row[field] += marks[field]; totals[field] += marks[field];
    }
    rows.set(key, row);
  }
  return { ...totals, rows: [...rows.values()], scope: summary.scope };
}
