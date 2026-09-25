export type SkillType = 'reading' | 'listening';
export type AnswerMode = 'single' | 'any_of' | 'all_of';

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
  locate_info?: any;
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
  id: string;
  user_id?: string;
  test_id: string;
  skill: 'reading' | 'listening' | 'writing' | 'full';
  section_id?: string;
  answers: Record<string, string | string[]>;
  score?: number;
  band_score?: number;
  total_correct?: number;
  total_questions?: number;
  essay_text?: string;
  ai_feedback?: any;
  duration_seconds?: number;
  submitted_at: string;
}
