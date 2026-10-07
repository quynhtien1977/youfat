'use client';

import { useMemo, useState } from 'react';
import type { ReviewStatus } from '@/types/reading-review';
import { sanitizeExplanationHtml } from '@/lib/sanitizer';
import styles from './reading-review.module.css';

interface ExplanationBoxProps {
  explanationHtml?: string | null;
  status: ReviewStatus;
  questionOrder: number;
  isOpen?: boolean;
  onToggle?: () => void;
  initiallyOpen?: boolean;
}

export function ExplanationBox({
  explanationHtml,
  status,
  questionOrder,
  isOpen,
  onToggle,
  initiallyOpen = true,
}: ExplanationBoxProps) {
  const [internalOpen, setInternalOpen] = useState(initiallyOpen);
  const open = isOpen !== undefined ? isOpen : internalOpen;

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalOpen((prev) => !prev);
    }
  };

  const sanitized = useMemo(
    () => sanitizeExplanationHtml(explanationHtml),
    [explanationHtml]
  );

  if (!explanationHtml) {
    return (
      <div className={`${styles.explanationDrawer} ${styles[status]}`}>
        <div className={styles.explanationHeader}>
          <span className={styles.explanationTitle}>
            Câu {questionOrder} — Giải thích đáp án
          </span>
        </div>
        <p className={styles.noExplanation}>Chưa có lời giải cho câu hỏi này.</p>
      </div>
    );
  }

  return (
    <div className={`${styles.explanationDrawer} ${styles[status]}`}>
      <button
        type="button"
        className={styles.explanationHeader}
        onClick={handleToggle}
        aria-expanded={open}
      >
        <span className={styles.explanationTitle}>
          Câu {questionOrder} — Giải thích đáp án
        </span>
        <span className={styles.toggleIcon}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div
          className={styles.explanationContent}
          dangerouslySetInnerHTML={{ __html: sanitized }}
        />
      )}
    </div>
  );
}
