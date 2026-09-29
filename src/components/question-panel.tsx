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

function formatGroupTitle(title: string | undefined): string {
  if (!title) return "";
  const trimmed = title.trim();
  const rangeMatch = trimmed.match(/^Questions\s*(\d+)\s*[-–—]\s*(\d+)$/i);
  if (rangeMatch) {
    return `Questions ${rangeMatch[1]} - ${rangeMatch[2]}:`;
  }
  return trimmed.endsWith(":") ? trimmed : `${trimmed}:`;
}

function groupQuestions(questions: Question[]): QuestionGroup[] {
  const groups: QuestionGroup[] = [];
  let current: QuestionGroup | null = null;

  for (const q of questions) {
    const key = q.question_set_title
      ? `title:${q.question_set_title}`
      : q.instruction
      ? `instr:${q.instruction}`
      : `type:${q.type}`;
    const currentKey = current?.setTitle
      ? `title:${current.setTitle}`
      : current?.instruction
      ? `instr:${current.instruction}`
      : current?.questions[0]
      ? `type:${current.questions[0].type}`
      : "";

    if (!current || currentKey !== key) {
      current = {
        setTitle: q.question_set_title,
        instruction: q.instruction,
        questions: [],
      };
      groups.push(current);
    }
    current.questions.push(q);
  }

  // Synthesize setTitle if missing
  for (const group of groups) {
    if (!group.setTitle && group.questions.length > 0) {
      const orders = group.questions
        .map((q) => q.question_order)
        .sort((a, b) => a - b);
      const min = orders[0];
      const max = orders[orders.length - 1];
      if (min === max) {
        group.setTitle = `Question ${min}:`;
      } else {
        group.setTitle = `Questions ${min} - ${max}:`;
      }
    }
  }

  return groups;
}

// Render instruction: nếu có HTML thì dùng dangerouslySetInnerHTML
function InstructionBlock({
  html,
  stripImages = false,
}: {
  html: string;
  stripImages?: boolean;
}) {
  let content = html;
  if (stripImages) {
    // Strip <img> tags and any empty wrapping <p>/<strong> tags
    content = content.replace(/<img[^>]*>/gi, "");
    content = content.replace(/<p>\s*(?:<strong>\s*<\/strong>)?\s*<\/p>/gi, "");
  }

  const isHtml = /<[a-z][\s\S]*>/i.test(content);
  if (isHtml) {
    return (
      <div
        className="yf-qset-instruction html-content"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }
  return <div className="yf-qset-instruction">{content}</div>;
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
        let groupImageUrl =
          group.questions.find((q) => q.image_url)?.image_url ?? null;
        if (!groupImageUrl && group.instruction && group.instruction.includes("<img")) {
          const match = group.instruction.match(/<img[^>]+src=["']([^"']+)["']/i);
          if (match) {
            groupImageUrl = match[1];
          }
        }
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
                {formatGroupTitle(group.setTitle)}
              </div>
            )}

            {/* Instruction – support HTML from DB */}
            {group.instruction && (
              <InstructionBlock
                html={group.instruction}
                stripImages={isDiagramGroup && !!groupImageUrl}
              />
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
