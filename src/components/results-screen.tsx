'use client';

import type { ReactNode } from 'react';
import type { ExamGradingSummary, Question, SkillType, SubmissionSnapshot } from '@/types/database';
import { summarizeResults, summarizeSnapshot } from '@/lib/result-statistics';
import styles from './results-screen.module.css';

type ResultsScreenProps = ({snapshot:SubmissionSnapshot; questions?:never;summary?:never;skill?:never;elapsedSeconds?:never}
  | {snapshot?:never;questions:Question[];summary:ExamGradingSummary;skill:SkillType;elapsedSeconds:number})
  & {onReview?:()=>void; feedback?:ReactNode; reviewButtonLabel?: string};
export function ResultsScreen(props: ResultsScreenProps) {
  const {onReview, feedback, reviewButtonLabel} = props;
  const stats = props.snapshot ? summarizeSnapshot(props.snapshot) : summarizeResults(props.questions, props.summary, props.skill);
  const elapsedSeconds = props.snapshot ? props.snapshot.time_spent_seconds : props.elapsedSeconds;
  const circumference = 2 * Math.PI * 95;
  const correctLength = stats.total ? stats.correct / stats.total * circumference : 0;
  const wrongLength = stats.total ? stats.wrong / stats.total * circumference : 0;
  const duration = `${String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')}:${String(elapsedSeconds % 60).padStart(2, '0')}`;
  return (
    <main className={styles.page} aria-label="Kết quả làm bài">
      <div className={styles.container}>
        <section className={styles.scoreCard}>
          <header className={styles.header}>
            <h2>Kết quả làm bài</h2>
            <div><span>Thời gian làm bài</span><time>{duration}</time></div>
          </header>
          <div className={styles.brand}>YouFat</div>
          <div className={styles.summary}>
            <div className={styles.chart} role="img" aria-label={`${stats.correct}/${stats.total} câu đúng; ${stats.wrong} sai; ${stats.skipped} bỏ qua`}>
              <svg viewBox="0 0 210 210" aria-hidden="true">
                <circle cx="105" cy="105" r="95" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                <g transform="rotate(-90 105 105)" fill="none" strokeWidth="10">
                  <circle cx="105" cy="105" r="95" stroke="#22c55e" strokeDasharray={`${correctLength} ${circumference}`} />
                  <circle cx="105" cy="105" r="95" stroke="#ef4444" strokeDasharray={`${wrongLength} ${circumference}`} strokeDashoffset={-correctLength} />
                </g>
              </svg>
              <div className={styles.chartLabel}><strong>{stats.correct}/{stats.total}</strong><span>câu đúng</span></div>
            </div>
            <dl className={styles.legend}>
              <div><dt><i className={styles.correct} />Đúng:</dt><dd>{stats.correct} câu</dd></div>
              <div><dt><i className={styles.wrong} />Sai:</dt><dd>{stats.wrong} câu</dd></div>
              <div><dt><i className={styles.skipped} />Bỏ qua:</dt><dd>{stats.skipped} câu</dd></div>
            </dl>
          </div>
          {onReview && <div className={styles.actions}><button type="button" onClick={onReview}>{reviewButtonLabel || 'Xem giải thích'} <span>FREE</span></button></div>}
        </section>
        <section className={styles.details} aria-labelledby="results-details-title">
          <h2 id="results-details-title">Bảng dữ liệu chi tiết</h2>
          <div className={styles.tableScroll}>
            <table>
              <thead><tr><th scope="col">Loại câu hỏi</th><th scope="col">Số câu hỏi</th><th scope="col" className={styles.correctHeader}>Đúng</th><th scope="col">Sai</th><th scope="col">Bỏ qua</th></tr></thead>
              <tbody>{stats.rows.map(row => (
                <tr key={row.key}><th scope="row">{row.label}</th><td>{row.total}</td>
                  <td><span className={`${styles.badge} ${styles.correctBadge}`}>{row.correct}</span></td>
                  <td><span className={`${styles.badge} ${styles.wrongBadge}`}>{row.wrong}</span></td>
                  <td><span className={styles.badge}>{row.skipped}</span></td></tr>
              ))}</tbody>
            </table>
          </div>
        </section>
        {feedback}
      </div>
    </main>
  );
}
