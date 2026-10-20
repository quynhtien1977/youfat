import type {
  AnswerMode, Question, QuestionGradingResult, QuestionOption, Section,
  SubmissionQuestionResult, SubmissionSnapshot,
} from './database';
import type {ReadingLocateInfo, ReadingPassageStructure} from './reading-locate';

export type ReviewLiveSection = Pick<Section, 'id' | 'test_id' | 'skill' | 'section_number' | 'title'> & {
  section_title?: string | null;
  passage_text?: string | null;
  passage_structure?: unknown;
};
export type ReviewOption = Pick<QuestionOption, 'option' | 'text'>;
export interface ReviewLiveQuestion {
  id: string;
  section_id: string;
  question_order: number;
  type: Question['type'];
  answer_mode: AnswerMode;
  answer: string[];
  prompt: string;
  instruction?: string | null;
  question_set_title?: string | null;
  image_url?: string | null;
  /** Untrusted HTML: must be sanitized by the approved renderer boundary. */
  explanation?: string | null;
  locate_info?: unknown;
  options?: ReviewOption[];
}
export interface ReadingLiveContent {
  sections: ReviewLiveSection[];
  questions: ReviewLiveQuestion[];
}
export type ReviewQuestionContent = Omit<ReviewLiveQuestion, 'answer' | 'answer_mode' | 'locate_info'> & {
  locate_info: ReadingLocateInfo | null;
};
export type ReviewSectionContent = Omit<ReviewLiveSection, 'passage_structure'> & {
  passage_structure: ReadingPassageStructure | null;
};
export interface ReadingReviewLoadOptions {
  /** Rollout opt-in only after the user has applied/verified the nullable DB column. */
  includePassageStructure?: boolean;
}
export type ReviewStatus = 'correct' | 'incorrect' | 'skipped' | 'partial';
export interface ReviewPill {
  order: number;
  status: ReviewStatus | 'unknown';
  questionId: string;
  /** Missing legacy click order or inconsistent imported historical points. */
  reason?: 'legacy_selection_order' | 'inconsistent_points';
}
export type ReviewDrift = 'answer_mode' | 'correct_answers';
export interface ReviewQuestion {
  historical: SubmissionQuestionResult;
  status: ReviewStatus;
  availability: 'available' | 'missing_question' | 'missing_section' | 'question_section_changed';
  drift: ReviewDrift[];
  /** No live grading targets here; null means no real content is available. */
  content: ReviewQuestionContent | null;
}
export interface ReviewSection {
  id: string;
  sectionNumber: number;
  content: ReviewSectionContent | null;
  questions: ReviewQuestion[];
}
export interface ReviewModel {
  snapshot: SubmissionSnapshot;
  sections: ReviewSection[];
  questions: ReviewQuestion[];
  driftCount: number;
  missingCount: number;
  warning: string | null;
}

/** Transitional read-only projection, NOT a complete replacement for the review UI. */
export interface InlineReviewData {
  section: ReviewLiveSection | null;
  /** Renderer DTO, not a DB row: deliberately omits unneeded timestamps/option IDs. */
  questions: (Omit<Question, 'created_at' | 'options'> & {options: ReviewOption[]})[];
  answers: Record<string, string | string[]>;
  results: Record<string, QuestionGradingResult>;
  missing: ReviewQuestion[];
  warning: string | null;
}
