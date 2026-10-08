import type { SupabaseClient } from '@supabase/supabase-js';
import type { AnswerMode, SubmissionSnapshot } from '../types/database';
import type {
  InlineReviewData, ReadingLiveContent, ReviewDrift, ReviewLiveQuestion,
  ReviewLiveSection, ReviewModel, ReviewOption, ReviewQuestion, ReviewSectionContent, ReadingReviewLoadOptions,
} from '../types/reading-review';
import { normalizeAnswerString } from './gradingEngine';
import { requireValid, SubmissionError } from './submission-errors';
import { validateSnapshot } from './submission-snapshot';
import {parsePassageStructure, parseReadingLocateInfo} from './reading-locate';

export const REVIEW_UPDATE_WARNING = 'Đề đã được cập nhật sau khi bạn làm bài, điểm giữ nguyên theo lúc nộp';
const choice = (value: string) => value.trim().toUpperCase();
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function targets(values: string[], mode: AnswerMode): string[] {
  const normalized = values.map(mode === 'any_of' ? normalizeAnswerString : choice);
  // single retains order (the grading engine uses the first target).
  return mode === 'single' ? normalized : [...new Set(normalized)].sort();
}

/** Pure join. Does not grade, save, fetch, sanitize HTML, or resolve IDs by guessing natural keys. */
export function buildReviewModel(raw: SubmissionSnapshot, liveContent: ReadingLiveContent): ReviewModel {
  const snapshot = validateSnapshot(raw);
  requireValid(snapshot.skill === 'reading', 'REVIEW_READING_ONLY');
  requireValid(Array.isArray(liveContent.sections) && Array.isArray(liveContent.questions), 'LIVE_CONTENT_SHAPE');
  const sections = new Map<string, ReviewSectionContent>();
  for (const section of liveContent.sections) {
    requireValid(section && typeof section.id === 'string', 'LIVE_SECTION_CONTENT');
    requireValid(!sections.has(section.id), 'DUPLICATE_LIVE_SECTION');
    const historical = snapshot.results.find(result => result.section_id === section.id);
    requireValid(historical && section.test_id === snapshot.test_id && section.skill === 'reading'
      && section.section_number === Number(historical.question_key.split(':')[4]), 'LIVE_SECTION_CONTEXT');
    requireValid(typeof section.title === 'string' && (section.passage_text == null || typeof section.passage_text === 'string')
      && (section.section_title == null || typeof section.section_title === 'string'), 'LIVE_SECTION_CONTENT');
    const structure = parsePassageStructure(section.passage_structure);
    sections.set(section.id, {id: section.id, test_id: section.test_id, skill: section.skill,
      section_number: section.section_number, title: section.title,
      section_title: section.section_title, passage_text: section.passage_text,
      passage_structure: structure?.reference_passage_text === section.passage_text ? structure : null});
  }
  const liveQuestions = new Map<string, ReviewLiveQuestion>();
  for (const question of liveContent.questions) {
    requireValid(question && typeof question.id === 'string', 'LIVE_QUESTION_CONTENT');
    requireValid(!liveQuestions.has(question.id), 'DUPLICATE_LIVE_QUESTION');
    requireValid(typeof question.prompt === 'string' && typeof question.type === 'string'
      && typeof question.section_id === 'string' && Number.isSafeInteger(question.question_order)
      && [question.explanation,question.instruction,question.question_set_title,question.image_url]
        .every(value => value == null || typeof value === 'string')
      && ['single','any_of','all_of'].includes(question.answer_mode)
      && Array.isArray(question.answer) && question.answer.every(answer => typeof answer === 'string')
      && (question.options == null || (Array.isArray(question.options) && question.options.every(option =>
        option && typeof option.option === 'string' && typeof option.text === 'string'))), 'LIVE_QUESTION_CONTENT');
    liveQuestions.set(question.id, question);
  }
  const questions: ReviewQuestion[] = snapshot.results.map(historical => {
    const section = sections.get(historical.section_id);
    const live = liveQuestions.get(historical.question_id);
    const availability = !section ? 'missing_section' : !live ? 'missing_question'
      : live.section_id !== historical.section_id ? 'question_section_changed' : 'available';
    const drift: ReviewDrift[] = [];
    if (availability === 'available' && live) {
      if (historical.answer_mode !== live.answer_mode) drift.push('answer_mode');
      // Compare using the historical mode, even if the live mode has changed.
      if (JSON.stringify(targets(historical.correct_answers, historical.answer_mode)) !==
          JSON.stringify(targets(live.answer, historical.answer_mode))) drift.push('correct_answers');
    }
    const selected = Array.isArray(historical.user_answer) ? historical.user_answer.length : historical.user_answer.trim().length;
    const status = !selected ? 'skipped' : historical.is_fully_correct ? 'correct'
      : historical.points_awarded > 0 ? 'partial' : 'incorrect';
    // No live grading targets/audio; locate is optional validated content, never guessed evidence.
    const content = availability === 'available' && live ? {
      id: live.id, section_id: live.section_id, question_order: live.question_order, type: live.type,
      prompt: live.prompt, instruction: live.instruction, question_set_title: live.question_set_title,
      image_url: live.image_url, explanation: live.explanation,
      locate_info: parseReadingLocateInfo(live.locate_info),
      options: (live.options ?? []).map(option => ({option: option.option, text: option.text})),
    } : null;
    return {historical, status, availability, drift, content};
  });
  const driftCount = questions.filter(question => question.drift.length).length;
  const missingCount = questions.filter(question => question.availability !== 'available').length;
  return copy({snapshot, questions, driftCount, missingCount,
    warning: driftCount || missingCount ? REVIEW_UPDATE_WARNING : null,
    sections: snapshot.section_ids.map(id => ({id,
      sectionNumber: Number(snapshot.results.find(result => result.section_id === id)!.question_key.split(':')[4]),
      content: sections.get(id) ?? null, questions: questions.filter(question => question.historical.section_id === id)})),
  });
}

