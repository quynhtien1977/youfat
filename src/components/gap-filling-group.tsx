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
  const [activeOrder, setActiveOrder] = useState<number | null>(null);

  const templateHtml = useMemo(() => prepareGapTemplate(html), [html]);
  const questionByOrder = useMemo(
    () => new Map(questions.map((question) => [question.question_order, question])),
    [questions],
  );

  // Extract unique options across questions in this group (for Matching or Word Bank)
  const optionsList = useMemo(() => {
    const map = new Map<string, string>();
    for (const q of questions) {
      if (q.options && q.options.length > 0) {
        for (const opt of q.options) {
          if (!map.has(opt.option)) {
            map.set(opt.option, opt.text || "");
          }
        }
      }
    }
    return Array.from(map.entries()).map(([option, text]) => ({
      option,
      text,
    }));
  }, [questions]);

  // Determine if options are letter-based matching (e.g. A, B, C, D...)
  const isLetterMatching = useMemo(() => {
    return (
      optionsList.length > 0 &&
      optionsList.every((o) => /^[A-Za-z]$/.test(o.option.trim()))
    );
  }, [optionsList]);

  const attachContainer = useCallback((node: HTMLDivElement | null) => {
    setContainer(node);
  }, []);

  const targets = container
    ? Array.from(container.querySelectorAll<HTMLElement>("[data-question-id]"))
    : [];

  const handleOptionClick = useCallback(
    (selectedOption: string) => {
      if (submitted) return;

      let targetOrder = activeOrder;
      if (!targetOrder || !questionByOrder.has(targetOrder)) {
        // Find first unanswered question in this group
        const firstUnanswered = questions.find(
          (q) => !answers[q.id] || (answers[q.id] as string).trim() === ""
        );
        targetOrder = firstUnanswered
          ? firstUnanswered.question_order
          : questions[0]?.question_order;
      }

      if (!targetOrder) return;
      const q = questionByOrder.get(targetOrder);
      if (!q) return;

      onAnswer(q.id, selectedOption);

      // Auto-advance to the next question in this group
      const sortedOrders = Array.from(questionByOrder.keys()).sort((a, b) => a - b);
      const currIdx = sortedOrders.indexOf(targetOrder);
      if (currIdx !== -1 && currIdx < sortedOrders.length - 1) {
        const nextOrder = sortedOrders[currIdx + 1];
        setActiveOrder(nextOrder);
        const nextInput = container?.querySelector<HTMLInputElement>(
          `[data-question-order="${nextOrder}"] input`
        );
        nextInput?.focus();
      }
    },
    [submitted, activeOrder, questionByOrder, questions, answers, onAnswer, container]
  );

  return (
    <>
      {/* ── Options Legend Box (rendered when options exist) ── */}
      {optionsList.length > 0 && (
        <div className="yf-matching-options-box" aria-label="Danh sách lựa chọn">
          <div className="yf-matching-options-header">
            <div className="yf-matching-options-title">
              <span className="yf-matching-options-icon">📋</span>
              <span>Danh sách lựa chọn (Options)</span>
            </div>
            <div className="yf-matching-options-hint">
              Nhấp vào ô câu hỏi và chọn đáp án tương ứng, hoặc gõ trực tiếp chữ cái vào ô trống.
            </div>
          </div>
          <div className="yf-matching-options-grid">
            {optionsList.map(({ option, text }) => {
              const isUsed = questions.some(
                (q) => (answers[q.id] as string)?.toUpperCase() === option.toUpperCase()
              );
              return (
                <button
                  key={option}
                  type="button"
                  className={`yf-matching-option-card${isUsed ? " is-used" : ""}`}
                  onClick={() => handleOptionClick(option)}
                  disabled={submitted}
                  title={`Chọn ${option}: ${text}`}
                >
                  <span className="yf-matching-option-badge">{option}</span>
                  <span
                    className="yf-matching-option-text"
                    dangerouslySetInnerHTML={{ __html: text || option }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}

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
            <span
              className="yf-gap-number"
              aria-hidden="true"
              id={`location-jumpto-${order}`}
            >
              {order}
            </span>
            <span className="yf-gap-input-wrap">
              <input
                className={`yf-gap-template-input${
                  isLetterMatching ? " is-letter-matching" : ""
                }${statusClass}`}
                value={answerValue(answers[question.id])}
                onChange={(event) => {
                  let val = event.target.value;
                  if (isLetterMatching) {
                    val = val.toUpperCase().trim().slice(0, 1);
                  }
                  onAnswer(question.id, val);
                }}
                onFocus={() => setActiveOrder(order)}
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
              {submitted && result && !result.isCorrect && (
                <span className="yf-gap-correct-val" title="Đáp án đúng">
                  {question.answer?.[0] || result.correctAnswers?.[0]}
                </span>
              )}
            </span>
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
              const correctCode = result.correctAnswers[0];
              const optText = optionsList.find(
                (o) => o.option.toUpperCase() === correctCode?.toUpperCase()
              )?.text;
              return (
                <div className="yf-gap-feedback-row" key={question.id}>
                  <strong>Câu {question.question_order}:</strong>{" "}
                  đáp án đúng <strong>{result.correctAnswers.join(" / ")}</strong>
                  {optText ? ` (${optText})` : ""}
                </div>
              );
            })}
        </div>
      )}
    </>
  );
}
