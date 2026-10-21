import { LocalRepository } from './local-submission-repository';
import { SubmissionError } from './submission-errors';

let repository: LocalRepository | undefined;
/** Call ONLY from client effects/handlers, never during rendering (including SSR). */
export function getLocalRepository(): LocalRepository {
  if (typeof window === 'undefined') throw new SubmissionError('UNAVAILABLE', 'CLIENT_ONLY');
  if (!repository) {
    try { repository = new LocalRepository(window.localStorage); }
    catch { throw new SubmissionError('UNAVAILABLE', 'STORAGE_BLOCKED'); }
  }
  return repository;
}
