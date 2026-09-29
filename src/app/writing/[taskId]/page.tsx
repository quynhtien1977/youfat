"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Play, Pause, RotateCcw, Clock, Eye, Send, CheckCircle2, AlertTriangle, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";

// ============================================================
// /writing/[taskId] – Writing Practice Room
// Faithful clone of YouPass Writing experience:
// - Left: Guidance, Framed Prompt Card, Chart/Diagram Image (Task 1)
// - Right: Live Word Counter, Countdown Timer, Textarea, Sample Modal, Result Comparison Tabs
// ============================================================

interface WritingTaskData {
  id: string;
  task_number: number;
  title: string | null;
  prompt: string | null;
  image_url: string | null;
  sample_essay: string | null;
  test_id: string;
}

function countWords(text: string): number {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
}

function cleanPrompt(prompt: string | null): string {
  if (!prompt) return "";
  let cleaned = prompt.trim();
  if (cleaned.endsWith("com")) {
    cleaned = cleaned.slice(0, -3) + "comparisons where relevant.";
  } else if (cleaned.endsWith("making")) {
    cleaned = cleaned + " comparisons where relevant.";
  } else if (cleaned.endsWith("give y") || cleaned.endsWith("give your...")) {
    cleaned = cleaned.replace(/give y(our\.\.\.)?$/, "give your own opinion.");
  } else if (cleaned.endsWith("views and g")) {
    cleaned = cleaned.replace(/views and g$/, "views and give your own opinion.");
  }
  return cleaned;
}

const MIN_WORDS: Record<number, number> = { 1: 150, 2: 250 };
const TIME_LIMIT_SECS: Record<number, number> = { 1: 20 * 60, 2: 40 * 60 };

