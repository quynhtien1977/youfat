import type { SubmissionQuestionResult, SubmissionSnapshot } from '../types/database';
import type { BuildSnapshotInput } from '../types/submission-storage';
import { requireValid } from './submission-errors';

export const SNAPSHOT_MAX_BYTES = 102400;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SNAPSHOT_KEYS = ['schema_version','id','test_id','test_key','skill','mode','scope','section_ids',
  'started_at','submitted_at','time_spent_seconds','question_count','correct_marks','total_marks',
  'band_score','band_reason','grading_version','results'];
const RESULT_KEYS = ['question_id','question_key','section_id','question_order','question_type','answer_mode',
  'user_answer','correct_answers','points_awarded','max_marks','is_fully_correct'];
const choice = (value: string) => value.trim().toUpperCase();
const integer = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value);
function object(value: unknown): asserts value is Record<string, unknown> {
  requireValid(value !== null && typeof value === 'object' && !Array.isArray(value), 'SHAPE');
}
function exactKeys(value: Record<string, unknown>, keys: string[]) {
  requireValid(Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value,key)), 'FIELDS');
}
export function validateSubmissionId(value: unknown): asserts value is string {
  requireValid(typeof value === 'string' && UUID.test(value), 'ID');
}
function timestamp(value: unknown): string {
  requireValid(typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/.test(value)
    && Number.isFinite(Date.parse(value)), 'TIMESTAMP');
  const [year,month,day] = value.slice(0,10).split('-').map(Number);
  requireValid(month >= 1 && month <= 12 && day >= 1 && day <= new Date(Date.UTC(year,month,0)).getUTCDate(), 'TIMESTAMP');
  return new Date(value).toISOString();
}

/** Stable object-key serialization; ordered arrays remain ordered, choice sets are normalized separately. */
export function canonicalJson(value: unknown): string {
  const normalize = (item: unknown): unknown => {
    if (Array.isArray(item)) return item.map(normalize);
    if (item !== null && typeof item === 'object') return Object.fromEntries(
      Object.entries(item).sort(([a],[b]) => a < b ? -1 : a > b ? 1 : 0).map(([key,val]) => [key,normalize(val)]));
    return item;
  };
  return JSON.stringify(normalize(value));
}
export function utf8Bytes(text: string): number { return new TextEncoder().encode(text).byteLength; }

