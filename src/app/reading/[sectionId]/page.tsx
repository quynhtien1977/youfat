"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { gradeExam, ExamGradingSummary, QuestionGradingResult } from "@/lib/gradingEngine";
import { Question, Section } from "@/types/database";
import { PassagePanel } from "@/components/passage-panel";
import { QuestionPanel } from "@/components/question-panel";
import { QuestionNavBar } from "@/components/question-nav-bar";
import { ResultBanner } from "@/components/result-banner";

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

  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [submitted, setSubmitted] = useState(false);
  const [summary, setSummary] = useState<ExamGradingSummary | null>(null);
  const [results, setResults] = useState<Record<string, QuestionGradingResult>>({});
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);

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
    const examSummary = gradeExam(questions, answers, "reading");
    setSummary(examSummary);
    const rMap: Record<string, QuestionGradingResult> = {};
    for (const r of examSummary.results) rMap[r.questionId] = r;
    setResults(rMap);
    setSubmitted(true);
    const qPanel = document.getElementById("qpanel-scroll");
    if (qPanel) qPanel.scrollTop = 0;
  }, [submitted, questions, answers]);

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
      </header>

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
          {/* Result banner */}
          {submitted && summary && (
            <ResultBanner summary={summary} skill="reading" />
          )}

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
        onSubmit={handleSubmit}
        submitted={submitted}
        results={results}
      />
    </div>
  );
}
