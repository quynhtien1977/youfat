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
  /** true = hide the submit/Đã nộp button (review mode) */
  hideSubmit?: boolean;
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
  hideSubmit = false,
}: QuestionNavBarProps) {
  return (
    <div
      className="yf-navbar"
      style={fullWidth ? { width: "100%", left: 0, right: 0 } : undefined}
    >
      {questions.flatMap((q) => {
        const isAllOf = q.answer_mode === "all_of";
        const result = results[q.id];
        // After submission the engine owns normalization, slot count and targets.
        // Never fall back to mutable raw answers or infer marks from display type.
        const userAnswer = submitted ? result?.userAnswer : answers[q.id];
        const count = submitted && result
          ? result.maxPoints
          : isAllOf ? Math.max(1, q.answer?.length ?? 0) : 1;
        const selections = Array.isArray(userAnswer) ? userAnswer : [];
        const targets = new Set((result?.correctAnswers ?? []).map((answer) => answer.trim().toUpperCase()));
        const active = activeId === q.id;

        return Array.from({ length: count }, (_, idx) => {
          const pillOrder = q.question_order + idx;
          const answered = isAllOf
            ? idx < selections.length
            : typeof userAnswer === "string" && Boolean(userAnswer.trim());

          let cls = "yf-navpill";
          if (submitted && result && answered) {
            const correct = isAllOf
              ? targets.has(selections[idx].trim().toUpperCase())
              : result.isCorrect;
            cls += correct ? " correct-pill" : " incorrect-pill";
          } else if (!submitted && answered) {
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

      {!hideSubmit && (
        <button
          className="yf-submit-btn"
          onClick={onSubmit}
          disabled={submitted}
          type="button"
        >
          {submitted ? "Đã nộp" : "Hoàn thành"}
        </button>
      )}
    </div>
  );
}
