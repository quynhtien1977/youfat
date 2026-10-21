import type { AnswerMode, ExamGradingSummary, Question, SkillType, SubmissionScope, SubmissionSnapshot } from '@/types/database';
import { getQuestionTypeGroup, TYPE_LABELS } from './type-labels';

export interface MarkStatistics { total: number; correct: number; wrong: number; skipped: number }
export interface TypeStatistics extends MarkStatistics { key: string; label: string }

/** Source audit: all_of B/blank = 2/1/0/1; A/B (wrong/right) = 2/1/1/0. */
interface StatisticsItem { type: string; answerMode: AnswerMode; userAnswer: string | string[]; points: number; max: number }
function summarize(items: StatisticsItem[], skill: SkillType, scope: SubmissionScope) {
  const rows = new Map<string, TypeStatistics>();
  const totals: MarkStatistics = { total: 0, correct: 0, wrong: 0, skipped: 0 };
  for (const result of items) {
    const selected = result.answerMode === 'all_of'
      ? new Set((Array.isArray(result.userAnswer) ? result.userAnswer : [])
        .map(answer => answer.trim().toUpperCase()).filter(Boolean)).size
      : typeof result.userAnswer === 'string' && result.userAnswer.trim() ? 1 : 0;
    const marks: MarkStatistics = {
      total: result.max,
      correct: result.points,
      wrong: selected - result.points,
      skipped: result.max - selected,
    };
    const key = getQuestionTypeGroup(result.type, skill);
    const row = rows.get(key) ?? { key, label: TYPE_LABELS[key], total: 0, correct: 0, wrong: 0, skipped: 0 };
    for (const field of ['total', 'correct', 'wrong', 'skipped'] as const) {
      row[field] += marks[field]; totals[field] += marks[field];
    }
    rows.set(key, row);
  }
  return { ...totals, rows: [...rows.values()], scope };
}

export function summarizeResults(questions: Question[], summary: ExamGradingSummary, skill: SkillType) {
  const byId = new Map(questions.map(question => [question.id, question]));
  return summarize(summary.results.map(result => {
    const question = byId.get(result.questionId);
    if (!question) throw new Error('Result question is outside scope');
    return {type:question.type, answerMode:question.answer_mode, userAnswer:result.userAnswer, points:result.pointsAwarded, max:result.maxPoints};
  }), skill, summary.scope);
}

/** Expects a snapshot validated by buildSnapshot or the repository/import boundary. No live content needed. */
export function summarizeSnapshot(snapshot: SubmissionSnapshot) {
  return summarize(snapshot.results.map(result => ({type:result.question_type, answerMode:result.answer_mode,
    userAnswer:result.user_answer, points:result.points_awarded, max:result.max_marks})), snapshot.skill, snapshot.scope);
}
