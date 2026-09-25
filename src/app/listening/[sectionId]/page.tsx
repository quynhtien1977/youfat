"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  gradeExam,
  ExamGradingSummary,
  QuestionGradingResult,
} from "@/lib/gradingEngine";
import { Question, Section } from "@/types/database";
import { QuestionPanel } from "@/components/question-panel";
import { QuestionNavBar } from "@/components/question-nav-bar";
import { ResultBanner } from "@/components/result-banner";

// ============================================================
// /listening/[sectionId] – Listening Practice Room
// PRD mục 8: audio player bar + full-width questions
// ============================================================

function formatTime(sec: number): string {
  if (!isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ListeningPracticePage() {
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

  // Audio state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

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

  // ── Audio event listeners ─────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => setDuration(audio.duration);
    const onEnded = () => setPlaying(false);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("loadedmetadata", onDurationChange);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("loadedmetadata", onDurationChange);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, [section]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
  }, [playing]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Number(e.target.value);
  }, []);

  const handleVolume = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  }, []);

  // ── Answer / Submit ────────────────────────────────────────
  const handleAnswer = useCallback(
    (questionId: string, val: string | string[]) => {
      if (submitted) return;
      setAnswers((prev) => ({ ...prev, [questionId]: val }));
    },
    [submitted]
  );

  const handleSubmit = useCallback(() => {
    if (submitted || questions.length === 0) return;
    // Pause audio on submit
    audioRef.current?.pause();
    const examSummary = gradeExam(questions, answers, "listening");
    setSummary(examSummary);
    const rMap: Record<string, QuestionGradingResult> = {};
    for (const r of examSummary.results) rMap[r.questionId] = r;
    setResults(rMap);
    setSubmitted(true);
  }, [submitted, questions, answers]);

  const handlePillClick = useCallback(
    (questionOrder: number) => {
      const el = document.getElementById(`q-${questionOrder}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        const q = questions.find((q) => q.question_order === questionOrder);
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
      { threshold: 0.4 }
    );
    questions.forEach((q) => {
      const el = document.getElementById(`q-${q.question_order}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [questions, submitted]);

  // ── Loading / Error ────────────────────────────────────────
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
        <p style={{ fontSize: 14 }}>Đang tải bài nghe…</p>
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
          href="/listening"
          style={{ color: "var(--yf-green)", textDecoration: "underline", fontSize: 14 }}
        >
          ← Quay về danh sách Listening
        </Link>
      </div>
    );
  }

  const topTitle =
    section.title +
    (section.section_title ? " – " + section.section_title : "");
  const audioUrl = section.audio_url ?? null;

  return (
    <div className="yf-room-layout">
      {/* Hidden audio element */}
      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} preload="metadata" />
      )}

      {/* ─── Top bar ──────────────────────────────────── */}
      <header className="yf-room-topbar">
        <Link href="/listening" className="yf-room-back">
          ← Quay lại
        </Link>
        <span style={{ color: "var(--yf-border)" }}>|</span>
        <h1 className="yf-room-title" title={topTitle}>
          🎧 {topTitle}
        </h1>
        <span className="yf-room-meta">{questions.length} câu hỏi</span>
      </header>

      {/* ─── Audio Player Bar ─────────────────────────── */}
      {audioUrl ? (
        <div className="yf-audio-bar">
          {/* Play/Pause */}
          <button
            className="yf-audio-play-btn"
            onClick={togglePlay}
            type="button"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? "⏸" : "▶"}
          </button>

          {/* Title */}
          <span className="yf-audio-title">
            {section.section_title ?? section.title}
          </span>

          {/* Time + Seekbar */}
          <div className="yf-audio-progress-wrap">
            <span className="yf-audio-time">{formatTime(currentTime)}</span>
            <input
              type="range"
              className="yf-audio-slider"
              min={0}
              max={duration || 0}
              step={0.5}
              value={currentTime}
              onChange={handleSeek}
            />
            <span className="yf-audio-time">{formatTime(duration)}</span>
          </div>

          {/* Volume */}
          <span className="yf-audio-vol" title="Volume">
            {volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}
          </span>
          <input
            type="range"
            className="yf-audio-slider"
            style={{ width: 70, flex: "none" }}
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={handleVolume}
          />
        </div>
      ) : (
        <div className="yf-audio-bar">
          <span style={{ color: "#9e9e9e", fontSize: 13 }}>
            ⚠️ Audio chưa có – làm câu hỏi và tự nghe trước khi nộp bài
          </span>
        </div>
      )}

      {/* ─── Question Area (full width) ──────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          paddingBottom: 80,
        }}
      >
        {submitted && summary && (
          <ResultBanner summary={summary} skill="listening" />
        )}
        <QuestionPanel
          questions={questions}
          answers={answers}
          onAnswer={handleAnswer}
          submitted={submitted}
          results={results}
        />
      </div>

      {/* ─── Bottom pill nav ──────────────────────────── */}
      <QuestionNavBar
        questions={questions}
        answers={answers}
        activeId={activeQuestionId}
        onPillClick={handlePillClick}
        onSubmit={handleSubmit}
        submitted={submitted}
        results={results}
        fullWidth
      />
    </div>
  );
}
