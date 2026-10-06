'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { SubmissionSnapshot } from '@/types/database';
import type { BuildSnapshotInput } from '@/types/submission-storage';
import { buildSnapshot } from '@/lib/submission-snapshot';
import { getLocalRepository } from '@/lib/submission-client';
import { storageFailureMessage } from '@/lib/submission-presentation';
import { SubmissionError } from '@/lib/submission-errors';
import { supabase } from '@/lib/supabase';
import styles from './submission-history.module.css';

export type PendingSubmission = Omit<BuildSnapshotInput, 'test'>;

/** Mounted after grading. Strict Mode repeats this effect; UUID/payload never change. */
export function SubmissionSaveStatus({ input }: { input: PendingSubmission }) {
  const [status, setStatus] = useState<{ kind: 'saving' | 'saved' | 'failed'; message?: string }>({kind:'saving'});
  const [retry, setRetry] = useState(0);
  const snapshot = useRef<SubmissionSnapshot | null>(null);
  const building = useRef<Promise<SubmissionSnapshot> | null>(null);
  useEffect(() => {
    let active = true;
    async function save() {
      try {
        if (!snapshot.current) {
          if (!building.current) {
            building.current = (async () => {
              const {data,error} = await supabase.from('tests').select('id, book, test_number')
                .eq('id',input.sections[0].test_id).single();
              if (error || !data) throw new SubmissionError('UNAVAILABLE','TEST_CONTEXT');
              return buildSnapshot({...input,test:data});
            })();
          }
          snapshot.current = await building.current;
        }
        await getLocalRepository().save(snapshot.current);
        if (active) setStatus({kind:'saved'});
      } catch (error) {
        building.current = null; // Context failures may be retried, with frozen timing/UUID.
        console.error('[submission-save]', error instanceof SubmissionError
          ? {code:error.code,reason:error.reason} : {code:'UNKNOWN_ERROR'});
        if (active) setStatus({kind:'failed',message:storageFailureMessage(error)});
      }
    }
    void save();
    return () => { active = false; };
  }, [input,retry]);
  return <aside className={`${styles.notice} ${status.kind === 'failed' ? styles.error : ''}`} aria-live="polite" aria-atomic="true" data-save-state={status.kind}>
    <p>{status.kind === 'saving' ? 'Đang lưu bài…' : status.kind === 'saved'
      ? 'Đã lưu bài trên trình duyệt này.' : `Lưu bài thất bại. ${status.message}`}</p>
    <div className={styles.actions}>
      {status.kind === 'failed' && <button type="button" onClick={() => {
        setStatus({kind:'saving'}); setRetry(r=>r+1);
      }}>Thử lại</button>}
      <Link href="/history">Lịch sử làm bài</Link>
    </div>
  </aside>;
}
