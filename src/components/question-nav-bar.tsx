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

function isAnswered(answer: string | string[] | undefined): boolean {
  if (answer === undefined || answer === null) return false;
  if (Array.isArray(answer)) return answer.length > 0;
  return answer.trim() !== "";
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
      {questions.map((q) => {
        const answered = isAnswered(answers[q.id]);
        const active = activeId === q.id;
        const result = results[q.id];

        let cls = "yf-navpill";
        if (submitted && result) {
          cls += result.correct ? " correct-pill" : " incorrect-pill";
        } else if (answered) {
          cls += " answered";
        }
        if (active) cls += " current";

        return (
          <button
            key={q.id}
            className={cls}
            onClick={() => onPillClick(q.question_order)}
            type="button"
            title={`Câu ${q.question_order}`}
          >
            {q.question_order}
          </button>
        );
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
