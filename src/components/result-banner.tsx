"use client";

import { ExamGradingSummary } from "@/lib/gradingEngine";

// ============================================================
// ResultBanner – YouPass style score summary
// ============================================================

interface ResultBannerProps {
  summary: ExamGradingSummary;
  skill: "reading" | "listening";
}

export function ResultBanner({ summary, skill }: ResultBannerProps) {
  const { correctMarks, totalMarks } = summary;
  const percentage = totalMarks > 0 ? Math.round((correctMarks / totalMarks) * 100) : 0;

  return (
    <div className="yf-result-banner">
      {/* Circle */}
      <div className="yf-result-score-circle">
        <span className="yf-result-band">{correctMarks}/{totalMarks}</span>
        <span className="yf-result-band-label">câu đúng</span>
      </div>

      {/* Details */}
      <div className="yf-result-details">
        <div className="yf-result-title">
          {skill === "reading" ? "📖 Reading" : "🎧 Listening"} – Kết quả
        </div>
        <div className="yf-result-sub">
          Đúng{" "}
          <strong style={{ color: "var(--yf-green)" }}>{correctMarks}</strong>/
          {totalMarks} câu ({percentage}%)
        </div>
        <div className="yf-result-progress">
          <div
            className="yf-result-progress-fill"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
