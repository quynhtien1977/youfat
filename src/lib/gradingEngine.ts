import type {
  BandReason, ExamGradingSummary, Question, QuestionGradingResult, SkillType, SubmissionScope,
} from '../types/database';

// Keep existing import paths working; contracts live with other app types.
export type { ExamGradingSummary, QuestionGradingResult } from '../types/database';

export class GradingValidationError extends Error {
  constructor(
    public readonly code: 'VALIDATION_ERROR' | 'CONTENT_ERROR',
    message: string,
    public readonly questionId?: string,
  ) {
    super(message);
    this.name = 'GradingValidationError';
  }
}

const normalizeChoice = (value: string): string => value.trim().toUpperCase();

/**
 * Chuẩn hóa chuỗi để so sánh (xóa khoảng trắng thừa, chuyển về chữ thường, bỏ dấu câu thừa)
 */
export function normalizeAnswerString(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_~()]/g, '') // bỏ dấu câu cơ bản
    .replace(/\s+/g, ' '); // gộp khoảng trắng
}

/**
 * Chấm điểm 1 câu hỏi cụ thể theo answer_mode: single, any_of, all_of
 */
export function gradeSingleQuestion(
  q: Question,
  rawUserAnswer: string | string[] | undefined
): QuestionGradingResult {
  const correctList = q.answer || [];
  let isCorrect = false;
  let pointsAwarded = 0;
  let maxPoints = 1;
  let userAnswer: string | string[] = rawUserAnswer ?? '';

  if (q.answer_mode === 'all_of') {
    if (!Array.isArray(correctList) || correctList.length === 0 ||
        correctList.some((value) => typeof value !== 'string' || !value.trim())) {
      throw new GradingValidationError('CONTENT_ERROR', 'all_of needs nonempty correct answers', q.id);
    }
    const targetSet = new Set(correctList.map(normalizeChoice));
    if (targetSet.size !== correctList.length) {
      throw new GradingValidationError('CONTENT_ERROR', 'Duplicate all_of targets', q.id);
    }
    if (!q.options?.length || q.options.some((option) =>
      typeof option.option !== 'string' || !option.option.trim())) {
      throw new GradingValidationError('CONTENT_ERROR', 'all_of needs option labels', q.id);
    }
    const allowed = new Set(q.options.map((option) => normalizeChoice(option.option)));
    if ([...targetSet].some((label) => !allowed.has(label))) {
      throw new GradingValidationError('CONTENT_ERROR', 'Correct answer missing from options', q.id);
    }
    // Missing answers are blanks; a nonempty scalar/object is not a selection array.
    const selections = rawUserAnswer === undefined || rawUserAnswer === '' ? [] : rawUserAnswer;
    if (!Array.isArray(selections) || selections.some((value) =>
      typeof value !== 'string' || !value.trim())) {
      throw new GradingValidationError('VALIDATION_ERROR', 'Expected a selection array', q.id);
    }
    const userSet = new Set(selections.map(normalizeChoice));
    maxPoints = targetSet.size;
    if (userSet.size > maxPoints || [...userSet].some((label) => !allowed.has(label))) {
      throw new GradingValidationError('VALIDATION_ERROR', 'Invalid or too many selections', q.id);
    }
    // YouPass Reading audit: each distinct correct choice earns one mark.
    pointsAwarded = [...userSet].filter((label) => targetSet.has(label)).length;
    isCorrect = pointsAwarded === maxPoints;
    userAnswer = [...userSet];
  } else if (q.answer_mode === 'any_of') {
    // Chấp nhận trúng 1 trong các cách viết / từ đồng nghĩa
    const userStr = typeof rawUserAnswer === 'string' ? normalizeAnswerString(rawUserAnswer) : '';
    if (userStr) {
      isCorrect = correctList.some((target) => normalizeAnswerString(target) === userStr);
    }
    pointsAwarded = isCorrect ? 1 : 0;
  } else {
    // 'single': Trắc nghiệm 1 đáp án, True/False/NG, Matching
    const userStr = typeof rawUserAnswer === 'string' ? rawUserAnswer.trim().toUpperCase() : '';
    const firstTarget = (correctList[0] || '').trim().toUpperCase();
    isCorrect = Boolean(userStr && userStr === firstTarget);
    pointsAwarded = isCorrect ? 1 : 0;
  }

  return {
    questionId: q.id,
    questionOrder: q.question_order,
    userAnswer,
    correctAnswers: correctList,
    isCorrect,
    pointsAwarded,
    maxPoints,
    explanation: q.explanation,
  };
}

