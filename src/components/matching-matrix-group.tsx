"use client";

import { Question } from "@/types/database";
import { QuestionGradingResult } from "@/lib/gradingEngine";

interface MatchingMatrixGroupProps {
  questions: Question[];
  answers: Record<string, string | string[]>;
  onAnswer: (questionId: string, val: string) => void;
  submitted: boolean;
  results: Record<string, QuestionGradingResult>;
}

export function MatchingMatrixGroup({
  questions,
  answers,
  onAnswer,
  submitted,
  results,
}: MatchingMatrixGroupProps) {
  if (questions.length === 0) return null;

  // Extract all unique options in order across the questions in this group
  const optionMap = new Map<string, string>();
  for (const q of questions) {
    if (q.options && q.options.length > 0) {
      for (const opt of q.options) {
        if (!optionMap.has(opt.option)) {
          optionMap.set(opt.option, opt.text);
        }
      }
    }
  }

  // Fallback options if none provided
  if (optionMap.size === 0) {
    ["A", "B", "C", "D", "E", "F"].forEach((l) => optionMap.set(l, l));
  }

  const optionLetters = Array.from(optionMap.keys());

  // Determine if options have descriptive text (e.g. Matching Features / Sentence Endings)
  const hasDescriptiveOptions = Array.from(optionMap.entries()).some(
    ([opt, text]) => text && text.trim().toLowerCase() !== opt.trim().toLowerCase()
  );

  return (
    <div className="yf-matching-group-container">
      {/* ── Optional Legend Box for Named Features or Sentence Endings ── */}
      {hasDescriptiveOptions && (
        <div className="yf-matching-legend-box">
          <div className="yf-matching-legend-title">Danh sách lựa chọn:</div>
          <div className="yf-matching-legend-grid">
            {Array.from(optionMap.entries()).map(([letter, text]) => (
              <div key={letter} className="yf-matching-legend-item">
                <span className="yf-matching-legend-badge">{letter}</span>
                <span
                  className="yf-matching-legend-text"
                  dangerouslySetInnerHTML={{ __html: text }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── YouPass-style Matrix Table ── */}
      <div className="yf-matching-matrix-wrapper">
        <table className="yf-matching-matrix-table">
          <thead>
            <tr>
              <th className="yf-matching-th-prompt"></th>
              {optionLetters.map((letter) => (
                <th key={letter} className="yf-matching-th-col">
                  {letter}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {questions.map((q) => {
              const currentAns = (answers[q.id] as string) || "";
              const result = results[q.id];
              const isCorrect = result?.isCorrect;
              const targetAns = q.answer?.[0] || "";

              return (
                <tr
                  key={q.id}
                  id={`q-${q.question_order}`}
                  className={`yf-matching-matrix-row${
                    submitted
                      ? isCorrect
                        ? " is-row-correct"
                        : " is-row-incorrect"
                      : ""
                  }`}
                >
                  <td className="yf-matching-td-prompt">
                    <div className="yf-matching-prompt-flex">
                      <span className="yf-q-order">{q.question_order}</span>
                      <div
                        className="yf-matching-prompt-text"
                        dangerouslySetInnerHTML={{ __html: q.prompt }}
                      />
                    </div>
                    {submitted && !isCorrect && targetAns && (
                      <div className="yf-matching-row-feedback">
                        <span className="yf-matching-feedback-icon">✕</span>
                        <span className="yf-matching-feedback-text">
                          Đáp án đúng: <strong>{targetAns}</strong>
                          {optionMap.get(targetAns) &&
                            optionMap.get(targetAns) !== targetAns && (
                              <span> ({optionMap.get(targetAns)})</span>
                            )}
                        </span>
                      </div>
                    )}
                    {submitted && isCorrect && (
                      <div className="yf-matching-row-feedback is-correct">
                        <span className="yf-matching-feedback-icon">✓</span>
                        <span className="yf-matching-feedback-text">Chính xác</span>
                      </div>
                    )}
                  </td>

                  {optionLetters.map((letter) => {
                    const isChecked = currentAns === letter;
                    const isTarget = targetAns === letter;

                    let cellCls = "yf-matching-td-radio";
                    if (submitted) {
                      if (isChecked && isCorrect) cellCls += " is-cell-correct";
                      else if (isChecked && !isCorrect) cellCls += " is-cell-incorrect";
                      else if (isTarget) cellCls += " is-cell-target";
                    }

                    return (
                      <td
                        key={letter}
                        className={cellCls}
                        onClick={() => !submitted && onAnswer(q.id, letter)}
                      >
                        <div className="yf-matching-radio-wrap">
                          <input
                            type="radio"
                            name={`matching-${q.id}`}
                            value={letter}
                            checked={isChecked}
                            disabled={submitted}
                            onChange={() => onAnswer(q.id, letter)}
                            className="yf-matching-radio-input"
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
