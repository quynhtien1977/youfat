import { Question } from '../types/database';

export interface QuestionGradingResult {
  questionId: string;
  questionOrder: number;
  userAnswer: string | string[];
  correctAnswers: string[];
  isCorrect: boolean;
  explanation?: string;
}

export interface ExamGradingSummary {
  totalQuestions: number;
  totalCorrect: number;
  scorePercentage: number;
  bandScore: number;
  results: QuestionGradingResult[];
}

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

  if (q.answer_mode === 'all_of') {
    // MULTIPLE_CHOICE_MANY: Bắt buộc chọn đúng và đủ tất cả các đáp án
    const userList = Array.isArray(rawUserAnswer)
      ? rawUserAnswer.map((s) => s.trim().toUpperCase())
      : rawUserAnswer ? [rawUserAnswer.trim().toUpperCase()] : [];
    
    const targetSet = new Set(correctList.map((s) => s.trim().toUpperCase()));
    const userSet = new Set(userList);

    isCorrect = targetSet.size > 0 && targetSet.size === userSet.size && [...targetSet].every((val) => userSet.has(val));
  } else if (q.answer_mode === 'any_of') {
    // Chấp nhận trúng 1 trong các cách viết / từ đồng nghĩa
    const userStr = typeof rawUserAnswer === 'string' ? normalizeAnswerString(rawUserAnswer) : '';
    if (userStr) {
      isCorrect = correctList.some((target) => normalizeAnswerString(target) === userStr);
    }
  } else {
    // 'single': Trắc nghiệm 1 đáp án, True/False/NG, Matching
    const userStr = typeof rawUserAnswer === 'string' ? rawUserAnswer.trim().toUpperCase() : '';
    const firstTarget = (correctList[0] || '').trim().toUpperCase();
    isCorrect = Boolean(userStr && userStr === firstTarget);
  }

  return {
    questionId: q.id,
    questionOrder: q.question_order,
    userAnswer: rawUserAnswer || '',
    correctAnswers: correctList,
    isCorrect,
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
 * Chấm toàn bộ bài thi
 */
export function gradeExam(
  questions: Question[],
  answersMap: Record<string, string | string[]>,
  skill: 'reading' | 'listening'
): ExamGradingSummary {
  const results = questions.map((q) => gradeSingleQuestion(q, answersMap[q.id]));
  const totalCorrect = results.filter((r) => r.isCorrect).length;
  const totalQuestions = questions.length;
  const scorePercentage = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const bandScore = calculateBandScore(totalCorrect, skill);

  return {
    totalQuestions,
    totalCorrect,
    scorePercentage,
    bandScore,
    results,
  };
}
