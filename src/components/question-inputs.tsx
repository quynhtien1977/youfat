"use client";

import React from "react";
import { Question } from "@/types/database";

// ============================================================
// FillBlankInput – inline (___) hoặc standalone, YouPass style
// ============================================================

interface FillBlankInputProps {
  question: Question;
  value: string;
  onChange: (val: string) => void;
  submitted: boolean;
  isCorrect?: boolean;
}

export function FillBlankInput({
  question,
  value,
  onChange,
  submitted,
  isCorrect,
}: FillBlankInputProps) {
  const hasBlank = question.prompt?.includes("___");

  const inputCls =
    "yf-fill-input" +
    (submitted ? (isCorrect ? " correct" : " incorrect") : "") +
    (submitted ? " disabled" : "");

  if (hasBlank) {
    const parts = question.prompt.split("___");
    return (
      <span style={{ lineHeight: "2.2" }}>
        {parts.map((part, i) => (
          <React.Fragment key={i}>
            <span dangerouslySetInnerHTML={{ __html: part }} />
            {i < parts.length - 1 && (
              <input
                type="text"
                className={inputCls}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={submitted}
                aria-label={`Câu ${question.question_order}`}
              />
            )}
          </React.Fragment>
        ))}
      </span>
    );
  }

  // Standalone
  return (
    <div>
      {question.prompt && (
        <p
          className="yf-q-prompt"
          dangerouslySetInnerHTML={{ __html: question.prompt }}
        />
      )}
      <input
        type="text"
        className={inputCls}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={submitted}
        placeholder={question.type === "MAP_DIAGRAM_LABEL" ? undefined : "Nhập câu trả lời..."}
        autoComplete="off"
        aria-label={`Câu ${question.question_order}`}
      />
    </div>
  );
}

// ============================================================
// RadioGroup – TRUE_FALSE / YES_NO / MULTIPLE_CHOICE_ONE
// ============================================================

interface RadioGroupProps {
  question: Question;
  value: string;
  onChange: (val: string) => void;
  submitted: boolean;
  isCorrect?: boolean;
  correctAnswers?: string[];
  hidePrompt?: boolean;
}

const CHIP_LABELS: Record<string, string[]> = {
  TRUE_FALSE: ["TRUE", "FALSE", "NOT GIVEN"],
  YES_NO: ["YES", "NO", "NOT GIVEN"],
};

