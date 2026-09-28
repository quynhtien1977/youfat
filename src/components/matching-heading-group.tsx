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

      {/* ── Question review and explanations (only shown after submit) ── */}
      {submitted && (
        <div className="yf-heading-review-box mt-6 border-t pt-4">
          <div className="yf-heading-review-title font-bold text-sm text-gray-700 mb-3">
            Giải thích chi tiết Matching Headings:
          </div>
          <div className="space-y-3">
            {questions.map((q) => {
              const currentAns = (answers[q.id] as string) || "";
              const result = results[q.id];
              const isCorrect = result?.isCorrect;
              const targetAns = q.answer?.[0] || "";
              const targetText = optionMap.get(targetAns) || "";

              return (
                <div
                  key={q.id}
                  className={`p-3 rounded-lg border text-sm ${
                    isCorrect
                      ? "border-emerald-200 bg-emerald-50/50"
                      : "border-rose-200 bg-rose-50/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-gray-800">
                      Câu {q.question_order}: {q.prompt?.replace(/<[^>]+>/g, "")}
                    </span>
                    <span
                      className={`font-bold ${
                        isCorrect ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {isCorrect ? (
                        "✓ Đúng"
                      ) : (
                        <span>
                          ✕ Sai {currentAns ? `(Bạn chọn: ${currentAns}) • ` : ""}Đáp án: <strong>{targetAns}</strong>
                          {targetText ? ` - ${targetText}` : ""}
                        </span>
                      )}
                    </span>
                  </div>
                  {q.explanation && (
                    <div
                      className="text-xs text-gray-600 mt-2 bg-white/70 p-2 rounded border border-gray-100"
                      dangerouslySetInnerHTML={{ __html: q.explanation }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
