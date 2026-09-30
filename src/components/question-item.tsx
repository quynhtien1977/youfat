"use client";

import { Question } from "@/types/database";
import { QuestionGradingResult } from "@/lib/gradingEngine";
import {
  FillBlankInput,
  RadioGroup,
  CheckboxGroup,
  MatchingSelect,
} from "./question-inputs";

// ============================================================
// QuestionItem – router theo q.type, YouPass style
// ============================================================

const FILL_BLANK_TYPES = new Set([
  "SUMMARY_COMPLETION",
  "SENTENCE_COMPLETION",
  "FILL_BLANK",
  "SHORT_ANSWER",
  "TABLE_COMPLETION",
]);
const RADIO_TYPES = new Set(["TRUE_FALSE", "YES_NO", "MULTIPLE_CHOICE_ONE"]);
const CHECKBOX_TYPES = new Set(["MULTIPLE_CHOICE_MANY"]);
const MATCHING_TYPES = new Set([
  "MATCHING",
  "MATCHING_INFO",
  "MATCHING_FEATURES",
  "MATCHING_HEADING",
]);

interface QuestionItemProps {
  question: Question;
  answer: string | string[];
  onChange: (val: string | string[]) => void;
  submitted: boolean;
  result?: QuestionGradingResult;
}

function ExplanationBlock({ html }: { html: string }) {
  const isHtml = /<[a-z][\s\S]*>/i.test(html);
  if (isHtml) {
    return (
      <div
        className="yf-q-explanation html-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  return <div className="yf-q-explanation">{html}</div>;
}

export function QuestionItem({
  question,
  answer,
  onChange,
  submitted,
  result,
}: QuestionItemProps) {
  const isCorrect = result?.isCorrect ?? false;
  const isMcq = question.type === "MULTIPLE_CHOICE_ONE";
  const isMcqMany = question.type === "MULTIPLE_CHOICE_MANY";
  const isDiagram = question.type === "MAP_DIAGRAM_LABEL";

  if (isMcq || isMcqMany) {
    const mcqCls =
      "yf-question yf-question--mcq" +
      (submitted ? (isCorrect ? " correct" : " incorrect") : "");

    const ansCount = question.answer ? question.answer.length : 1;
    const isRange = isMcqMany && ansCount > 1;
    const startOrder = question.question_order;
    const endOrder = startOrder + ansCount - 1;

    const userAnswers = Array.isArray(answer)
      ? answer
      : typeof answer === "string" && answer
      ? [answer]
      : [];
    const correctAnswers = result?.correctAnswers || question.answer || [];
    const matchedCount = userAnswers.filter((a) =>
      correctAnswers.includes(a)
    ).length;

    return (
      <div id={`q-${question.question_order}`} className={mcqCls}>
        {/* If range, also add anchor for the second order number */}
        {isRange && <span id={`q-${endOrder}`} style={{ display: "none" }} />}

        <div className="yf-mcq-header">
          {isRange ? (
            <div className="yf-mcq-many-badges">
              <span className="yf-question-number">{startOrder}</span>
              <span className="yf-mcq-many-dash">-</span>
              <span className="yf-question-number">{endOrder}</span>
            </div>
          ) : (
            <span className="yf-question-number">{question.question_order}</span>
          )}
          {question.prompt && (
            <p
              className="yf-q-prompt"
              dangerouslySetInnerHTML={{ __html: question.prompt }}
            />
          )}
          {!isMcq && !submitted && (
            <span className="yf-mcq-many-count-pill" title={`Chọn tối đa ${correctAnswers.length || 2} đáp án`}>
              Đã chọn: {userAnswers.length}/{correctAnswers.length || 2}
            </span>
          )}
        </div>

        <div className="yf-mcq-body">
          {isMcq ? (
            <RadioGroup
              question={question}
              value={typeof answer === "string" ? answer : ""}
              onChange={(v) => onChange(v)}
              submitted={submitted}
              isCorrect={isCorrect}
              correctAnswers={result?.correctAnswers}
              hidePrompt={true}
            />
          ) : (
            <CheckboxGroup
              question={question}
              value={userAnswers}
              onChange={(v) => onChange(v)}
              submitted={submitted}
              isCorrect={isCorrect}
              correctAnswers={result?.correctAnswers}
              hidePrompt={true}
            />
          )}

          {submitted && result && (
            <div className="yf-q-feedback">
              {isCorrect ? (
                <span className="yf-q-feedback-correct">
                  ✅ Đúng {isRange ? `(${matchedCount}/${ansCount})` : ""}
                </span>
              ) : matchedCount > 0 ? (
                <span className="yf-q-feedback-partial">
                  {`⚠️ Đúng một phần (${matchedCount}/${ansCount})`}
                </span>
              ) : (
                <span className="yf-q-feedback-incorrect">
                  ❌ Sai {isRange ? `(0/${ansCount})` : ""}
                </span>
              )}
              {result.explanation && (
                <ExplanationBlock html={result.explanation} />
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  const containerCls =
    "yf-question" +
    (isDiagram ? " yf-question--diagram" : "") +
    (submitted ? (isCorrect ? " correct" : " incorrect") : "");

  const renderInput = () => {
    const q = question;

    if (FILL_BLANK_TYPES.has(q.type) || q.type === "MAP_DIAGRAM_LABEL") {
      return (
        <FillBlankInput
          question={q}
          value={typeof answer === "string" ? answer : ""}
          onChange={(v) => onChange(v)}
          submitted={submitted}
          isCorrect={isCorrect}
        />
      );
    }
    if (RADIO_TYPES.has(q.type)) {
      return (
        <RadioGroup
          question={q}
          value={typeof answer === "string" ? answer : ""}
          onChange={(v) => onChange(v)}
          submitted={submitted}
          isCorrect={isCorrect}
        />
      );
    }
    if (CHECKBOX_TYPES.has(q.type)) {
      return (
        <CheckboxGroup
          question={q}
          value={Array.isArray(answer) ? answer : answer ? [answer as string] : []}
          onChange={(v) => onChange(v)}
          submitted={submitted}
          isCorrect={isCorrect}
        />
      );
    }
    if (MATCHING_TYPES.has(q.type)) {
      return (
        <MatchingSelect
          question={q}
          value={typeof answer === "string" ? answer : ""}
          onChange={(v) => onChange(v)}
          submitted={submitted}
          isCorrect={isCorrect}
        />
      );
    }
    // Fallback
    return (
      <FillBlankInput
        question={q}
        value={typeof answer === "string" ? answer : ""}
        onChange={(v) => onChange(v)}
        submitted={submitted}
        isCorrect={isCorrect}
      />
    );
  };

  return (
    <div id={`q-${question.question_order}`} className={containerCls}>
      {/* Number + content */}
      <div className="yf-question-content">
        <span className="yf-question-number">
          {question.question_order}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          {renderInput()}

          {/* Post-submit feedback */}
          {submitted && result && (
            <div className="yf-q-feedback">
              {isCorrect ? (
                <span className="yf-q-feedback-correct">✅ Đúng</span>
              ) : (
                <>
                  <span className="yf-q-feedback-incorrect">❌ Sai</span>
                  <div className="yf-q-answer-reveal">
                    Đáp án đúng:{" "}
                    <strong style={{ color: "var(--yf-correct)" }}>
                      {result.correctAnswers.join(" / ")}
                    </strong>
                  </div>
                </>
              )}
              {result.explanation && (
                <ExplanationBlock html={result.explanation} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