/** Optional legacy seam for BOTH entry points. UI must still handle missing/blank/partial and sanitize HTML. */
export function toInlineReviewData(model: ReviewModel, sectionId: string): InlineReviewData {
  const section = model.sections.find(section => section.id === sectionId);
  requireValid(section, 'REVIEW_SECTION_SCOPE');
  const available = section.questions.filter(question => question.content !== null);
  return copy({section: section.content, warning: model.warning,
    missing: section.questions.filter(question => question.content === null),
    questions: available.map(({historical: saved, content}) => {
      requireValid(content, 'REVIEW_MISSING_CONTENT');
      return {
      ...content, question_order: saved.question_order, type: saved.question_type,
      answer_mode: saved.answer_mode, answer: saved.correct_answers,
      instruction: content.instruction ?? undefined,
      question_set_title: content.question_set_title ?? undefined,
      image_url: content.image_url ?? undefined, explanation: content.explanation ?? undefined,
      options: content.options ?? [],
    }; }),
    answers: Object.fromEntries(section.questions.map(({historical: saved}) => [saved.question_id, saved.user_answer])),
    results: Object.fromEntries(section.questions.map(({historical: saved, content}) => [saved.question_id, {
      questionId: saved.question_id, questionOrder: saved.question_order, userAnswer: saved.user_answer,
      correctAnswers: saved.correct_answers, isCorrect: saved.is_fully_correct,
      pointsAwarded: saved.points_awarded, maxPoints: saved.max_marks, explanation: content?.explanation ?? undefined,
    }])),
  });
}

type AnonContentClient = Pick<SupabaseClient, 'from'>;
const PAGE_SIZE = 500;
async function readPages<T>(client: AnonContentClient, table: string, select: string, field: string, ids: string[]): Promise<T[]> {
  const rows: T[] = [];
  const seen = new Set<string>();
  // Keep IN filters bounded; options are paged independently, not an embedded relationship.
  for (let start = 0; start < ids.length; start += 100) {
    let offset = 0;
    while (true) {
      let data: unknown;
      try {
        const response = await client.from(table).select(select).in(field, ids.slice(start,start+100))
          .order('id').range(offset,offset+PAGE_SIZE-1);
        if (response.error) throw new Error('GET failed');
        data = response.data;
      } catch {
        throw new SubmissionError('UNAVAILABLE','REVIEW_CONTENT_FETCH', {table});
      }
      requireValid(Array.isArray(data), 'LIVE_CONTENT_SHAPE');
      if (data.length === 0) break;
      for (const row of data) {
        requireValid(row && typeof row.id === 'string' && !seen.has(row.id), 'LIVE_PAGE_DUPLICATE');
        seen.add(row.id);
      }
      rows.push(...data as T[]);
      // Advance by actual rows and continue until empty, even if the server cap is < PAGE_SIZE.
      offset += data.length;
    }
  }
  return rows;
}

/** GET only. Caller passes the existing anon client; no env/storage/client creation at import. */
export async function fetchReadingLiveContent(raw: SubmissionSnapshot, anonClient: AnonContentClient,
  loadOptions: ReadingReviewLoadOptions = {}): Promise<ReadingLiveContent> {
  const snapshot = validateSnapshot(raw);
  requireValid(snapshot.skill === 'reading', 'REVIEW_READING_ONLY');
  const [sections, questions] = await Promise.all([
    readPages<ReviewLiveSection>(anonClient,'sections',
      'id,test_id,skill,section_number,title,section_title,passage_text' + (loadOptions.includePassageStructure ? ',passage_structure' : ''),
      'id',snapshot.section_ids),
    readPages<ReviewLiveQuestion>(anonClient,'questions',
      'id,section_id,question_order,type,answer_mode,answer,prompt,instruction,question_set_title,image_url,explanation,locate_info',
      'section_id',snapshot.section_ids),
  ]);
  const options = await readPages<ReviewOption & {id: string; question_id: string}>(anonClient,'options',
    'id,question_id,option,text','question_id',questions.map(question => question.id));
  const byQuestion = new Map<string, ReviewOption[]>();
  for (const option of options) {
    const list = byQuestion.get(option.question_id) ?? [];
    list.push({option: option.option, text: option.text}); byQuestion.set(option.question_id,list);
  }
  return {sections,questions:questions.map(question => ({...question,options:byQuestion.get(question.id) ?? []}))};
}

/** Common loading adapter: post-submit snapshot OR repository.get(id) -> the same ReviewModel. */
export async function loadReadingReview(snapshot: SubmissionSnapshot, anonClient: AnonContentClient,
  options: ReadingReviewLoadOptions = {}): Promise<ReviewModel> {
  return buildReviewModel(snapshot, await fetchReadingLiveContent(snapshot,anonClient,options));
}
