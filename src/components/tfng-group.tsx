"use client";

import { Question } from "@/types/database";
import { QuestionGradingResult } from "@/lib/gradingEngine";
import { ChevronDown } from "lucide-react";

interface TfngGroupProps {
  questions: Question[];
  answers: Record<string, string | string[]>;
  onAnswer: (questionId: string, val: string) => void;
  submitted: boolean;
  results: Record<string, QuestionGradingResult>;
}

export function TfngGroup({
  questions,
  answers,
  onAnswer,
  submitted,
  results,
}: TfngGroupProps) {
  if (questions.length === 0) return null;

  return (
    <div className="yf-tfng-group">
      {questions.map((q) => {
        const currentVal = (answers[q.id] as string) || "";
        const result = results[q.id];
        const isCorrect = result?.isCorrect ?? false;
        const targetAns = q.answer?.[0] || "";

        // Determine options: TRUE/FALSE/NOT GIVEN or YES/NO/NOT GIVEN
        const rawOptions =
          q.options && q.options.length > 0
            ? q.options.map((o) => o.option)
            : q.type === "YES_NO"
            ? ["YES", "NO", "NOT GIVEN"]
            : ["TRUE", "FALSE", "NOT GIVEN"];

        // Dedup and normalize options
        const options = Array.from(new Set(rawOptions));

        return (
          <div
            key={q.id}
            id={`q-${q.question_order}`}
            className={`yf-tfng-row${
              submitted
                ? isCorrect
                  ? " is-correct"
                  : " is-incorrect"
                : ""
            }`}
          >
            <div className="yf-tfng-main">
              {/* Question order badge */}
              <span className="yf-q-order">{q.question_order}</span>

              {/* YouPass exact 120px dropdown */}
              <div className="yf-tfng-select-container">
                <div
                  className={`yf-tfng-select-box${
                    currentVal ? " has-value" : ""
                  }${
                    submitted
                      ? isCorrect
                        ? " select-correct"
                        : " select-incorrect"
                      : ""
                  }`}
                >
                  <select
                    value={currentVal}
                    disabled={submitted}
                    onChange={(e) => onAnswer(q.id, e.target.value)}
                    className="yf-tfng-native-select"
                  >
                    <option value="">— Chọn —</option>
                    {options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <span className="yf-tfng-display-value">
                    {currentVal || ""}
                  </span>
                  <ChevronDown size={18} className="yf-tfng-chevron" />
                </div>
              </div>

              {/* Statement text */}
              <div
                className="yf-tfng-prompt"
                dangerouslySetInnerHTML={{ __html: q.prompt }}
              />
            </div>

            {/* Post-submit feedback */}
            {submitted && (
              <div className="yf-tfng-feedback-wrap">
                {isCorrect ? (
                  <span className="yf-tfng-badge correct">✓ Đúng</span>
                ) : (
                  <span className="yf-tfng-badge incorrect">
                    ✕ Sai. Đáp án đúng: <strong>{targetAns}</strong>
                  </span>
                )}
                {result?.explanation && (
                  <div
                    className="yf-tfng-explanation html-content"
                    dangerouslySetInnerHTML={{ __html: result.explanation }}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
