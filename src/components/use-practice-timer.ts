'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** Wall-clock elapsed time: opening a modal/audio seeking never changes the timer. */
export function usePracticeTimer(ready: boolean, attemptKey: string) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const startedAt = useRef<number | null>(null);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  const attempt = useRef<{key:string;id:string} | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (attempt.current?.key !== attemptKey) {
      attempt.current = {key:attemptKey,id:crypto.randomUUID()};
      startedAt.current = Date.now();
    }
    interval.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt.current!) / 1000));
    }, 250);
    return () => { if (interval.current) clearInterval(interval.current); };
  }, [ready, attemptKey]);

  const stop = useCallback(() => {
    if (interval.current) clearInterval(interval.current);
    if (startedAt.current === null || !attempt.current) throw new Error('ATTEMPT_NOT_STARTED');
    const now = Date.now();
    const seconds = Math.floor((now - startedAt.current) / 1000);
    setElapsedSeconds(seconds);
    return {attempt_id:attempt.current.id,started_at:new Date(startedAt.current).toISOString(),
      submitted_at:new Date(now).toISOString(),time_spent_seconds:seconds};
  }, []);

  return { elapsedSeconds, stop };
}
