"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { gradeExam, GradingValidationError, ExamGradingSummary, QuestionGradingResult } from "@/lib/gradingEngine";
import { Question, Section } from "@/types/database";
import { PassagePanel } from "@/components/passage-panel";
import { QuestionPanel } from "@/components/question-panel";
import { QuestionNavBar } from "@/components/question-nav-bar";
import { ResultsScreen } from "@/components/results-screen";
import { SubmissionSaveStatus, type PendingSubmission } from "@/components/submission-save-status";
import { SubmitConfirmation } from "@/components/submit-confirmation";
import { usePracticeTimer } from "@/components/use-practice-timer";
import { countUnansweredMarks, formatElapsedTime } from "@/lib/submission-controls";

// ============================================================
// /reading/[sectionId] – Reading Practice Room, YouPass style
// ============================================================

export default function ReadingPracticePage() {
  const params = useParams<{ sectionId: string }>();
  const sectionId = params.sectionId;

  const [section, setSection] = useState<Section | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gradingError, setGradingError] = useState<string | null>(null);

  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [submitted, setSubmitted] = useState(false);
  const [summary, setSummary] = useState<ExamGradingSummary | null>(null);
  const [results, setResults] = useState<Record<string, QuestionGradingResult>>({});
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [pendingSave, setPendingSave] = useState<PendingSubmission | null>(null);
  const { elapsedSeconds, stop: stopTimer } = usePracticeTimer(!loading && !error, sectionId);

  // ── Fetch ─────────────────────────────────────────────────
  useEffect(() => {
    if (!sectionId) return;
    async function load() {
      setLoading(true);
      setError(null);

      const { data: sec, error: secErr } = await supabase
        .from("sections")
        .select("*")
        .eq("id", sectionId)
        .single();

      if (secErr || !sec) {
        setError("Không tìm thấy section này.");
        setLoading(false);
        return;
      }
      setSection(sec as Section);

      const { data: qs, error: qErr } = await supabase
        .from("questions")
        .select("*, options(*)")
        .eq("section_id", sectionId)
        .order("question_order");

      if (qErr) {
        setError("Không tải được câu hỏi.");
        setLoading(false);
        return;
      }
      setQuestions((qs ?? []) as Question[]);
      setLoading(false);
    }
    load();
  }, [sectionId]);

  const handleAnswer = useCallback(
    (questionId: string, val: string | string[]) => {
      if (submitted) return;
      setAnswers((prev) => ({ ...prev, [questionId]: val }));
    },
    [submitted]
  );

  const handleSubmit = useCallback(() => {
    if (submitted || questions.length === 0) return;
    setConfirmOpen(false);
    setGradingError(null);
    try {
      // This route loads one section and includes real options via options(*).
      const examSummary = gradeExam(questions, answers, "reading", "section");
      const timing = stopTimer();
      if (section) setPendingSave({...timing,graded:examSummary,sections:[section],questions,answers,
        skill:"reading",mode:"practice",scope:"section"});
      setSummary(examSummary);
      const rMap: Record<string, QuestionGradingResult> = {};
      for (const r of examSummary.results) rMap[r.questionId] = r;
      setResults(rMap);
      setSubmitted(true);
      const qPanel = document.getElementById("qpanel-scroll");
      if (qPanel) qPanel.scrollTop = 0;
    } catch (cause) {
      console.error("[reading] Không chấm được bài", {
        code: cause instanceof GradingValidationError ? cause.code : "UNKNOWN_ERROR",
      });
      setGradingError("Không chấm được bài này, thử lại hoặc báo lỗi");
    }
  }, [submitted, questions, answers, stopTimer, section]);

  const handlePillClick = useCallback(
    (questionOrder: number) => {
      const q = questions.find((item) => {
        if (item.question_order === questionOrder) return true;
        if (
          item.type === "MULTIPLE_CHOICE_MANY" &&
          item.answer &&
          item.answer.length > 1
        ) {
          return (
            questionOrder >= item.question_order &&
            questionOrder < item.question_order + item.answer.length
          );
        }
        return false;
      });
      const targetOrder = q ? q.question_order : questionOrder;
      const el = document.getElementById(`q-${targetOrder}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        if (q) setActiveQuestionId(q.id);
      }
    },
    [questions]
  );

  useEffect(() => {
    if (questions.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const order = Number(entry.target.id.replace("q-", ""));
            const q = questions.find((q) => q.question_order === order);
            if (q) setActiveQuestionId(q.id);
            break;
          }
        }
      },
      { threshold: 0.5 }
    );
    questions.forEach((q) => {
      const el = document.getElementById(`q-${q.question_order}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [questions, submitted]);

  // ── Loading ───────────────────────────────────────────────
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          flexDirection: "column",
          gap: 16,
          color: "var(--yf-text-muted)",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: "4px solid var(--yf-green)",
            borderTopColor: "transparent",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ fontSize: 14 }}>Đang tải bài đọc…</p>
      </div>
    );
  }

  if (error || !section) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          gap: 16,
        }}
      >
        <p style={{ color: "var(--yf-text-muted)" }}>
          {error ?? "Section không tồn tại."}
        </p>
        <Link
          href="/reading"
          style={{ color: "var(--yf-green)", textDecoration: "underline", fontSize: 14 }}
        >
          ← Quay về danh sách Reading
        </Link>
      </div>
    );
  }

  const topTitle =
    section.title +
    (section.section_title ? " – " + section.section_title : "");

  return (
    <div className="yf-room-layout">
      {/* ─── Top bar ──────────────────────────────────── */}
      <header className="yf-room-topbar">
        <Link href="/reading" className="yf-room-back">
          ← Quay lại
        </Link>
        <span style={{ color: "var(--yf-border)" }}>|</span>
        <h1 className="yf-room-title" title={topTitle}>
          📖 {topTitle}
        </h1>
        <span className="yf-room-meta">
          {section.total_questions || questions.length} câu hỏi
        </span>
        <span className="yf-practice-timer" aria-label="Thời gian làm bài">⏱ {formatElapsedTime(elapsedSeconds)}</span>
      </header>

      {submitted && summary && !reviewing ? (
        <ResultsScreen questions={questions} summary={summary} skill="reading"
          elapsedSeconds={elapsedSeconds} onReview={() => setReviewing(true)}
          feedback={pendingSave && <SubmissionSaveStatus input={pendingSave} />} />
      ) : <>
      {/* ─── Body: passage | questions ─────────────────── */}
      <div className="yf-room-body">
        {/* Left: Passage */}
        <PassagePanel
          section={section}
          questions={questions}
          answers={answers}
          onAnswer={handleAnswer}
          submitted={submitted}
          results={results}
        />

        {/* Right: Questions */}
        <div
          style={{
            width: "50%",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            background: "#fff",
          }}
        >
          {gradingError && <p role="alert" className="yf-error-text">{gradingError}</p>}

          {/* Scrollable questions */}
          <div
            id="qpanel-scroll"
            style={{ flex: 1, overflowY: "auto" }}
          >
            <QuestionPanel
              questions={questions}
              answers={answers}
              onAnswer={handleAnswer}
              submitted={submitted}
              results={results}
            />
          </div>
        </div>
      </div>

      {/* ─── Bottom pill nav (fixed to right 50%) ──────── */}
      <QuestionNavBar
        questions={questions}
        answers={answers}
        activeId={activeQuestionId}
        onPillClick={handlePillClick}
        onSubmit={() => { if (!submitted && questions.length > 0) setConfirmOpen(true); }}
        submitted={submitted}
        results={results}
      />
      </>}
      <SubmitConfirmation open={confirmOpen}
        unansweredMarks={countUnansweredMarks(questions, answers)}
        onCancel={() => setConfirmOpen(false)} onConfirm={handleSubmit} />
    </div>
  );
}
