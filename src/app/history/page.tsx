'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { SubmissionSnapshot } from '@/types/database';
import type { SubmissionCursor } from '@/types/submission-storage';
import { getLocalRepository } from '@/lib/submission-client';
import { describeSubmission, storageFailureMessage } from '@/lib/submission-presentation';
import { formatElapsedTime } from '@/lib/submission-controls';
import { summarizeSnapshot } from '@/lib/result-statistics';
import { SubmissionTransferPanel } from '@/components/submission-transfer-panel';
import styles from '@/components/submission-history.module.css';

export default function HistoryPage() {
  const [selectedSkill, setSelectedSkill] = useState<'all' | 'reading' | 'listening'>('all');
  const [items,setItems]=useState<SubmissionSnapshot[]>([]);
  const [cursor,setCursor]=useState<SubmissionCursor | null>(null);
  const [busy,setBusy]=useState(true);
  const [error,setError]=useState('');
  const [deleting,setDeleting]=useState<SubmissionSnapshot | null>(null);
  const dialog=useRef<HTMLDialogElement>(null);
  const generation=useRef(0);
  const load=useCallback(async(after?:SubmissionCursor)=>{
    const request=++generation.current;setBusy(true);setError('');
    try {
      const repository=getLocalRepository();
      const page=await repository.list({limit:10,cursor:after});
      // local get only: summary contract omits question_key needed for scope labels.
      const snapshots=(await Promise.all(page.items.map(item=>repository.get(item.id))))
        .filter((item):item is SubmissionSnapshot=>item!==null);
      if(request!==generation.current)return;
      setItems(previous=>after ? [...previous,...snapshots.filter(s=>!previous.some(p=>p.id===s.id))] : snapshots);
      setCursor(page.next_cursor);
    } catch(cause){if(request===generation.current)setError(storageFailureMessage(cause));}
    finally{if(request===generation.current)setBusy(false);}
  },[]);
  useEffect(()=>{
    const requestGeneration=generation;
    void Promise.resolve().then(()=>load());
    const changed=(event:StorageEvent)=>{if(event.key==='youfat:submissions:v1')void load();};
    window.addEventListener('storage',changed);
    return ()=>{requestGeneration.current++;window.removeEventListener('storage',changed);};
  },[load]);
  useEffect(()=>{
    if(deleting&&!dialog.current?.open)dialog.current?.showModal();
    if(!deleting&&dialog.current?.open)dialog.current.close();
  },[deleting]);
  async function remove() {
    if(!deleting)return;setBusy(true);setError('');
    try {await getLocalRepository().remove(deleting.id);setDeleting(null);await load();}
    catch(cause){setError(storageFailureMessage(cause));setBusy(false);}
  }

  const filteredItems = selectedSkill === 'all'
    ? items
    : items.filter((item) => item.skill === selectedSkill);

  return <main className={styles.page}>
    <header className={styles.header}><h1>Lịch sử làm bài</h1><nav aria-label="Luyện tập"><Link href="/reading">Reading</Link><Link href="/listening">Listening</Link></nav></header>
    <aside className={styles.notice}>Bài làm lưu trên trình duyệt này. Xóa dữ liệu trình duyệt sẽ mất bài. Hãy xuất file để sao lưu hoặc chuyển thiết bị.</aside>
    <SubmissionTransferPanel onChanged={()=>void load()} />

    <div className={styles.tabs} role="tablist" aria-label="Lọc theo kỹ năng">
      <button
        type="button"
        className={`${styles.tabBtn} ${selectedSkill === 'all' ? styles.tabBtnActive : ''}`}
        onClick={() => setSelectedSkill('all')}
      >
        Tất cả ({items.length})
      </button>
      <button
        type="button"
        className={`${styles.tabBtn} ${selectedSkill === 'reading' ? styles.tabBtnActive : ''}`}
        onClick={() => setSelectedSkill('reading')}
      >
        Reading ({items.filter(i => i.skill === 'reading').length})
      </button>
      <button
        type="button"
        className={`${styles.tabBtn} ${selectedSkill === 'listening' ? styles.tabBtnActive : ''}`}
        onClick={() => setSelectedSkill('listening')}
      >
        Listening ({items.filter(i => i.skill === 'listening').length})
      </button>
    </div>

    {error && <div role="alert" className={styles.error}><p>{error}</p><button type="button" onClick={()=>void load()}>Thử lại</button></div>}
    {busy && <p role="status">Đang tải lịch sử…</p>}
    {!busy&&!error&&!filteredItems.length&&<section className={`${styles.card} ${styles.empty}`}><h2>Chưa có bài làm đã lưu</h2><p>Làm một bài Reading hoặc Listening, hoặc nhập file đã xuất để bắt đầu.</p><Link href="/reading">Luyện Reading</Link></section>}
    {filteredItems.length > 0 && (
      <>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '28%' }}>Bài làm</th>
                <th style={{ width: '12%' }}>Ngày nộp</th>
                <th style={{ width: '10%' }}>Thời gian</th>
                <th style={{ width: '10%', textAlign: 'center' }}>Đã luyện</th>
                <th className={styles.correctTh} style={{ width: '8%' }}>Đạt</th>
                <th style={{ width: '8%', textAlign: 'center' }}>Chưa đạt</th>
                <th style={{ width: '8%', textAlign: 'center' }}>Bỏ qua</th>
                <th style={{ width: '8%', textAlign: 'center' }}>Điểm số</th>
                <th style={{ width: '8%', textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((snapshot) => {
                const label = describeSubmission(snapshot);
                const { correct: correctCount, wrong: failedCount, skipped: skippedCount, total } = summarizeSnapshot(snapshot);
                const practicedCount = correctCount + failedCount;

                return (
                  <tr key={snapshot.id}>
                    <td>
                      <Link href={`/history/${snapshot.id}`} className={styles.itemTitle}>
                        {label.title}
                      </Link>
                      <div className={styles.itemSub}>
                        <span
                          className={`${styles.skillPill} ${
                            snapshot.skill === 'reading'
                              ? styles.skillPillReading
                              : styles.skillPillListening
                          }`}
                        >
                          {label.skill}
                        </span>
                        <span>
                          · {label.scope} · {snapshot.mode === 'practice' ? 'Luyện tập' : 'Thi thật'}
                        </span>
                      </div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <time dateTime={snapshot.submitted_at} style={{ fontWeight: 500 }}>
                        {new Date(snapshot.submitted_at).toLocaleDateString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                        })}
                      </time>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                        {new Date(snapshot.submitted_at).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap', color: '#475569', fontSize: '13px' }}>
                      {formatElapsedTime(snapshot.time_spent_seconds)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontWeight: 700, color: '#0284c7' }}>{practicedCount}</span>
                      <span style={{ color: '#64748b' }}> / {total}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={styles.badgePassed}>{correctCount}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={styles.badgeFailed}>{failedCount}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={styles.badgeSkipped}>{skippedCount}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={styles.score}>
                        {snapshot.correct_marks}/{snapshot.total_marks}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                        <Link href={`/history/${snapshot.id}`} className={styles.reviewLink}>
                          Xem lại
                        </Link>
                        <button
                          type="button"
                          disabled={busy}
                          aria-label={`Xóa ${label.title}`}
                          className={styles.deleteBtn}
                          onClick={() => setDeleting(snapshot)}
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className={styles.mobileCards}>
          {filteredItems.map((snapshot) => {
            const label = describeSubmission(snapshot);
            const { correct: correctCount, wrong: failedCount, skipped: skippedCount, total } = summarizeSnapshot(snapshot);
            const practicedCount = correctCount + failedCount;

            return (
              <div key={snapshot.id} className={styles.mobileCard}>
                <div className={styles.mobileCardHeader}>
                  <div>
                    <Link href={`/history/${snapshot.id}`} className={styles.itemTitle}>
                      {label.title}
                    </Link>
                    <div className={styles.itemSub}>
                      <span
                        className={`${styles.skillPill} ${
                          snapshot.skill === 'reading'
                            ? styles.skillPillReading
                            : styles.skillPillListening
                        }`}
                      >
                        {label.skill}
                      </span>
                      <span>· {label.scope} · {formatElapsedTime(snapshot.time_spent_seconds)}</span>
                    </div>
                  </div>
                  <span className={styles.score}>
                    {snapshot.correct_marks}/{snapshot.total_marks}
                  </span>
                </div>

                <div className={styles.mobileStats}>
                  <div className={styles.mobileStatItem}>
                    <span className={styles.mobileStatLabel}>Đã luyện</span>
                    <span className={styles.mobileStatVal} style={{ color: '#0284c7' }}>
                      {practicedCount}/{total}
                    </span>
                  </div>
                  <div className={styles.mobileStatItem}>
                    <span className={styles.mobileStatLabel}>Đạt</span>
                    <span className={styles.mobileStatVal} style={{ color: '#15803d' }}>
                      {correctCount}
                    </span>
                  </div>
                  <div className={styles.mobileStatItem}>
                    <span className={styles.mobileStatLabel}>Chưa đạt</span>
                    <span className={styles.mobileStatVal} style={{ color: '#dc2626' }}>
                      {failedCount}
                    </span>
                  </div>
                  <div className={styles.mobileStatItem}>
                    <span className={styles.mobileStatLabel}>Bỏ qua</span>
                    <span className={styles.mobileStatVal} style={{ color: '#64748b' }}>
                      {skippedCount}
                    </span>
                  </div>
                </div>

                <div className={styles.mobileActions}>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    {new Date(snapshot.submitted_at).toLocaleDateString('vi-VN', {
                      day: '2-digit',
                      month: '2-digit',
                    })}{' '}
                    {new Date(snapshot.submitted_at).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Link href={`/history/${snapshot.id}`} className={styles.reviewLink}>
                      Xem lại
                    </Link>
                    <button
                      type="button"
                      disabled={busy}
                      aria-label={`Xóa ${label.title}`}
                      className={styles.deleteBtn}
                      onClick={() => setDeleting(snapshot)}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </>
    )}
    {cursor && (
      <div style={{ textAlign: 'center', marginTop: '16px' }}>
        <button type="button" disabled={busy} onClick={() => void load(cursor)}>
          Xem thêm
        </button>
      </div>
    )}
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="delete-title" aria-describedby="delete-description" onCancel={()=>setDeleting(null)}
      onKeyDown={event=>{
        if(event.key!=='Tab')return;
        const buttons=event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
        const first=buttons[0],last=buttons[buttons.length-1];
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
      }}>
      <h2 id="delete-title">Xóa bài làm?</h2><p id="delete-description">Bài này sẽ bị xóa khỏi trình duyệt. Hãy xuất file trước nếu bạn muốn giữ bản sao.</p>
      {error&&<p role="alert" className={styles.error}>{error}</p>}
      <div className={styles.actions}><button type="button" autoFocus disabled={busy} onClick={()=>setDeleting(null)}>Hủy</button><button type="button" disabled={busy} onClick={()=>void remove()}>Xóa bài</button></div>
    </dialog>
  </main>;
}