export default function WritingPracticePage() {
  const params = useParams<{ taskId: string }>();
  const taskId = params.taskId;

  const [task, setTask] = useState<WritingTaskData | null>(null);
  const [testInfo, setTestInfo] = useState<{ book: number; test_number: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [essay, setEssay] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showSampleModal, setShowSampleModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"sample" | "user" | "compare">("sample");

  // Timer states
  const [timeLeft, setTimeLeft] = useState(20 * 60);
  const [timerRunning, setTimerRunning] = useState(true);
  const [timeSpent, setTimeSpent] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!taskId) return;
    async function load() {
      setLoading(true);
      const { data, error: err } = await supabase
        .from("writing_tasks")
        .select("*")
        .eq("id", taskId)
        .single();

      if (err || !data) {
        setError("Không tìm thấy task này.");
        setLoading(false);
        return;
      }
      setTask(data as WritingTaskData);
      const defaultSecs = TIME_LIMIT_SECS[data.task_number] ?? 20 * 60;
      setTimeLeft(defaultSecs);

      // Fetch test info
      const { data: testData } = await supabase
        .from("tests")
        .select("book,test_number")
        .eq("id", data.test_id)
        .single();
      if (testData) setTestInfo(testData);

      setLoading(false);
    }
    load();
  }, [taskId]);

  // Countdown timer effect
  useEffect(() => {
    if (!timerRunning || submitted || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
      setTimeSpent((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning, submitted, timeLeft]);

  const handleSubmit = useCallback(() => {
    if (submitted) return;
    setSubmitted(true);
    setTimerRunning(false);
    setActiveTab("sample");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [submitted]);

  const handleReset = useCallback(() => {
    if (!task) return;
    setSubmitted(false);
    setEssay("");
    const defaultSecs = TIME_LIMIT_SECS[task.task_number] ?? 20 * 60;
    setTimeLeft(defaultSecs);
    setTimeSpent(0);
    setTimerRunning(true);
  }, [task]);

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
        <p style={{ fontSize: 14 }}>Đang tải đề thi Writing…</p>
      </div>
    );
  }

  if (error || !task) {
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
        <p style={{ color: "var(--yf-text-muted)" }}>{error ?? "Task không tồn tại."}</p>
        <Link
          href="/writing"
          style={{ color: "var(--yf-green)", textDecoration: "underline", fontSize: 14 }}
        >
          ← Quay về danh sách Writing
        </Link>
      </div>
    );
  }

  const wordCount = countWords(essay);
  const minWords = MIN_WORDS[task.task_number] ?? 250;
  const wordOk = wordCount >= minWords;
  const sampleWordCount = task.sample_essay ? countWords(task.sample_essay) : 0;

  const topTitle = testInfo
    ? `[C${testInfo.book}T${testInfo.test_number}] Writing Task ${task.task_number}`
    : `Writing Task ${task.task_number}`;

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const spentMinutes = Math.floor(timeSpent / 60);
  const spentSeconds = timeSpent % 60;

  return (
    <div className="yf-room-layout">
      {/* ─── Top Navigation Bar ──────────────────────────────── */}
      <header className="yf-room-topbar">
        <Link href="/writing" className="yf-room-back">
          <ArrowLeft size={16} /> Quay lại
        </Link>
        <span style={{ color: "var(--yf-border)" }}>|</span>
        <h1 className="yf-room-title" title={topTitle}>
          ✏️ {topTitle}
        </h1>
        <span className="yf-room-meta">
          {task.task_number === 1 ? "Gợi ý: 20 phút | ≥150 từ" : "Gợi ý: 40 phút | ≥250 từ"}
        </span>
      </header>

      {/* ─── Body: Split View (Prompt 40% | Editor 60%) ──────── */}
      <div className="yf-room-body">
        {/* Left – Prompt Panel */}
        <div className="yf-passage-panel" style={{ width: "40%" }}>
          <div className="yf-writing-meta-banner">
            <span className={`yf-writing-task-badge task-${task.task_number}`}>
              {task.task_number === 1 ? "📊 Task 1" : "📝 Task 2"}
            </span>
            <span style={{ fontSize: 13, color: "#6b7280" }}>
              Yêu cầu tối thiểu: <strong>{minWords} từ</strong>
            </span>
          </div>

          <h2 className="yf-passage-title" style={{ marginBottom: 14 }}>
            {task.title ?? topTitle}
          </h2>

          <p className="yf-writing-guidance">
            {task.task_number === 1
              ? "You should spend about 20 minutes on this task."
              : "You should spend about 40 minutes on this task."}
          </p>

          {/* Framed Prompt Box (YouPass Style) */}
          <div className="yf-writing-prompt-card">
            {cleanPrompt(task.prompt) || (
              <span style={{ color: "var(--yf-text-muted)", fontStyle: "italic" }}>
                Đề bài đang được cập nhật…
              </span>
            )}
          </div>

          {/* Task 1: Chart / Diagram / Map Image */}
          {task.task_number === 1 && task.image_url && (
            <div className="yf-writing-image-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={task.image_url}
                alt={task.title || "Task 1 Chart Diagram"}
              />
            </div>
          )}

          {/* Task 2: Standard closing prompt note */}
          {task.task_number === 2 && (
            <p style={{ fontSize: 13.5, color: "#4b5563", lineHeight: 1.6, marginTop: 8 }}>
              Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.
            </p>
          )}
        </div>

        {/* Right – Editor / Submission Review Panel */}
        <div className="yf-writing-editor-wrap">
          {submitted ? (
            /* ─── Submitted Review Mode ─────────────────────── */
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
              {/* Score / Stats Banner */}
              <div className="yf-writing-result-card">
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      background: wordOk ? "#13a62e" : "#ea580c",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                    }}
                  >
                    {wordOk ? <CheckCircle2 size={26} /> : <AlertTriangle size={26} />}
                  </div>
                  <div>
                    <h3 style={{ fontWeight: 700, fontSize: 16, color: "#111827", margin: 0 }}>
                      Đã hoàn thành bài viết!
                    </h3>
                    <p style={{ fontSize: 13.5, color: "#4b5563", margin: "4px 0 0" }}>
                      Số từ: <strong>{wordCount}</strong> từ ({wordOk ? `Đạt yêu cầu ≥${minWords} từ` : `Chưa đủ ≥${minWords} từ`}) | Thời gian làm bài: <strong>{spentMinutes}m {spentSeconds}s</strong>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 14px",
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    background: "#ffffff",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#374151",
                    cursor: "pointer",
                  }}
                >
                  <RotateCcw size={14} /> Viết lại
                </button>
              </div>

              {/* View Switcher Tabs */}
              <div className="yf-writing-tabs">
                <button
                  type="button"
                  className={`yf-writing-tab-btn${activeTab === "sample" ? " active" : ""}`}
                  onClick={() => setActiveTab("sample")}
                >
                  📖 Bài mẫu Band 8.0+ ({sampleWordCount} từ)
                </button>
                <button
                  type="button"
                  className={`yf-writing-tab-btn${activeTab === "user" ? " active" : ""}`}
                  onClick={() => setActiveTab("user")}
                >
                  ✍️ Bài của bạn ({wordCount} từ)
                </button>
                <button
                  type="button"
                  className={`yf-writing-tab-btn${activeTab === "compare" ? " active" : ""}`}
                  onClick={() => setActiveTab("compare")}
                >
                  ↔️ So sánh song song
                </button>
              </div>

              {/* Tab 1: Sample Essay */}
              {activeTab === "sample" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#15803d", textTransform: "uppercase" }}>
                      Bài mẫu tham khảo tiêu chuẩn Band 8.0+
                    </span>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>
                      {sampleWordCount} từ
                    </span>
                  </div>
                  <div className="yf-writing-sample-box">
                    {task.sample_essay || "Chưa có bài mẫu cho task này."}
                  </div>
                </div>
              )}

              {/* Tab 2: User's Essay */}
              {activeTab === "user" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#4b5563", textTransform: "uppercase" }}>
                      Bài viết bạn đã nộp
                    </span>
                    <span style={{ fontSize: 12, color: wordOk ? "#15803d" : "#b91c1c", fontWeight: 600 }}>
                      {wordCount} / {minWords}+ từ
                    </span>
                  </div>
                  <div className="yf-writing-essay-box">
                    {essay || <span style={{ color: "#9ca3af", fontStyle: "italic" }}>Bạn chưa nhập nội dung.</span>}
                  </div>
                </div>
              )}

              {/* Tab 3: Side-by-Side Comparison */}
              {activeTab === "compare" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <h4 style={{ fontSize: 13, fontWeight: 700, color: "#4b5563", marginBottom: 8 }}>
                      ✍️ Bài của bạn ({wordCount} từ)
                    </h4>
                    <div className="yf-writing-essay-box" style={{ minHeight: 380 }}>
                      {essay || <span style={{ color: "#9ca3af", fontStyle: "italic" }}>Bạn chưa nhập nội dung.</span>}
                    </div>
                  </div>
                  <div>
                    <h4 style={{ fontSize: 13, fontWeight: 700, color: "#15803d", marginBottom: 8 }}>
                      📖 Bài mẫu 8.0+ ({sampleWordCount} từ)
                    </h4>
                    <div className="yf-writing-sample-box" style={{ minHeight: 380 }}>
                      {task.sample_essay || "Chưa có bài mẫu."}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ─── Practice Typing Mode ──────────────────────── */
            <>
              {/* Toolbar: Word count & Timer */}
              <div className="yf-writing-editor-toolbar">
                <div className={`yf-writing-word-count${wordOk ? " is-valid" : ""}`}>
                  <span>Số từ:</span>
                  <strong>{wordCount}</strong>
                  <span>/ {minWords}+</span>
                  {wordOk && <span style={{ color: "#15803d" }}>✓ Đủ số từ</span>}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div className="yf-writing-timer">
                    <Clock size={14} color="#6b7280" />
                    <span>{formatTimer(timeLeft)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTimerRunning((prev) => !prev)}
                    title={timerRunning ? "Tạm dừng đồng hồ" : "Tiếp tục đồng hồ"}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: 4,
                      display: "flex",
                      alignItems: "center",
                      color: "#4b5563",
                    }}
                  >
                    {timerRunning ? <Pause size={15} /> : <Play size={15} />}
                  </button>
                </div>
              </div>

              {/* Main Writing Textarea */}
              <textarea
                ref={textareaRef}
                className="yf-writing-textarea"
                value={essay}
                onChange={(e) => setEssay(e.target.value)}
                placeholder={`Viết bài ${task.task_number === 1 ? "Task 1 (tối thiểu 150 từ)" : "Task 2 (tối thiểu 250 từ)"} của bạn tại đây...`}
                spellCheck={false}
              />

              {/* Bottom Action Bar */}
              <div className="yf-writing-bottom-bar">
                <button
                  type="button"
                  className="yf-writing-sample-btn"
                  onClick={() => setShowSampleModal(true)}
                >
                  <Eye size={15} /> Xem bài mẫu Band 8.0+
                </button>

                <button
                  type="button"
                  className="yf-submit-btn"
                  onClick={handleSubmit}
                  disabled={submitted}
                >
                  Nộp bài <Send size={14} className="ml-1 inline" />
                </button>
              </div>
            </>
          )}

          {/* Modal Preview Sample Essay (Before Submitting) */}
          {showSampleModal && !submitted && task.sample_essay && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.5)",
                zIndex: 9999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 24,
              }}
              onClick={() => setShowSampleModal(false)}
            >
              <div
                style={{
                  background: "#fff",
                  borderRadius: 12,
                  padding: 24,
                  maxWidth: 720,
                  width: "100%",
                  maxHeight: "82vh",
                  overflowY: "auto",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 16,
                  }}
                >
                  <h3 style={{ fontWeight: 700, fontSize: 16, color: "#15803d", margin: 0 }}>
                    📖 Bài mẫu tham khảo Band 8.0+ ({sampleWordCount} từ)
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowSampleModal(false)}
                    style={{
                      background: "#f3f4f6",
                      border: "none",
                      borderRadius: "50%",
                      width: 32,
                      height: 32,
                      cursor: "pointer",
                      fontSize: 15,
                    }}
                  >
                    ✕
                  </button>
                </div>
                <div className="yf-writing-sample-box" style={{ fontSize: 14 }}>
                  {task.sample_essay}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
