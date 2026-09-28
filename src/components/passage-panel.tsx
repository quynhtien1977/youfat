"use client";

import { Question } from "@/types/database";
import { QuestionGradingResult } from "@/lib/gradingEngine";

// ============================================================
// PassagePanel – left pane, YouPass style
// Supports rendering interactive heading drop slots for MATCHING_HEADING
// ============================================================

interface PassagePanelProps {
  section: {
    title: string;
    section_title?: string | null;
    passage_text?: string | null;
  };
  questions?: Question[];
  answers?: Record<string, string | string[]>;
  onAnswer?: (questionId: string, val: string) => void;
  submitted?: boolean;
  results?: Record<string, QuestionGradingResult>;
}

export function PassagePanel({
  section,
  questions = [],
  answers = {},
  onAnswer,
  submitted = false,
  results = {},
}: PassagePanelProps) {
  const text = section.passage_text ?? "";
  const paragraphs = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  // Map of MATCHING_HEADING questions keyed by question_order
  const headingQuestionsByOrder = new Map<number, Question>();
  for (const q of questions) {
    if (q.type === "MATCHING_HEADING") {
      headingQuestionsByOrder.set(q.question_order, q);
    }
  }

  // Collect all unique options across heading questions for the fallback selector
  const headingOptionsMap = new Map<string, string>();
  for (const q of headingQuestionsByOrder.values()) {
    if (q.options) {
      for (const opt of q.options) {
        if (!headingOptionsMap.has(opt.option)) {
          headingOptionsMap.set(opt.option, opt.text);
        }
      }
    }
  }
  const headingOptions = Array.from(headingOptionsMap.entries()).map(
    ([option, text]) => ({ option, text })
  );

  return (
    <div className="yf-passage-panel">
      <h2 className="yf-passage-title">
        {section.section_title ?? section.title}
      </h2>

      <div className="yf-passage-text">
        {paragraphs.length > 0 ? (
          paragraphs.map((para, i) => {
            // Check if paragraph is solely a number that corresponds to a MATCHING_HEADING question
            const numMatch = para.match(/^(\d+)$/);
            const orderNum = numMatch ? Number(numMatch[1]) : null;
            const headingQ = orderNum ? headingQuestionsByOrder.get(orderNum) : null;

            if (headingQ) {
              const currentAns = (answers[headingQ.id] as string) || "";
              const result = results[headingQ.id];
              const isCorrect = result?.isCorrect;
              const targetAns = headingQ.answer?.[0] || "";
              const headingText = headingOptionsMap.get(currentAns) || currentAns;

              return (
                <div
                  key={`heading-slot-${orderNum}`}
                  id={`q-${orderNum}`}
                  data-heading-id={`heading-${orderNum}`}
                  className={`yf-passage-heading-slot${
                    currentAns ? " has-value" : ""
                  }${
                    submitted
                      ? isCorrect
                        ? " is-correct"
                        : " is-incorrect"
                      : ""
                  }`}
                  onDragOver={(e) => {
                    if (!submitted) e.preventDefault();
                  }}
                  onDrop={(e) => {
                    if (submitted || !onAnswer) return;
                    e.preventDefault();
                    const val = e.dataTransfer.getData("text/plain");
                    if (val) onAnswer(headingQ.id, val);
                  }}
                >
                  <div className="yf-passage-heading-pill">
                    <span className="yf-passage-heading-order">{orderNum}</span>
                    {currentAns ? (
                      <div className="yf-passage-heading-content">
                        <span className="yf-passage-heading-opt">
                          {currentAns}.
                        </span>
                        <span className="yf-passage-heading-text">
                          {headingText}
                        </span>
                        {!submitted && onAnswer && (
                          <button
                            type="button"
                            className="yf-passage-heading-remove"
                            onClick={() => onAnswer(headingQ.id, "")}
                            title="Xóa lựa chọn"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="yf-passage-heading-empty">
                        <span className="yf-passage-heading-hint">
                          Kéo heading vào đây hoặc chọn:
                        </span>
                        <select
                          value=""
                          disabled={submitted}
                          onChange={(e) =>
                            onAnswer && onAnswer(headingQ.id, e.target.value)
                          }
                          className="yf-passage-heading-select"
                        >
                          <option value="">— Chọn heading —</option>
                          {headingOptions.map((opt) => (
                            <option key={opt.option} value={opt.option}>
                              {opt.option}. {opt.text}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {submitted && (
                    <div
                      className={`yf-passage-heading-feedback ${
                        isCorrect ? "correct" : "incorrect"
                      }`}
                    >
                      {isCorrect ? (
                        <span>✓ Đúng</span>
                      ) : (
                        <span>
                          ✕ Sai - Đáp án: <strong>{targetAns}</strong>
                          {headingOptionsMap.get(targetAns)
                            ? ` (${headingOptionsMap.get(targetAns)})`
                            : ""}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            }

            return <p key={i}>{para}</p>;
          })
        ) : (
          <div className="yf-passage-empty">
            <div className="yf-passage-empty-icon">📄</div>
            <div className="yf-passage-empty-title">
              Bài đọc chưa được nhập vào hệ thống
            </div>
            <p className="yf-passage-empty-desc">
              Nội dung passage đang được cập nhật. Bạn vẫn có thể làm câu
              hỏi ở bên phải và tự chấm điểm sau khi nộp bài.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
