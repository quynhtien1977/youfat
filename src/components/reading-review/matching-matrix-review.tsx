'use client';

import { Fragment } from 'react';
import type { ReviewQuestion } from '@/types/reading-review';
import { LocationSpeechIcon } from './icons';
import styles from './reading-review.module.css';

interface MatchingMatrixReviewProps {
  questions: ReviewQuestion[];
  onSelectQuestion?: (order: number) => void;
  activeQuestionOrder?: number | null;
}

export function MatchingMatrixReview({
  questions,
  onSelectQuestion,
}: MatchingMatrixReviewProps) {

  // Determine all unique column options
  const allOptionKeys: string[] = [];
  const seenKeys = new Set<string>();

  for (const q of questions) {
    const opts = q.content?.options ?? [];
    for (const opt of opts) {
      const k = opt.option.trim().toUpperCase();
      if (!seenKeys.has(k)) {
        seenKeys.add(k);
        allOptionKeys.push(k);
      }
    }
  }

  // Fallback if options list is empty in content
  if (allOptionKeys.length === 0) {
    allOptionKeys.push('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I');
  } else {
    // Sort columns alphabetically (A, B, C, D...) to match YouPass
    allOptionKeys.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }

  const handleSpeechClick = (order: number) => {
    onSelectQuestion?.(order);
  };

  return (
    <div className={styles.matrixReviewContainer}>
      <div className={styles.matrixTableWrapper}>
        <table className={styles.matrixTable}>
          <thead>
            <tr>
              <th className={styles.matrixPromptTh} aria-label="Nội dung câu hỏi" />
              {allOptionKeys.map((key) => (
                <th key={key} className={styles.matrixOptTh}>
                  {key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {questions.map((q) => {
              const order = q.historical.question_order;
              const userRaw = Array.isArray(q.historical.user_answer)
                ? q.historical.user_answer[0]
                : q.historical.user_answer;
              const userAns = userRaw ? userRaw.trim().toUpperCase() : '';
              const targetAns = q.historical.correct_answers[0]
                ? q.historical.correct_answers[0].trim().toUpperCase()
                : '';
              return (
                <Fragment key={q.historical.question_id}>
                  <tr
                    id={`q-${order}`}
                    className={`${styles.matrixRow} ${styles[q.status]}`}
                  >
                    <td className={styles.matrixPromptTd}>
                      <div className={styles.matrixPromptFlex}>
                        <span className={styles.matrixOrderPill}>{order}</span>
                        <span className={styles.matrixPromptText}>
                          {q.content?.prompt || `Câu hỏi ${order}`}
                        </span>
                        <button
                          type="button"
                          className={styles.speechBubbleBtn}
                          onClick={() => handleSpeechClick(order)}
                          title="Xem vị trí"
                          aria-label={`Xem vị trí câu ${order}`}
                        >
                          <LocationSpeechIcon size={16} />
                        </button>
                      </div>
                    </td>

                    {allOptionKeys.map((key) => {
                      const isSelected = userAns === key;
                      const isTarget = targetAns === key;

                      let cellStyle = styles.matrixCellNeutral;
                      let radioStyle = styles.matrixRadioNeutral;

                      if (isSelected && isTarget) {
                        cellStyle = styles.matrixCellCorrect;
                        radioStyle = styles.matrixRadioSelectedCorrect;
                      } else if (isSelected && !isTarget) {
                        cellStyle = styles.matrixCellWrong;
                        radioStyle = styles.matrixRadioSelectedWrong;
                      } else if (!isSelected && isTarget) {
                        cellStyle = styles.matrixCellTargetMissed;
                        radioStyle = styles.matrixRadioTargetMissed;
                      }

                      return (
                        <td
                          key={key}
                          className={`${styles.matrixOptTd} ${cellStyle}`}
                        >
                          <div
                            className={`${styles.matrixRadioCircle} ${radioStyle}`}
                            aria-hidden="true"
                          >
                            {(radioStyle === styles.matrixRadioSelectedCorrect ||
                              radioStyle === styles.matrixRadioSelectedWrong) && (
                              <div className={styles.matrixRadioDot} />
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
