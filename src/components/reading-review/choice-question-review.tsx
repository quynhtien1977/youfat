'use client';

import type { ReviewQuestion } from '@/types/reading-review';
import { LocationSpeechIcon } from './icons';
import styles from './reading-review.module.css';

interface ChoiceQuestionReviewProps {
  question: ReviewQuestion;
  onSelectQuestion?: (order: number) => void;
  activeQuestionOrder?: number | null;
}

const DEFAULT_TF_OPTIONS = [
  { option: 'TRUE', text: 'TRUE' },
  { option: 'FALSE', text: 'FALSE' },
  { option: 'NOT GIVEN', text: 'NOT GIVEN' },
];

const DEFAULT_YN_OPTIONS = [
  { option: 'YES', text: 'YES' },
  { option: 'NO', text: 'NO' },
  { option: 'NOT GIVEN', text: 'NOT GIVEN' },
];

function normalizeValues(val: string | string[] | null | undefined): string[] {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.map((v) => v.trim().toUpperCase()).filter(Boolean);
  }
  if (typeof val === 'string') {
    return val.split(/[,;\s]+/).map((v) => v.trim().toUpperCase()).filter(Boolean);
  }
  return [];
}

export function ChoiceQuestionReview({
  question: q,
  onSelectQuestion,
}: ChoiceQuestionReviewProps) {
  const type = q.historical.question_type;
  const isMultipleMany = type === 'MULTIPLE_CHOICE_MANY';
  const isTfNg = type === 'TRUE_FALSE';
  const isYnNg = type === 'YES_NO';

  // Resolve options list
  let options = q.content?.options;
  if (!options || options.length === 0) {
    if (isTfNg) {
      options = DEFAULT_TF_OPTIONS;
    } else if (isYnNg) {
      options = DEFAULT_YN_OPTIONS;
    } else {
      options = [];
    }
  }

  // Sort options consistently: TF/NG, YN/NG, or alphabetical
  const sortedOptions = [...options].sort((a, b) => {
    if (isTfNg) {
      const orderMap: Record<string, number> = { TRUE: 1, FALSE: 2, 'NOT GIVEN': 3 };
      const aRank = orderMap[a.option.trim().toUpperCase()] ?? 99;
      const bRank = orderMap[b.option.trim().toUpperCase()] ?? 99;
      return aRank - bRank;
    }
    if (isYnNg) {
      const orderMap: Record<string, number> = { YES: 1, NO: 2, 'NOT GIVEN': 3 };
      const aRank = orderMap[a.option.trim().toUpperCase()] ?? 99;
      const bRank = orderMap[b.option.trim().toUpperCase()] ?? 99;
      return aRank - bRank;
    }
    return a.option.localeCompare(b.option, undefined, { numeric: true });
  });

  const userSelections = normalizeValues(q.historical.user_answer);
  const correctTargets = normalizeValues(q.historical.correct_answers);

  // Question number pill display
  const order = q.historical.question_order;
  const isMultiMark = isMultipleMany && (q.historical.max_marks > 1 || correctTargets.length > 1);

  const handleSpeechClick = (targetOrder?: number) => {
    onSelectQuestion?.(targetOrder ?? order);
  };

  return (
    <div
      id={`q-${order}`}
      className={`${styles.choiceQuestionCard} ${styles[q.status]}`}
    >
      {/* Header */}
      <div className={styles.choiceHeader}>
        <div className={styles.choiceOrderPill}>
          {isMultiMark ? (
            <span className={styles.multiOrderPill}>
              <span>{order}</span>
              <span className={styles.pillDash}>-</span>
              <span>{order + Math.max(1, correctTargets.length) - 1}</span>
            </span>
          ) : (
            <span>{order}</span>
          )}
        </div>
        <div className={styles.choicePrompt}>
          {q.content?.prompt || `Câu hỏi ${order}`}
        </div>
      </div>

      {/* Options */}
      <div className={styles.choiceOptionsList} role="group" aria-label={`Lựa chọn câu ${order}`}>
        {sortedOptions.map((opt) => {
          const optKey = opt.option.trim().toUpperCase();
          const isSelected = userSelections.includes(optKey);
          const isCorrectTarget = correctTargets.includes(optKey);
          const targetIdx = isMultiMark ? correctTargets.indexOf(optKey) : 0;
          const targetOrder = isMultiMark && targetIdx >= 0 ? order + targetIdx : order;

          let textStyle = '';
          let indicatorState: 'selected-correct' | 'selected-wrong' | 'target-missed' | 'neutral' = 'neutral';

          if (isSelected && isCorrectTarget) {
            textStyle = styles.optionTextCorrectPicked;
            indicatorState = 'selected-correct';
          } else if (isSelected && !isCorrectTarget) {
            textStyle = styles.optionTextWrong;
            indicatorState = 'selected-wrong';
          } else if (!isSelected && isCorrectTarget) {
            textStyle = styles.optionTextCorrectMissed;
            indicatorState = 'target-missed';
          }

          const hasLetter = !isTfNg && !isYnNg && !isMultipleMany && opt.option.length <= 2;

          return (
            <div
              key={opt.option}
              className={styles.choiceOptionRow}
            >
              <div className={styles.optionLeft}>
                {hasLetter && (
                  <span className={styles.optionLetterBadge}>{opt.option}</span>
                )}

                {/* Radio or Checkbox */}
                {isMultipleMany ? (
                  <div
                    className={`${styles.choiceCheckbox} ${styles[`cb-${indicatorState}`]}`}
                    aria-hidden="true"
                  >
                    {indicatorState === 'selected-correct' && '✓'}
                    {indicatorState === 'selected-wrong' && '✕'}
                  </div>
                ) : (
                  <div
                    className={`${styles.choiceRadio} ${styles[`radio-${indicatorState}`]}`}
                    aria-hidden="true"
                  >
                    {(indicatorState === 'selected-correct' || indicatorState === 'selected-wrong') && (
                      <div className={styles.radioDot} />
                    )}
                  </div>
                )}

                <span className={`${styles.optionText} ${textStyle}`}>{opt.text}</span>
              </div>

              {/* Speech bubble icon for correct targets */}
              {isCorrectTarget && (
                <button
                  type="button"
                  className={styles.speechBubbleBtn}
                  onClick={() => handleSpeechClick(targetOrder)}
                  title="Xem vị trí"
                  aria-label={`Xem vị trí câu ${targetOrder}`}
                >
                  <LocationSpeechIcon size={18} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
