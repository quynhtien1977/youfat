'use client';

import type { ReviewQuestion } from '@/types/reading-review';
import styles from './reading-review.module.css';

interface MatchingHeadingReviewProps {
  questions: ReviewQuestion[];
  openExplanations?: Set<number>;
  onToggleExplanation?: (order: number) => void;
  activeQuestionOrder?: number | null;
  onSelectQuestion?: (order: number) => void;
}

export function MatchingHeadingReview({
  questions,
}: MatchingHeadingReviewProps) {
  // Extract all heading options from the question set
  const allOptions = questions[0]?.content?.options ?? [];

  return (
    <div className={styles.headingReviewContainer}>
      <div className={styles.allHeadingsCard}>
        <div className={styles.allHeadingsTitle}>List of Headings</div>
        <div className={styles.allHeadingsList}>
          {allOptions.map((opt) => (
            <div key={opt.option} className={styles.headingOptionPill}>
              <span>{opt.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

