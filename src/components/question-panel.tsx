"use client";

import { Question } from "@/types/database";
import { QuestionGradingResult } from "@/lib/gradingEngine";
import { QuestionItem } from "./question-item";

// ============================================================
// QuestionPanel – right pane, YouPass style
// Nhóm câu theo question_set_title, render instruction dưới dạng HTML
// ============================================================

interface QuestionPanelProps {
  questions: Question[];
  answers: Record<string, string | string[]>;
  onAnswer: (questionId: string, val: string | string[]) => void;
  submitted: boolean;
  results: Record<string, QuestionGradingResult>;
}

interface QuestionGroup {
  setTitle: string | undefined;
  instruction: string | undefined;
  questions: Question[];
}

function groupQuestions(questions: Question[]): QuestionGroup[] {
  const groups: QuestionGroup[] = [];
  let current: QuestionGroup | null = null;

  for (const q of questions) {
    const key = q.question_set_title ?? "__ungrouped__";
    if (!current || current.setTitle !== key) {
      current = {
        setTitle: q.question_set_title,
        instruction: q.instruction,
        questions: [],
      };
      groups.push(current);
    }
    current.questions.push(q);
  }
  return groups;
}

// Render instruction: nếu có HTML thì dùng dangerouslySetInnerHTML
function InstructionBlock({ html }: { html: string }) {
  const isHtml = /<[a-z][\s\S]*>/i.test(html);
  if (isHtml) {
    return (
      <div
        className="yf-qset-instruction html-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  return <div className="yf-qset-instruction">{html}</div>;
}

export function QuestionPanel({
  questions,
  answers,
  onAnswer,
  submitted,
  results,
}: QuestionPanelProps) {
  const groups = groupQuestions(questions);

  return (
    <div className="yf-questions-panel">
      {groups.map((group, gi) => {
        const groupImageUrl =
          group.questions.find((q) => q.image_url)?.image_url ?? null;

        return (
          <div key={gi} className="yf-qset">
            {/* Group title */}
            {group.setTitle && (
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 13,
                  color: "var(--yf-text-primary)",
                  marginBottom: 6,
                }}
              >
                {group.setTitle}
              </div>
            )}

            {/* Instruction – support HTML from DB */}
            {group.instruction && (
              <InstructionBlock html={group.instruction} />
            )}

            {/* Questions */}
            {group.questions.map((q, qi) => (
              <QuestionItem
                key={q.id}
                question={q}
                answer={answers[q.id] ?? (q.answer_mode === "all_of" ? [] : "")}
                onChange={(val) => onAnswer(q.id, val)}
                submitted={submitted}
                result={results[q.id]}
                groupImageUrl={groupImageUrl}
                showDiagram={qi === 0}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
