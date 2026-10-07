'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ResultsScreen } from '@/components/results-screen';
import { ReadingReviewRoom } from '@/components/reading-review/reading-review-room';
import { getLocalRepository } from '@/lib/submission-client';
import { describeSubmission, storageFailureMessage } from '@/lib/submission-presentation';
import type { SubmissionSnapshot } from '@/types/database';
import styles from '@/components/submission-history.module.css';

export default function HistoryResultPage() {
  const {attemptId}=useParams<{attemptId:string}>();
  const [snapshot,setSnapshot]=useState<SubmissionSnapshot | null>(null);
  const [busy,setBusy]=useState(true);
  const [error,setError]=useState('');
  const [reviewing,setReviewing]=useState(false);
  useEffect(()=>{
    let active=true;
    Promise.resolve().then(()=>getLocalRepository().get(attemptId)).then(item=>{
      if(active){setSnapshot(item);setBusy(false);}
    }).catch(cause=>{if(active){setError(storageFailureMessage(cause));setBusy(false);}});
    return ()=>{active=false;};
  },[attemptId]);
  const label=snapshot?describeSubmission(snapshot):null;

  if (reviewing && snapshot && snapshot.skill === 'reading') {
    return <ReadingReviewRoom snapshot={snapshot} onBack={() => setReviewing(false)} />;
  }

  return <div className={styles.review}>
    <header className={styles.reviewHeader}><Link href="/history">← Lịch sử làm bài</Link>
      {label&&<><h1>{label.title} — {label.skill}</h1><p>{label.scope} · Bài lưu trên trình duyệt này</p></>}
    </header>
    {busy?<p role="status" className={styles.page}>Đang tải bài làm…</p>
      :error?<p role="alert" className={`${styles.page} ${styles.error}`}>{error}</p>
      :snapshot?<ResultsScreen snapshot={snapshot} onReview={snapshot.skill === 'reading' ? () => setReviewing(true) : undefined} reviewButtonLabel="Xem lại" />
      :<p className={styles.page}>Không tìm thấy bài làm trên trình duyệt này. Bài có thể đã bị xóa hoặc được lưu ở thiết bị khác.</p>}
  </div>;
}
