"use client";

import { Question } from "@/types/database";
import { QuestionGradingResult } from "@/lib/gradingEngine";

interface MatchingHeadingGroupProps {
  questions: Question[];
  answers: Record<string, string | string[]>;
  onAnswer: (questionId: string, val: string) => void;
  submitted: boolean;
  results: Record<string, QuestionGradingResult>;
}

export function MatchingHeadingGroup({
  questions,
  answers,
  onAnswer,
  submitted,
  results,
}: MatchingHeadingGroupProps) {
  if (questions.length === 0) return null;

  // Collect all unique heading options
  const optionMap = new Map<string, string>();
  for (const q of questions) {
    if (q.options) {
      for (const opt of q.options) {
        if (!optionMap.has(opt.option)) {
          optionMap.set(opt.option, opt.text);
        }
      }
    }
  }

  const options = Array.from(optionMap.entries()).map(([option, text]) => ({
    option,
    text,
  }));

  // Set of currently chosen option values
  const usedOptions = new Set(
    questions.map((q) => answers[q.id] as string).filter(Boolean)
  );

  return (
    <div className="yf-heading-group-container">
      {/* ── Draggable Heading Pills (YouPass style) ── */}
      <div className="yf-heading-pills-box">
        <div className="yf-heading-pills-title">
          Danh sách tiêu đề (Kéo thả hoặc chọn vào ô tương ứng):
        </div>
        <div className="yf-heading-pills-list">
          {options.map((opt) => {
            const isUsed = usedOptions.has(opt.option);
            return (
              <div
                key={opt.option}
                draggable={!submitted}
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", opt.option);
                  e.dataTransfer.setData("application/json", JSON.stringify(opt));
                }}
                className={`yf-heading-pill${isUsed ? " is-used" : ""}`}
                title={isUsed ? "Đã được sử dụng" : "Kéo hoặc chọn heading này"}
              >
                <span className="yf-heading-pill-badge">{opt.option}</span>
                <span className="yf-heading-pill-text">{opt.text}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Question rows for each paragraph ── */}
      <div className="yf-heading-questions-list">
        {questions.map((q) => {
          const currentAns = (answers[q.id] as string) || "";
          const result = results[q.id];
          const isCorrect = result?.isCorrect;
          const targetAns = q.answer?.[0] || "";

          return (
            <div
              key={q.id}
              id={`q-${q.question_order}`}
              className={`yf-heading-q-card${
                submitted
                  ? isCorrect
                    ? " is-correct"
                    : " is-incorrect"
                  : ""
              }`}
            >
              <div className="yf-heading-q-header">
                <span className="yf-q-order">{q.question_order}</span>
                <span
                  className="yf-heading-q-prompt"
                  dangerouslySetInnerHTML={{ __html: q.prompt }}
                />
              </div>

              <div className="yf-heading-q-select-wrap">
                <select
                  value={currentAns}
                  disabled={submitted}
                  onChange={(e) => onAnswer(q.id, e.target.value)}
                  className={`yf-heading-q-select${
                    currentAns ? " has-value" : ""
                  }`}
                >
                  <option value="">— Chọn heading cho đoạn này —</option>
                  {options.map((opt) => (
                    <option key={opt.option} value={opt.option}>
                      {opt.option}. {opt.text}
                    </option>
                  ))}
                </select>

                {currentAns && !submitted && (
                  <button
                    type="button"
                    className="yf-heading-q-clear-btn"
                    onClick={() => onAnswer(q.id, "")}
                    title="Xóa lựa chọn"
                  >
                    ×
                  </button>
                )}
              </div>

              {submitted && (
                <div
                  className={`yf-q-feedback ${
                    isCorrect ? "correct" : "incorrect"
                  }`}
                >
                  {isCorrect ? (
                    <span>✓ Đúng</span>
                  ) : (
                    <span>
                      ✕ Sai. Đáp án đúng: <strong>{targetAns}</strong>
                      {optionMap.get(targetAns)
                        ? ` (${optionMap.get(targetAns)})`
                        : ""}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
