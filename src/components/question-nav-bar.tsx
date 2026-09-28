"use client";

import { Question } from "@/types/database";
import { QuestionGradingResult } from "@/lib/gradingEngine";

// ============================================================
// QuestionNavBar – pill nav + submit, YouPass style
// fixed bottom of the right (questions) panel
// ============================================================

interface QuestionNavBarProps {
  questions: Question[];
  answers: Record<string, string | string[]>;
  activeId: string | null;
  onPillClick: (questionOrder: number) => void;
  onSubmit: () => void;
  submitted: boolean;
  results?: Record<string, QuestionGradingResult>;
  /** true = Listening mode (full width), false = Reading mode (right 50%) */
  fullWidth?: boolean;
}


export function QuestionNavBar({
  questions,
  answers,
  activeId,
  onPillClick,
  onSubmit,
  submitted,
  results = {},
  fullWidth = false,
}: QuestionNavBarProps) {
  return (
    <div
      className="yf-navbar"
      style={fullWidth ? { width: "100%", left: 0, right: 0 } : undefined}
    >
      {questions.flatMap((q) => {
        const isMultiMany =
          q.type === "MULTIPLE_CHOICE_MANY" && q.answer && q.answer.length > 1;
        const count = isMultiMany ? q.answer.length : 1;
        const userAns = answers[q.id];
        const userList = Array.isArray(userAns)
          ? userAns
          : typeof userAns === "string" && userAns
          ? [userAns]
          : [];
        const correctList = q.answer || [];
        const matched = userList.filter((a) => correctList.includes(a)).length;
        const result = results[q.id];
        const active = activeId === q.id;

        return Array.from({ length: count }, (_, idx) => {
          const pillOrder = q.question_order + idx;
          const answered = userList.length > idx;

          let cls = "yf-navpill";
          if (submitted && result) {
            const isPointCorrect = matched > idx;
            cls += isPointCorrect ? " correct-pill" : " incorrect-pill";
          } else if (answered) {
            cls += " answered";
          }
          if (active) cls += " current";

          return (
            <button
              key={`${q.id}-${pillOrder}`}
              className={cls}
              onClick={() => onPillClick(q.question_order)}
              type="button"
              title={`Câu ${pillOrder}`}
            >
              {pillOrder}
            </button>
          );
        });
      })}

      <button
        className="yf-submit-btn"
        onClick={onSubmit}
        disabled={submitted}
        type="button"
      >
        {submitted ? "✅ Đã nộp" : "Nộp bài 🔶"}
      </button>
    </div>
  );
}
