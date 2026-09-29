"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  Volume1,
  VolumeX,
  ArrowLeft,
  Headphones,
} from "lucide-react";
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
// YouPass clone: audio player bar + centered questions layout
// ============================================================

function formatTime(sec: number): string {
  if (!isFinite(sec) || isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const SPEED_OPTIONS = [0.75, 1.0, 1.25, 1.5];

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
  const [prevVolume, setPrevVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1.0);

  // ── Fetch Section & Questions ─────────────────────────────
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
    const t = Number(e.target.value);
    audio.currentTime = t;
    setCurrentTime(t);
  }, []);

  const handleRelativeSeek = useCallback((delta: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + delta));
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  }, []);

  const handleJumpToTime = useCallback((targetSec: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = targetSec;
    setCurrentTime(targetSec);
    if (!playing) {
      audio.play().catch(() => {});
    }
  }, [playing]);

  const handleVolume = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (volume > 0) {
      setPrevVolume(volume);
      setVolume(0);
      audio.volume = 0;
    } else {
      const restore = prevVolume || 1;
      setVolume(restore);
      audio.volume = restore;
    }
  }, [volume, prevVolume]);

  const cycleSpeed = useCallback(() => {
    const idx = SPEED_OPTIONS.indexOf(playbackRate);
    const nextIdx = (idx + 1) % SPEED_OPTIONS.length;
    const nextSpeed = SPEED_OPTIONS[nextIdx];
    setPlaybackRate(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  }, [playbackRate]);

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
      <div className="yf-loading-container">
        <div className="yf-loading-spinner" />
        <p>Đang tải bài nghe…</p>
      </div>
    );
  }

  if (error || !section) {
    return (
      <div className="yf-error-container">
        <p className="yf-error-text">{error ?? "Section không tồn tại."}</p>
        <Link href="/listening" className="yf-error-link">
          ← Quay về danh sách Listening
        </Link>
      </div>
    );
  }

  const topTitle =
    section.title +
    (section.section_title ? " – " + section.section_title : "");
  const audioUrl = section.audio_url ?? null;
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="yf-room-layout yf-listening-room">
      {/* Hidden native audio element */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
          onEnded={() => setPlaying(false)}
        />
      )}

      {/* ─── Top Bar ──────────────────────────────────── */}
      <header className="yf-room-topbar">
        <Link href="/listening" className="yf-room-back">
          <ArrowLeft size={16} /> Quay lại
        </Link>
        <span className="yf-room-divider">|</span>
        <h1 className="yf-room-title" title={topTitle}>
          <Headphones size={16} className="inline mr-2 text-primary-01" />
          {topTitle}
        </h1>
        <span className="yf-room-meta">{questions.length} câu hỏi</span>
      </header>

      {/* ─── Question Content Area ────────────────────── */}
      <main className="yf-listening-content">
        <div className="yf-listening-container">
          {/* Header Banner */}
          <div className="yf-listening-header">
            <div className="yf-listening-title-wrap">
              <h2 className="yf-listening-main-title">{section.title}</h2>
              {section.section_title && (
                <span className="yf-listening-sub-badge">
                  {section.section_title}
                </span>
              )}
            </div>

            {/* Quick jump to section range if available */}
            {Boolean(section.listen_from_second && section.listen_from_second > 0) && (
              <button
                type="button"
                onClick={() => handleJumpToTime(section.listen_from_second!)}
                className="yf-listening-timestamp-btn"
                title={`Nhảy tới ${formatTime(section.listen_from_second)}`}
              >
                <Headphones size={14} />
                <span>
                  Bắt đầu nghe từ {formatTime(section.listen_from_second)}
                  {section.listen_to_second
                    ? ` – ${formatTime(section.listen_to_second)}`
                    : ""}
                </span>
              </button>
            )}
          </div>

          {/* Score / Results Banner when submitted */}
          {submitted && summary && (
            <ResultBanner summary={summary} skill="listening" />
          )}

          {/* All Question Sets */}
          <QuestionPanel
            questions={questions}
            answers={answers}
            onAnswer={handleAnswer}
            submitted={submitted}
            results={results}
          />
        </div>
      </main>

      {/* ─── Bottom Docked Audio Player & Question Nav Bar ──── */}
      <div className="yf-listening-bottom-dock">
        {audioUrl ? (
          <div className="yf-audio-bar-light">
            {/* Main Controls: Play / Pause */}
            <button
              className="yf-audio-light-play"
              onClick={togglePlay}
              type="button"
              aria-label={playing ? "Tạm dừng" : "Phát"}
              title={playing ? "Tạm dừng" : "Phát"}
            >
              {playing ? (
                <Pause size={15} fill="#fff" />
              ) : (
                <Play size={15} fill="#fff" className="ml-0.5" />
              )}
            </button>

            {/* Quick jump -5s / +5s */}
            <div className="yf-audio-light-skips">
              <button
                className="yf-audio-light-btn"
                onClick={() => handleRelativeSeek(-5)}
                type="button"
                title="Lùi 5 giây"
              >
                <RotateCcw size={14} />
                <span className="yf-skip-tag-light">5s</span>
              </button>
              <button
                className="yf-audio-light-btn"
                onClick={() => handleRelativeSeek(5)}
                type="button"
                title="Tiến 5 giây"
              >
                <RotateCw size={14} />
                <span className="yf-skip-tag-light">5s</span>
              </button>
            </div>

            {/* Time display */}
            <span className="yf-audio-light-time">
              {formatTime(currentTime)}{" "}
              <span style={{ color: "#94a3b8" }}>/</span> {formatTime(duration)}
            </span>

            {/* Progress Seekbar */}
            <div className="yf-audio-light-timeline">
              <input
                type="range"
                className="yf-audio-light-slider"
                min={0}
                max={duration || 0}
                step={0.5}
                value={currentTime}
                onChange={handleSeek}
                style={{
                  background: `linear-gradient(to right, #f99d1c 0%, #f99d1c ${progressPercent}%, #e2e8f0 ${progressPercent}%, #e2e8f0 100%)`,
                }}
              />
            </div>

            {/* Playback speed toggle */}
            <button
              className="yf-audio-light-speed"
              onClick={cycleSpeed}
              type="button"
              title="Tốc độ phát audio"
            >
              {playbackRate}x
            </button>

            {/* Volume Control */}
            <div className="yf-audio-light-vol">
              <button
                className="yf-audio-light-btn"
                onClick={toggleMute}
                type="button"
                title={volume === 0 ? "Bật âm thanh" : "Tắt âm thanh"}
              >
                {volume === 0 ? (
                  <VolumeX size={15} />
                ) : volume < 0.5 ? (
                  <Volume1 size={15} />
                ) : (
                  <Volume2 size={15} />
                )}
              </button>
              <input
                type="range"
                className="yf-audio-light-vol-slider"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={handleVolume}
              />
            </div>
          </div>
        ) : (
          <div className="yf-audio-bar-light yf-audio-bar-light--empty">
            <span>⚠️ Chưa có file audio cho bài này.</span>
          </div>
        )}

        {/* Bottom Navigation Bar */}
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
    </div>
  );
}