export function RadioGroup({
  question,
  value,
  onChange,
  submitted,
  correctAnswers,
  hidePrompt,
}: RadioGroupProps) {
  const chipLabels = CHIP_LABELS[question.type];

  // TRUE/FALSE/NOT GIVEN & YES/NO/NOT GIVEN → chip buttons
  if (chipLabels) {
    return (
      <div>
        {!hidePrompt && question.prompt && (
          <p
            className="yf-q-prompt"
            dangerouslySetInnerHTML={{ __html: question.prompt }}
          />
        )}
        <div className="yf-chip-group">
          {chipLabels.map((label) => {
            const selected = value === label;
            let cls = "yf-chip" + (selected ? " selected" : "");
            if (submitted) cls += " disabled";
            return (
              <button
                key={label}
                type="button"
                className={cls}
                onClick={() => !submitted && onChange(label)}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // MULTIPLE_CHOICE_ONE → flat YouPass style
  const opts = question.options ?? [];
  return (
    <div className="yf-mcq-group">
      {!hidePrompt && question.prompt && (
        <p
          className="yf-q-prompt"
          dangerouslySetInnerHTML={{ __html: question.prompt }}
        />
      )}
      {opts.map((opt) => {
        const selected = value === opt.option;
        const isAnswer = correctAnswers?.includes(opt.option);

        let statusCls = "";
        if (submitted) {
          if (isAnswer) {
            statusCls = " is-correct";
          } else if (selected && !isAnswer) {
            statusCls = " is-incorrect";
          }
        }

        const cls = `yf-mcq-option${selected ? " selected" : ""}${
          submitted ? " disabled" : ""
        }${statusCls}`;

        return (
          <div
            key={opt.option}
            className={cls}
            onClick={() => !submitted && onChange(opt.option)}
          >
            <span className="yf-mcq-letter">{opt.option}</span>
            <span className={`yf-mcq-radio ${selected ? "checked" : ""}`}>
              {selected && <span className="yf-mcq-radio-inner" />}
            </span>
            <span
              className="yf-mcq-text"
              dangerouslySetInnerHTML={{ __html: opt.text }}
            />
            {submitted && isAnswer && (
              <span className="yf-mcq-status-badge correct">✓</span>
            )}
            {submitted && selected && !isAnswer && (
              <span className="yf-mcq-status-badge incorrect">✕</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// CheckboxGroup – MULTIPLE_CHOICE_MANY
// ============================================================

interface CheckboxGroupProps {
  question: Question;
  value: string[];
  onChange: (val: string[]) => void;
  submitted: boolean;
  isCorrect?: boolean;
  correctAnswers?: string[];
  hidePrompt?: boolean;
}

export function CheckboxGroup({
  question,
  value,
  onChange,
  submitted,
  correctAnswers,
  hidePrompt,
}: CheckboxGroupProps) {
  const opts = question.options ?? [];

  const toggle = (opt: string) => {
    if (submitted) return;
    onChange(
      value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]
    );
  };

  return (
    <div className="yf-mcq-group">
      {!hidePrompt && question.prompt && (
        <p
          className="yf-q-prompt"
          dangerouslySetInnerHTML={{ __html: question.prompt }}
        />
      )}
      {opts.map((opt) => {
        const selected = value.includes(opt.option);
        const isAnswer = correctAnswers?.includes(opt.option);

        let statusCls = "";
        if (submitted) {
          if (isAnswer) {
            statusCls = " is-correct";
          } else if (selected && !isAnswer) {
            statusCls = " is-incorrect";
          }
        }

        const cls = `yf-mcq-option yf-mcq-option--checkbox${
          selected ? " selected" : ""
        }${submitted ? " disabled" : ""}${statusCls}`;

        return (
          <div
            key={opt.option}
            className={cls}
            onClick={() => toggle(opt.option)}
          >
            <span className="yf-mcq-letter">{opt.option}</span>
            <span className={`yf-mcq-checkbox ${selected ? "checked" : ""}`}>
              {selected && <span className="yf-mcq-checkmark">✓</span>}
            </span>
            <span
              className="yf-mcq-text"
              dangerouslySetInnerHTML={{ __html: opt.text }}
            />
            {submitted && isAnswer && (
              <span className="yf-mcq-status-badge correct">✓</span>
            )}
            {submitted && selected && !isAnswer && (
              <span className="yf-mcq-status-badge incorrect">✕</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// MatchingSelect – MATCHING / MATCHING_INFO / MATCHING_FEATURES / MATCHING_HEADING
// ============================================================

interface MatchingSelectProps {
  question: Question;
  value: string;
  onChange: (val: string) => void;
  submitted: boolean;
  isCorrect?: boolean;
}

export function MatchingSelect({
  question,
  value,
  onChange,
  submitted,
}: MatchingSelectProps) {
  const opts = question.options ?? [];

  return (
    <div>
      {question.prompt && (
        <p
          className="yf-q-prompt"
          dangerouslySetInnerHTML={{ __html: question.prompt }}
        />
      )}
      <select
        className="yf-matching-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={submitted}
      >
        <option value="">— Chọn đáp án —</option>
        {opts.length > 0
          ? opts.map((opt) => (
              <option key={opt.option} value={opt.option}>
                {opt.option}. {opt.text}
              </option>
            ))
          : // Fallback: nếu không có options, dùng letters A-H
            ["A", "B", "C", "D", "E", "F", "G", "H"].map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
      </select>
    </div>
  );
}

// ============================================================
// DiagramImage – MAP_DIAGRAM_LABEL
// ============================================================

interface DiagramImageProps {
  imageUrl?: string | null;
  groupTitle?: string | null;
}

export function DiagramImage({ imageUrl, groupTitle }: DiagramImageProps) {
  if (!imageUrl) {
    return (
      <div className="yf-diagram-missing" role="alert">
        Thiếu ảnh sơ đồ từ nguồn dữ liệu YouPass.
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageUrl}
      alt={groupTitle ?? "Diagram"}
      className="yf-diagram-image"
    />
  );
}
