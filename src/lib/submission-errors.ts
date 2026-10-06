export type SubmissionErrorCode = 'STORAGE_FULL' | 'UNAVAILABLE' | 'PAYLOAD_CONFLICT' | 'VALIDATION_ERROR';

export class SubmissionError extends Error {
  constructor(public readonly code: SubmissionErrorCode, public readonly reason: string,
    public readonly details?: Readonly<Record<string, string | number>>) {
    super(`${code}: ${reason}`);
    this.name = 'SubmissionError';
  }
}

export function requireValid(condition: unknown, reason: string): asserts condition {
  if (!condition) throw new SubmissionError('VALIDATION_ERROR', reason);
}
