'use client';

import { useMemo, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { ReviewQuestion } from '@/types/reading-review';
import { sanitizeReviewContentHtml, sanitizeReviewGapTemplate } from '@/lib/sanitizer';
import { LocationSpeechIcon } from './icons';
import styles from './reading-review.module.css';

interface GapFillingReviewProps {
  questions: ReviewQuestion[];
  templateHtml?: string | null;
  onSelectQuestion?: (order: number) => void;
  activeQuestionOrder?: number | null;
}

const QUESTION_ORDER_PATTERN = /(\d+)$/;

export function prepareReviewGapTemplate(source: string) {
  return sanitizeReviewGapTemplate(source);
}

export function GapFillingReview({
  questions,
  templateHtml,
  onSelectQuestion,
}: GapFillingReviewProps) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  const handleSpeechClick = (order: number) => {
    onSelectQuestion?.(order);
  };

  const parsedTemplate = useMemo(() => {
    return templateHtml ? prepareReviewGapTemplate(templateHtml) : null;
  }, [templateHtml]);

  const questionByOrder = useMemo(
    () => new Map(questions.map((q) => [q.historical.question_order, q])),
    [questions]
  );

  const attachContainer = useCallback((node: HTMLDivElement | null) => {
    setContainer(node);
  }, []);

  const targets = container
    ? Array.from(container.querySelectorAll<HTMLElement>('[data-question-id]'))
    : [];

  const hasPortalTemplate = Boolean(parsedTemplate && targets.length > 0);

  return (
    <div className={styles.gapFillingReviewContainer}>
      {parsedTemplate && (
        <div
          ref={attachContainer}
          className="yf-gap-template"
          dangerouslySetInnerHTML={{ __html: parsedTemplate }}
        />
      )}

      {/* Mount Portal for each gap in the template */}
      {container &&
        targets.map((targetEl) => {
          const rawId = targetEl.getAttribute('data-question-id') ?? '';
          const orderMatch = rawId.match(QUESTION_ORDER_PATTERN);
          const order = orderMatch ? Number(orderMatch[1]) : null;
          const q = order ? questionByOrder.get(order) : null;
          if (!q) return null;

          const userAns = Array.isArray(q.historical.user_answer)
            ? q.historical.user_answer.join(', ')
            : q.historical.user_answer;
          const targetAns = q.historical.correct_answers[0] || '';

          return createPortal(
            <span
              id={`q-${q.historical.question_order}`}
              className={styles.inlineReviewGap}
            >
              <span className={styles.gapPill}>{q.historical.question_order}</span>
              <span className={styles.gapUnderline}>
                {q.status === 'correct' ? (
                  <span className={styles.ansUserCorrect}>{userAns}</span>
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
              <button
                type="button"
                className={styles.speechBubbleBtn}
                title="Xem vị trí"
                aria-label={`Xem vị trí câu ${q.historical.question_order}`}
                onClick={() => handleSpeechClick(q.historical.question_order)}
              >
                <LocationSpeechIcon size={16} />
              </button>
            </span>,
            targetEl
          );
        })}

      {/* Fallback Question List when no HTML template is provided */}
      {!hasPortalTemplate && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {questions.map((q) => {
            const userAns = Array.isArray(q.historical.user_answer)
              ? q.historical.user_answer.join(', ')
              : q.historical.user_answer;
            const targetAns = q.historical.correct_answers[0] || '';
            const sanitizedPrompt = sanitizeReviewContentHtml(
              q.content?.prompt || `Câu hỏi ${q.historical.question_order}`
            );

            return (
              <div
                key={q.historical.question_id}
                id={`q-${q.historical.question_order}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.35rem 0',
                  gap: '1rem',
                  fontSize: '0.9375rem',
                }}
              >
                <div
                  style={{ flex: 1, color: '#1f2937' }}
                  dangerouslySetInnerHTML={{ __html: sanitizedPrompt }}
                />

                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                  <span className={styles.gapPill}>{q.historical.question_order}</span>
                  <span className={styles.gapUnderline}>
                    {q.status === 'correct' ? (
                      <span className={styles.ansUserCorrect}>{userAns}</span>
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
                  <button
                    type="button"
                    className={styles.speechBubbleBtn}
                    title="Xem vị trí"
                    aria-label={`Xem vị trí câu ${q.historical.question_order}`}
                    onClick={() => handleSpeechClick(q.historical.question_order)}
                  >
                    <LocationSpeechIcon size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
