"use client";

import { useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { Question } from "@/types/database";
import type { QuestionGradingResult } from "@/lib/gradingEngine";

interface GapFillingGroupProps {
  html: string;
  questions: Question[];
  answers: Record<string, string | string[]>;
  onAnswer: (questionId: string, value: string) => void;
  submitted: boolean;
  results: Record<string, QuestionGradingResult>;
}

const QUESTION_ORDER_PATTERN = /(\d+)$/;

function prepareGapTemplate(source: string) {
  const sanitized = source
    .replace(/<(script|style|iframe|object|embed)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<(script|style|iframe|object|embed)\b[^>]*\/?\s*>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+srcdoc\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, "");

  return sanitized.replace(
    /<span\b([^>]*\bdata-question-id\s*=\s*(["'])([^"']+)\2[^>]*)>[\s\S]*?<\/span>/gi,
    (match, attributes: string, _quote: string, questionId: string) => {
      const order = questionId.match(QUESTION_ORDER_PATTERN)?.[1];
      if (!order) return match;
      const attributesWithoutId = attributes.replace(
        /\s+id\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,
        "",
      );
      return `<span${attributesWithoutId} id="q-${order}"></span>`;
    },
  );
}

function answerValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export function GapFillingGroup({
  html,
  questions,
  answers,
  onAnswer,
  submitted,
  results,
}: GapFillingGroupProps) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const templateHtml = useMemo(() => prepareGapTemplate(html), [html]);
  const questionByOrder = useMemo(
    () => new Map(questions.map((question) => [question.question_order, question])),
    [questions],
  );
  const attachContainer = useCallback((node: HTMLDivElement | null) => {
    setContainer(node);
  }, []);

  const targets = container
    ? Array.from(container.querySelectorAll<HTMLElement>("[data-question-id]"))
    : [];

  return (
    <>
      <div
        ref={attachContainer}
        className="yf-gap-template"
        dangerouslySetInnerHTML={{ __html: templateHtml }}
      />

      {targets.map((target) => {
        const sourceId = target.dataset.questionId ?? "";
        const order = Number(sourceId.match(QUESTION_ORDER_PATTERN)?.[1]);
        const question = questionByOrder.get(order);
        if (!question) return null;
        const result = results[question.id];
        const statusClass = submitted
          ? result?.isCorrect
            ? " correct"
            : " incorrect"
          : "";

        return createPortal(
          <span className="yf-gap-slot" data-question-order={order}>
            <span className="yf-gap-number" aria-hidden="true">
              {order}
            </span>
            <input
              className={`yf-gap-template-input${statusClass}`}
              value={answerValue(answers[question.id])}
              onChange={(event) => onAnswer(question.id, event.target.value)}
              disabled={submitted}
              autoComplete="off"
              aria-label={`Câu ${order}`}
            />
            {submitted && result && (
              <span
                className={`yf-gap-status${result.isCorrect ? " correct" : " incorrect"}`}
                aria-label={result.isCorrect ? `Câu ${order} đúng` : `Câu ${order} sai`}
              >
                {result.isCorrect ? "✓" : "×"}
              </span>
            )}
          </span>,
          target,
          question.id,
        );
      })}

      {submitted && (
        <div className="yf-gap-feedback" aria-live="polite">
          {questions
            .filter((question) => results[question.id] && !results[question.id].isCorrect)
            .map((question) => {
              const result = results[question.id];
              return (
                <div className="yf-gap-feedback-row" key={question.id}>
                  <strong>Câu {question.question_order}:</strong>{" "}
                  đáp án đúng {result.correctAnswers.join(" / ")}
                </div>
              );
            })}
        </div>
      )}
    </>
  );
}