/** Read v1/v2 without live content or regrading; never invent legacy selection order. */
export function validateSnapshot(raw: unknown): SubmissionSnapshot {
  object(raw); exactKeys(raw,SNAPSHOT_KEYS);
  requireValid((raw.schema_version === 1 || raw.schema_version === 2) && raw.grading_version === 'marks-v1', 'VERSION');
  validateSubmissionId(raw.id); validateSubmissionId(raw.test_id);
  requireValid(raw.skill === 'reading' || raw.skill === 'listening', 'SKILL');
  requireValid(raw.mode === 'practice' || raw.mode === 'exam', 'MODE');
  requireValid(['section','custom','full_skill'].includes(String(raw.scope)), 'SCOPE');
  requireValid(typeof raw.test_key === 'string' && /^cambridge:(?:1[0-9]|20):[1-4]$/.test(raw.test_key), 'TEST_KEY');
  const started = timestamp(raw.started_at), submitted = timestamp(raw.submitted_at);
  requireValid(Date.parse(submitted) >= Date.parse(started), 'TIMESTAMP');
  requireValid(integer(raw.time_spent_seconds) && raw.time_spent_seconds >= 0, 'TIME_SPENT');
  requireValid(Array.isArray(raw.section_ids) && raw.section_ids.length > 0 && raw.section_ids.length <= (raw.skill === 'reading' ? 3 : 4), 'SECTION_SCOPE');
  raw.section_ids.forEach(validateSubmissionId);
  requireValid(new Set(raw.section_ids.map(id=>id.toLowerCase())).size === raw.section_ids.length, 'DUPLICATE_SECTION');
  requireValid(raw.scope !== 'section' || raw.section_ids.length === 1, 'SECTION_SCOPE');
  requireValid(Array.isArray(raw.results) && raw.results.length > 0 && raw.results.length <= 40, 'RESULT_COVERAGE');
  requireValid(integer(raw.question_count) && raw.question_count === raw.results.length, 'RESULT_COVERAGE');
  const ids = new Set<string>(), keys = new Set<string>(), sectionNumbers = new Map<string,number>();
  const results: SubmissionQuestionResult[] = raw.results.map(item => {
    object(item); exactKeys(item,RESULT_KEYS);
    validateSubmissionId(item.question_id); validateSubmissionId(item.section_id);
    const questionId = item.question_id.toLowerCase(), sectionId = item.section_id.toLowerCase();
    requireValid(!ids.has(questionId) && !keys.has(String(item.question_key)), 'DUPLICATE_QUESTION');
    ids.add(questionId); keys.add(String(item.question_key));
    requireValid(Array.isArray(raw.section_ids) && raw.section_ids.some(id=>id.toLowerCase() === sectionId), 'QUESTION_SCOPE');
    requireValid(integer(item.question_order) && item.question_order >= 1 && item.question_order <= 40, 'QUESTION_ORDER');
    const prefix = `${raw.test_key}:${raw.skill}:`;
    requireValid(typeof item.question_key === 'string' && item.question_key.startsWith(prefix), 'QUESTION_KEY');
    const parts = item.question_key.slice(prefix.length).split(':');
    const sectionNumber = Number(parts[0]);
    requireValid(parts.length === 2 && /^[1-4]$/.test(parts[0]) && Number(parts[1]) === item.question_order
      && String(item.question_order) === parts[1] && sectionNumber <= (raw.skill === 'reading' ? 3 : 4), 'QUESTION_KEY');
    requireValid(!sectionNumbers.has(sectionId) || sectionNumbers.get(sectionId) === sectionNumber, 'SECTION_CONTEXT');
    sectionNumbers.set(sectionId,sectionNumber);
    requireValid(typeof item.question_type === 'string' && /^[A-Z][A-Z0-9_]*$/.test(item.question_type), 'QUESTION_TYPE');
    requireValid(['single','any_of','all_of'].includes(String(item.answer_mode)), 'ANSWER_MODE');
    requireValid(Array.isArray(item.correct_answers) && item.correct_answers.length > 0
      && item.correct_answers.every(answer => typeof answer === 'string' && answer.trim()), 'CORRECT_ANSWERS');
    const correct = (item.correct_answers as string[]).map(answer => item.answer_mode === 'all_of' ? choice(answer) : answer.trim());
    if (item.answer_mode === 'all_of') requireValid(new Set(correct).size === correct.length, 'CORRECT_ANSWERS');
    let answer: string | string[];
    if (item.answer_mode === 'all_of') {
      requireValid(Array.isArray(item.user_answer) && item.user_answer.every(a => typeof a === 'string'), 'USER_ANSWER');
      answer = [...new Set((item.user_answer as string[]).map(choice).filter(Boolean))];
      if (raw.schema_version === 1) answer.sort();
      requireValid(answer.length <= correct.length, 'OVER_SELECTION');
      correct.sort();
    } else {
      requireValid(typeof item.user_answer === 'string', 'USER_ANSWER'); answer = item.user_answer.trim();
    }
    const max = item.answer_mode === 'all_of' ? correct.length : 1;
    const selected = Array.isArray(answer) ? answer.length : answer ? 1 : 0;
    requireValid(integer(item.max_marks) && item.max_marks === max && integer(item.points_awarded)
      && item.points_awarded >= 0 && item.points_awarded <= selected && item.points_awarded <= max
      && item.is_fully_correct === (item.points_awarded === max), 'RESULT_MARKS');
    return { ...item, question_id:questionId, section_id:sectionId, user_answer:answer, correct_answers:correct } as unknown as SubmissionQuestionResult;
  });
  requireValid(sectionNumbers.size === raw.section_ids.length, 'RESULT_COVERAGE');
  requireValid(new Set(sectionNumbers.values()).size === sectionNumbers.size, 'DUPLICATE_SECTION');
  const total = results.reduce((sum,r)=>sum+r.max_marks,0), correct = results.reduce((sum,r)=>sum+r.points_awarded,0);
  requireValid(integer(raw.total_marks) && raw.total_marks === total && total <= 40 && integer(raw.correct_marks)
    && raw.correct_marks === correct && correct >= 0 && correct <= total, 'MARKS_MISMATCH');
  if (raw.scope === 'full_skill') {
    requireValid(sectionNumbers.size === (raw.skill === 'reading' ? 3 : 4), 'FULL_SCOPE');
    requireValid(total === 40, 'FULL_MARKS');
  }
  requireValid(raw.band_score === null && raw.band_reason === (raw.scope === 'full_skill' ? 'not_displayed_mvp' : 'partial_scope'), 'BAND');
  const snapshot = { ...raw, id:raw.id.toLowerCase(), test_id:raw.test_id.toLowerCase(),
    started_at:started, submitted_at:submitted, results,
    section_ids:raw.section_ids.map(id=>id.toLowerCase()).sort((a,b)=>sectionNumbers.get(a)!-sectionNumbers.get(b)!) } as unknown as SubmissionSnapshot;
  requireValid(utf8Bytes(canonicalJson(snapshot)) <= SNAPSHOT_MAX_BYTES, 'PAYLOAD_TOO_LARGE');
  return snapshot;
}

