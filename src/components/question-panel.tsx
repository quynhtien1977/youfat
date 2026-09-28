"use client";

import { Question } from "@/types/database";
import { QuestionGradingResult } from "@/lib/gradingEngine";
import { QuestionItem } from "./question-item";
import { DiagramImage } from "./question-inputs";
import { GapFillingGroup } from "./gap-filling-group";
import { MatchingMatrixGroup } from "./matching-matrix-group";
import { MatchingHeadingGroup } from "./matching-heading-group";
import { TfngGroup } from "./tfng-group";

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
        const isDiagramGroup = group.questions.some(
          (question) => question.type === "MAP_DIAGRAM_LABEL"
        );
        const gapTemplate = group.questions.find(
          (question) => question.prompt?.includes("data-question-id")
        )?.prompt;
        const isGapFillingGroup = Boolean(gapTemplate);

        const isMatchingHeadingGroup = group.questions.some(
          (q) => q.type === "MATCHING_HEADING"
        );

        const isMatchingMatrixGroup =
          !isMatchingHeadingGroup &&
          group.questions.some(
            (q) =>
              q.type === "MATCHING_INFO" ||
              q.type === "MATCHING_FEATURES" ||
              q.type === "MATCHING"
          );

        const isTfngGroup =
          !isMatchingHeadingGroup &&
          !isMatchingMatrixGroup &&
          group.questions.every(
            (q) => q.type === "TRUE_FALSE" || q.type === "YES_NO"
          );

        return (
          <div
            key={gi}
            className={`yf-qset${isDiagramGroup ? " yf-qset--diagram" : ""}${
              isGapFillingGroup ? " yf-qset--gap" : ""
            }${isMatchingMatrixGroup ? " yf-qset--matrix" : ""}${
              isMatchingHeadingGroup ? " yf-qset--heading" : ""
            }${isTfngGroup ? " yf-qset--tfng" : ""}`}
          >
            {/* Group title */}
            {group.setTitle && (
              <div className="yf-qset-title">
                {group.setTitle}
              </div>
            )}

            {/* Instruction – support HTML from DB */}
            {group.instruction && (
              <InstructionBlock html={group.instruction} />
            )}

            {isDiagramGroup && !isGapFillingGroup && (
              <DiagramImage
                imageUrl={groupImageUrl}
                groupTitle={group.setTitle}
              />
            )}

            {isGapFillingGroup && gapTemplate ? (
              <GapFillingGroup
                html={gapTemplate}
                questions={group.questions}
                answers={answers}
                onAnswer={(questionId, value) => onAnswer(questionId, value)}
                submitted={submitted}
                results={results}
              />
            ) : isMatchingHeadingGroup ? (
              <MatchingHeadingGroup
                questions={group.questions}
                answers={answers}
                onAnswer={(questionId, value) => onAnswer(questionId, value)}
                submitted={submitted}
                results={results}
              />
            ) : isMatchingMatrixGroup ? (
              <MatchingMatrixGroup
                questions={group.questions}
                answers={answers}
                onAnswer={(questionId, value) => onAnswer(questionId, value)}
                submitted={submitted}
                results={results}
              />
            ) : isTfngGroup ? (
              <TfngGroup
                questions={group.questions}
                answers={answers}
                onAnswer={(questionId, value) => onAnswer(questionId, value)}
                submitted={submitted}
                results={results}
              />
            ) : (
              group.questions.map((q) => (
                <QuestionItem
                  key={q.id}
                  question={q}
                  answer={answers[q.id] ?? (q.answer_mode === "all_of" ? [] : "")}
                  onChange={(val) => onAnswer(q.id, val)}
                  submitted={submitted}
                  result={results[q.id]}
                />
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}
