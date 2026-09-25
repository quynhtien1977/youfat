"use client";

import { Question } from "@/types/database";
import { QuestionGradingResult } from "@/lib/gradingEngine";
import {
  FillBlankInput,
  RadioGroup,
  CheckboxGroup,
  MatchingSelect,
  DiagramImage,
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
  groupImageUrl?: string | null;
  showDiagram?: boolean;
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
  groupImageUrl,
  showDiagram,
}: QuestionItemProps) {
  const isCorrect = result?.isCorrect ?? false;

  const containerCls =
    "yf-question" +
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
      {/* Diagram – MAP_DIAGRAM_LABEL, 1 lần per group */}
      {question.type === "MAP_DIAGRAM_LABEL" && showDiagram && (
        <DiagramImage
          imageUrl={groupImageUrl}
          groupTitle={question.question_set_title}
        />
      )}

      {/* Number + content */}
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <span
          style={{
            flexShrink: 0,
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: "var(--yf-green)",
            color: "#fff",
            fontSize: 11,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 2,
          }}
        >
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
