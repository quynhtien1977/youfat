import type { SubmissionSnapshot } from '@/types/database';
import { SubmissionError } from './submission-errors';

/** No passage titles are stored in v1. Show only labels supported by natural keys. */
export function describeSubmission(snapshot: Pick<SubmissionSnapshot, 'test_key' | 'skill' | 'scope' | 'results'>) {
  const [, book, test] = snapshot.test_key.split(':');
  const numbers = [...new Set(snapshot.results.map(r => Number(r.question_key.split(':')[4])))].sort((a,b)=>a-b);
  const sectionLabel = snapshot.skill === 'reading' ? 'Passage' : 'Section';
  return {
    title: `Cambridge ${book} · Test ${test}`,
    skill: snapshot.skill === 'reading' ? 'Reading' : 'Listening',
    scope: snapshot.scope === 'full_skill' ? 'Full đề'
      : `${snapshot.scope === 'custom' ? 'Tùy chọn · ' : ''}${sectionLabel} ${numbers.join(', ')}`,
  };
}

export function storageFailureMessage(error: unknown): string {
  if (!(error instanceof SubmissionError)) return 'Không lưu được bài. Vui lòng thử lại.';
  switch (error.code) {
    case 'STORAGE_FULL': return 'Bộ nhớ đã đầy. Hãy xuất file hoặc xóa bài cũ trong lịch sử rồi thử lại.';
    case 'UNAVAILABLE': return 'Không truy cập được bộ nhớ trình duyệt. Hãy cho phép lưu trữ rồi thử lại.';
    case 'PAYLOAD_CONFLICT': return 'Mã lượt làm đã có nội dung khác. Bài cũ không bị ghi đè.';
    default: return error.reason === 'CORRUPT_DATA'
      ? 'Dữ liệu lịch sử bị hỏng. Đã giữ bản gốc và tạo bản sao để khôi phục; không ghi đè dữ liệu.'
      : 'Dữ liệu bài làm không hợp lệ. Không lưu bài; vui lòng thử lại hoặc báo lỗi.';
  }
}
