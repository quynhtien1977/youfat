import type { ReviewModel, ReviewPill } from '../types/reading-review';

/** Display historical marks only. Never change scores or infer a lost click order. */
export function buildReviewPills(model: ReviewModel): ReviewPill[] {
  return model.questions.flatMap(question => {
    const result = question.historical;
    if (result.answer_mode !== 'all_of') {
      return [{ order: result.question_order, status: question.status, questionId: result.question_id }];
    }
    const selections = Array.isArray(result.user_answer) ? result.user_answer : [];
    const points = result.points_awarded;
    const targets = new Set(result.correct_answers);
    const matches = selections.filter(answer => targets.has(answer)).length;
    const ordered = model.snapshot.schema_version === 2;
    const consistent = matches === points;
    // v1 loses order, but zero/one selection and uniform outcomes are unambiguous.
    const legacyKnown = selections.length <= 1 || points === 0 || points === selections.length;
    return Array.from({ length: result.max_marks }, (_, slot): ReviewPill => {
      let status: ReviewPill['status'] = 'skipped';
      let reason: ReviewPill['reason'];
      if (slot < selections.length) {
        if (!consistent) {
          status = 'unknown';
          reason = 'inconsistent_points';
        } else if (!ordered && !legacyKnown) {
          status = 'unknown';
          reason = 'legacy_selection_order';
        } else {
          status = (ordered ? targets.has(selections[slot]) : points > 0) ? 'correct' : 'incorrect';
        }
      }
      return {
        order: result.question_order + slot, status,
        questionId: `${result.question_id}-${slot}`,
        ...(reason ? { reason } : {}),
      };
    });
  });
}
