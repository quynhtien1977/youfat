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
  const { totalCorrect, totalQuestions, bandScore } = summary;
  const percentage = Math.round((totalCorrect / totalQuestions) * 100);

  return (
    <div className="yf-result-banner">
      {/* Circle */}
      <div className="yf-result-score-circle">
        <span className="yf-result-band">{bandScore.toFixed(1)}</span>
        <span className="yf-result-band-label">Band</span>
      </div>

      {/* Details */}
      <div className="yf-result-details">
        <div className="yf-result-title">
          {skill === "reading" ? "📖 Reading" : "🎧 Listening"} – Kết quả
        </div>
        <div className="yf-result-sub">
          Đúng{" "}
          <strong style={{ color: "var(--yf-green)" }}>{totalCorrect}</strong>/
          {totalQuestions} câu ({percentage}%)
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
