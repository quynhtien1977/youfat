export type SkillType = 'reading' | 'listening';
export type AnswerMode = 'single' | 'any_of' | 'all_of';
export type SubmissionScope = 'section' | 'full_skill' | 'custom';
export type SubmissionMode = 'practice' | 'exam';
export type BandReason = 'partial_scope' | 'incomplete_content' | 'not_displayed_mvp';

export interface QuestionGradingResult {
  questionId: string;
  questionOrder: number;
  userAnswer: string | string[];
  correctAnswers: string[];
  isCorrect: boolean;
  pointsAwarded: number;
  maxPoints: number;
  explanation?: string;
}

export interface ExamGradingSummary {
  questionCount: number;
  correctMarks: number;
  totalMarks: number;
  /** Compatibility aliases: both count marks, not question rows. */
  totalQuestions: number;
  totalCorrect: number;
  scorePercentage: number;
  scope: SubmissionScope;
  bandScore: number | null;
  bandReason: BandReason | null;
  results: QuestionGradingResult[];
}

/** One JSON contract for local storage and later cloud payloads; not a DB row. */
export interface SubmissionSnapshot {
  schema_version: 1;
  id: string;
  test_id: string;
  test_key: string;
  skill: SkillType;
  mode: SubmissionMode;
  scope: SubmissionScope;
  section_ids: string[];
  started_at: string;
  submitted_at: string;
  time_spent_seconds: number;
  question_count: number;
  correct_marks: number;
  total_marks: number;
  band_score: number | null;
  band_reason: BandReason | null;
  grading_version: string;
  results: SubmissionQuestionResult[];
}

export interface SubmissionQuestionResult {
  question_id: string;
  question_key: string;
  section_id: string;
  question_order: number;
  question_type: Question['type'];
  answer_mode: AnswerMode;
  user_answer: string | string[];
  correct_answers: string[];
  points_awarded: number;
  max_marks: number;
  is_fully_correct: boolean;
}

export interface Test {
  id: string;
  book: number;
  test_number: number;
  title: string;
  created_at: string;
}

export interface Section {
  id: string;
  test_id: string;
  skill: SkillType;
  section_number: number;
  title: string;
  section_title?: string;
  passage_text?: string;
  thumbnail_url?: string;
  audio_url?: string;
  listen_from_second?: number;
  listen_to_second?: number;
  total_questions: number;
  created_at: string;
}

export interface QuestionOption {
  id: string;
  question_id: string;
  option: string; // 'A', 'B', 'C', 'D'
  text: string;
  created_at: string;
}

export interface Question {
  id: string;
  section_id: string;
  question_order: number;
  type: string;
  answer_mode: AnswerMode;
  question_set_title?: string;
  instruction?: string;
  prompt: string;
  answer: string[]; // ['A'] hoặc ['4 sides', 'four sides']
  explanation?: string;
  locate_info?: unknown;
  image_url?: string;
  options?: QuestionOption[];
  created_at: string;
}

export interface WritingTask {
  id: string;
  test_id: string;
  task_number: 1 | 2;
  title: string;
  prompt: string;
  image_url?: string;
  thumbnail_url?: string;
  time_limit_minutes: number;
  min_words: number;
  sample_essay?: string;
  sample_essay_parts?: {
    overview?: string;
    body_paragraphs?: string[];
    conclusion?: string;
  };
  created_at: string;
}

export interface UserSubmission {
  id?: string;
  user_id?: string | null;
  test_id: string;
  skill: 'reading' | 'listening' | 'writing' | 'full';
  user_answers: Record<string, string | string[]>;
  correct_count: number;
  total_count: number;
  band_score?: number | null;
  time_spent_seconds: number;
  created_at?: string;
}
