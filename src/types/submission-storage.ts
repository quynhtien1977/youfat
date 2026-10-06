import type { ExamGradingSummary, Question, Section, SkillType, SubmissionMode, SubmissionScope, SubmissionSnapshot, Test } from './database';

export interface BuildSnapshotInput {
  graded: ExamGradingSummary;
  test: Pick<Test, 'id' | 'book' | 'test_number'>;
  sections: Pick<Section, 'id' | 'test_id' | 'skill' | 'section_number'>[];
  questions: Question[];
  /** Optional original map, for validating callers that retain submitted answers. */
  answers?: Record<string, string | string[]>;
  skill: SkillType;
  mode: SubmissionMode;
  scope: SubmissionScope;
  started_at: string;
  submitted_at: string;
  time_spent_seconds: number;
  /** Created by the caller once at attempt start; never regenerated on retry. */
  attempt_id: string;
}

export type SubmissionSummary = Omit<SubmissionSnapshot, 'results' | 'grading_version' | 'schema_version'>;
export interface SubmissionCursor { submitted_at: string; id: string }
export interface SubmissionListOptions { limit?: number; cursor?: SubmissionCursor }
export interface SubmissionPage { items: SubmissionSummary[]; next_cursor: SubmissionCursor | null }
export interface SubmissionRepository {
  save(snapshot: SubmissionSnapshot): Promise<SubmissionSnapshot>;
  get(id: string): Promise<SubmissionSnapshot | null>;
  list(options?: SubmissionListOptions): Promise<SubmissionPage>;
}
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export interface LockProvider {
  request<T>(name: string, callback: () => Promise<T>): Promise<T>;
}
export interface SubmissionEnvelope { schema_version: 1; submissions: SubmissionSnapshot[] }
export interface ImportIssue { index: number; id?: string; reason: string }
export interface SubmissionImportReport {
  valid: SubmissionSnapshot[];
  errors: ImportIssue[];
  duplicates: ImportIssue[];
  conflicts: ImportIssue[];
}
