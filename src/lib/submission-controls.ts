import type { Question } from '@/types/database';

/** Count unanswered slots, not correctness; an all_of row can occupy two slots. */
export function countUnansweredMarks(
  questions: Question[], answers: Record<string, string | string[]>,
): number {
  return questions.reduce((remaining, question) => {
    const value = answers[question.id];
    if (question.answer_mode === 'all_of') {
      // Do not let malformed content crash the dialog; the engine reports CONTENT_ERROR.
      const targets = Array.isArray(question.answer) ? question.answer : [];
      const slots = Math.max(1, new Set(targets.filter(answer => typeof answer === 'string')
        .map(answer => answer.trim().toUpperCase()).filter(Boolean)).size);
      const selections = Array.isArray(value)
        ? new Set(value.filter(answer => typeof answer === 'string')
          .map(answer => answer.trim().toUpperCase()).filter(Boolean)).size : 0;
      return remaining + Math.max(0, slots - selections);
    }
    return remaining + (typeof value === 'string' && value.trim() ? 0 : 1);
  }, 0);
}

export function formatElapsedTime(seconds: number): string {
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map(part => String(part).padStart(2, '0')).join(':');
}