/** Pure projection of gradeExam output: does not generate IDs, grade answers, or access storage. */
export function buildSnapshot(input: BuildSnapshotInput): SubmissionSnapshot {
  const {graded,test,sections,questions,scope,skill} = input;
  requireValid(sections.length > 0, 'SECTION_SCOPE');
  requireValid(new Set(sections.map(s=>s.id)).size === sections.length
    && new Set(sections.map(s=>s.section_number)).size === sections.length, 'DUPLICATE_SECTION');
  requireValid(sections.every(s=>s.test_id === test.id && s.skill === skill), 'SECTION_CONTEXT');
  requireValid(scope !== 'section' || sections.length === 1, 'SECTION_SCOPE');
  if (scope === 'full_skill') {
    const numbers = sections.map(s=>s.section_number).sort((a,b)=>a-b);
    requireValid(numbers.join(',') === (skill === 'reading' ? '1,2,3' : '1,2,3,4'), 'FULL_SCOPE');
  }
  requireValid(graded.scope === scope, 'SCOPE_MISMATCH');
  const sectionMap = new Map(sections.map(section=>[section.id,section]));
  requireValid(new Set(questions.map(q=>q.id)).size === questions.length, 'DUPLICATE_QUESTION');
  requireValid(questions.every(q=>sectionMap.has(q.section_id)), 'QUESTION_SCOPE');
  const questionMap = new Map(questions.map(q=>[q.id,q]));
  requireValid(!input.answers || Object.keys(input.answers).every(id=>questionMap.has(id)), 'ANSWER_SCOPE');
  requireValid(graded.results.every(result=>questionMap.has(result.questionId)), 'RESULT_SCOPE');
  requireValid(graded.results.length === questions.length && new Set(graded.results.map(r=>r.questionId)).size === questions.length
    && graded.questionCount === questions.length, 'RESULT_COVERAGE');
  const testKey = `cambridge:${test.book}:${test.test_number}`;
  return validateSnapshot({schema_version:2, id:input.attempt_id, test_id:test.id, test_key:testKey, skill,
    mode:input.mode, scope, section_ids:sections.map(s=>s.id), started_at:input.started_at,
    submitted_at:input.submitted_at, time_spent_seconds:input.time_spent_seconds, question_count:graded.questionCount,
    correct_marks:graded.correctMarks, total_marks:graded.totalMarks, band_score:graded.bandScore,
    band_reason:graded.bandReason, grading_version:'marks-v1', results:graded.results.map(result=>{
      const question = questionMap.get(result.questionId)!;
      requireValid(result.questionOrder === question.question_order, 'QUESTION_ORDER');
      // Verify linkage to the supplied source, not whether the user's answer deserves its awarded score.
      requireValid(canonicalJson(result.correctAnswers) === canonicalJson(question.answer), 'RESULT_CONTEXT');
      return { question_id:question.id, question_key:`${testKey}:${skill}:${sectionMap.get(question.section_id)!.section_number}:${question.question_order}`,
        section_id:question.section_id, question_order:question.question_order, question_type:question.type,
        answer_mode:question.answer_mode, user_answer:result.userAnswer, correct_answers:result.correctAnswers,
        points_awarded:result.pointsAwarded, max_marks:result.maxPoints, is_fully_correct:result.isCorrect };
    })});
}
