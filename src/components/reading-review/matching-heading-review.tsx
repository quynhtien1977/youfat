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
  // Extract all options from first question or combined
  const allOptions = questions[0]?.content?.options ?? [];
  const targetOptionsSet = new Set(
    questions.flatMap((q) => q.historical.correct_answers.map((a) => a.trim().toLowerCase()))
  );

  // Unused headings (headings that were not the answer to any paragraph)
  const unusedHeadings = allOptions.filter(
    (opt) => !targetOptionsSet.has(opt.option.trim().toLowerCase())
  );

  return (
    <div className={styles.headingReviewContainer}>
      {/* Unused Headings Card (Matching YouPass) */}
      {unusedHeadings.length > 0 && (
        <div className={styles.unusedHeadingsCard}>
          <div className={styles.unusedHeadingsTitle}>List of Headings</div>
          <div className={styles.unusedHeadingsList}>
            {unusedHeadings.map((opt) => (
              <div key={opt.option} className={styles.unusedHeadingItem}>
                <span>{opt.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

