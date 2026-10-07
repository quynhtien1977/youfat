'use client';

import type { ReviewQuestion } from '@/types/reading-review';
import { LocationSpeechIcon } from './icons';
import styles from './reading-review.module.css';

interface ReviewItemFallbackProps {
  question: ReviewQuestion;
  onSelectQuestion?: (order: number) => void;
  activeQuestionOrder?: number | null;
}

export function ReviewItemFallback({
  question: q,
  onSelectQuestion,
}: ReviewItemFallbackProps) {
  const userAns = Array.isArray(q.historical.user_answer)
    ? q.historical.user_answer.join(', ')
    : q.historical.user_answer;
  const targetAns = q.historical.correct_answers.join(' / ');

  const handleSpeechClick = () => {
    onSelectQuestion?.(q.historical.question_order);
  };

  return (
    <div
      id={`q-${q.historical.question_order}`}
      className={`${styles.reviewItem} ${styles[q.status]}`}
    >
      <div className={styles.itemHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className={`${styles.orderBadge} ${styles[q.status]}`}>
            {q.historical.question_order}
          </span>
          <span className={styles.itemPrompt}>
            {q.content?.prompt || `Câu hỏi ${q.historical.question_order}`}
          </span>
        </div>

        <button
          type="button"
          className={styles.speechBubbleBtn}
          title="Xem vị trí & giải thích"
          aria-label={`Xem vị trí câu ${q.historical.question_order}`}
          onClick={handleSpeechClick}
        >
          <LocationSpeechIcon size={18} />
        </button>
      </div>

      {/* Options if available */}
      {q.content?.options && q.content.options.length > 0 && (
        <div className={styles.optionsList}>
          {q.content.options.map((opt) => (
            <div key={opt.option} className={styles.optionRow}>
              <strong>{opt.option}.</strong> <span>{opt.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Answer feedback row */}
      <div className={styles.inlineReviewGap} style={{ marginTop: '0.5rem', alignSelf: 'flex-start' }}>
        <span className={styles.gapPill}>{q.historical.question_order}</span>
        <span className={styles.gapAnswerText}>
          {q.status === 'correct' ? (
            <span className={styles.ansUserCorrect}>{userAns || targetAns}</span>
          ) : q.status === 'skipped' ? (
            <>
              <span className={styles.ansSkippedMark}>✕</span>
              <span className={styles.ansArrow}>→</span>
              <span className={styles.ansTarget}>{targetAns}</span>
            </>
          ) : (
            <>
              <span className={styles.ansUserWrong}>{userAns || 'Chưa điền'}</span>
              <span className={styles.ansArrow}>→</span>
              <span className={styles.ansTarget}>{targetAns}</span>
            </>
          )}
        </span>
      </div>
    </div>
  );
}