/**
 * Quy đổi số câu đúng sang IELTS Band Score (Reading / Listening)
 */
export function calculateBandScore(correctCount: number, skill: 'reading' | 'listening'): number {
  if (skill === 'reading') {
    if (correctCount >= 39) return 9.0;
    if (correctCount >= 37) return 8.5;
    if (correctCount >= 35) return 8.0;
    if (correctCount >= 33) return 7.5;
    if (correctCount >= 30) return 7.0;
    if (correctCount >= 27) return 6.5;
    if (correctCount >= 23) return 6.0;
    if (correctCount >= 19) return 5.5;
    if (correctCount >= 15) return 5.0;
    if (correctCount >= 13) return 4.5;
    if (correctCount >= 10) return 4.0;
    if (correctCount >= 8) return 3.5;
    if (correctCount >= 6) return 3.0;
    if (correctCount >= 4) return 2.5;
    return 2.0;
  } else {
    if (correctCount >= 39) return 9.0;
    if (correctCount >= 37) return 8.5;
    if (correctCount >= 35) return 8.0;
    if (correctCount >= 32) return 7.5;
    if (correctCount >= 30) return 7.0;
    if (correctCount >= 26) return 6.5;
    if (correctCount >= 23) return 6.0;
    if (correctCount >= 18) return 5.5;
    if (correctCount >= 16) return 5.0;
    if (correctCount >= 13) return 4.5;
    if (correctCount >= 10) return 4.0;
    if (correctCount >= 8) return 3.5;
    if (correctCount >= 6) return 3.0;
    if (correctCount >= 4) return 2.5;
    return 2.0;
  }
}

/**
 * Grade the supplied scope by marks. Unscoped legacy calls default to section.
 * Band is intentionally absent in MVP; calculateBandScore is not called here.
 * Throws GradingValidationError for malformed content or submitted selections.
 */
export function gradeExam(
  questions: Question[],
  answersMap: Record<string, string | string[]>,
  skill: SkillType,
  scope: SubmissionScope = 'section',
): ExamGradingSummary {
  if (!['reading', 'listening'].includes(skill) ||
      !['section', 'full_skill', 'custom'].includes(scope)) {
    throw new GradingValidationError('VALIDATION_ERROR', 'Invalid skill or scope');
  }
  const ids = new Set(questions.map((q) => q.id));
  if (ids.size !== questions.length) {
    throw new GradingValidationError('CONTENT_ERROR', 'Duplicate question IDs');
  }
  if (Object.keys(answersMap).some((id) => !ids.has(id))) {
    throw new GradingValidationError('VALIDATION_ERROR', 'Answer outside supplied scope');
  }
  const results = questions.map((q) => gradeSingleQuestion(q, answersMap[q.id]));
  const correctMarks = results.reduce((sum, result) => sum + result.pointsAwarded, 0);
  const totalMarks = results.reduce((sum, result) => sum + result.maxPoints, 0);
  const scorePercentage = totalMarks > 0 ? Math.round((correctMarks / totalMarks) * 100) : 0;
  const bandReason: BandReason = scope !== 'full_skill'
    ? 'partial_scope'
    : totalMarks !== 40 ? 'incomplete_content' : 'not_displayed_mvp';

  return {
    questionCount: questions.length,
    correctMarks,
    totalMarks,
    totalQuestions: totalMarks,
    totalCorrect: correctMarks,
    scorePercentage,
    scope,
    bandScore: null,
    bandReason,
    results,
  };
}
