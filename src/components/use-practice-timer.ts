'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** Wall-clock elapsed time: opening a modal/audio seeking never changes the timer. */
export function usePracticeTimer(ready: boolean, attemptKey: string) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const startedAt = useRef<number | null>(null);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!ready) return;
    startedAt.current = Date.now();
    interval.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt.current!) / 1000));
    }, 250);
    return () => { if (interval.current) clearInterval(interval.current); };
  }, [ready, attemptKey]);

  const stop = useCallback(() => {
    if (interval.current) clearInterval(interval.current);
    if (startedAt.current !== null) {
      setElapsedSeconds(Math.floor((Date.now() - startedAt.current) / 1000));
    }
  }, []);

  return { elapsedSeconds, stop };
}
