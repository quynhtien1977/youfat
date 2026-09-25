"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

// ============================================================
// /writing/[taskId] – Writing Practice Room
// PRD mục 9: split-view (prompt 40% | textarea 60%)
// V1: submit → show sample_essay
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

const MIN_WORDS: Record<number, number> = { 1: 150, 2: 250 };

export default function WritingPracticePage() {
  const params = useParams<{ taskId: string }>();
  const taskId = params.taskId;

  const [task, setTask] = useState<WritingTaskData | null>(null);
  const [testInfo, setTestInfo] = useState<{ book: number; test_number: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [essay, setEssay] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showSample, setShowSample] = useState(false);

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

  const handleSubmit = useCallback(() => {
    if (submitted) return;
    setSubmitted(true);
    setShowSample(true);
    // scroll to top of right panel
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [submitted]);

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
        <p style={{ fontSize: 14 }}>Đang tải đề thi…</p>
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

  const topTitle = testInfo
    ? `[C${testInfo.book}T${testInfo.test_number}] Writing Task ${task.task_number}`
    : `Writing Task ${task.task_number}`;

  return (
    <div className="yf-room-layout">
      {/* ─── Top bar ──────────────────────────────────── */}
      <header className="yf-room-topbar">
        <Link href="/writing" className="yf-room-back">
          ← Quay lại
        </Link>
        <span style={{ color: "var(--yf-border)" }}>|</span>
        <h1 className="yf-room-title" title={topTitle}>
          ✏️ {topTitle}
        </h1>
        <span className="yf-room-meta">
          {task.task_number === 1 ? "≥150 từ" : "≥250 từ"}
        </span>
      </header>

      {/* ─── Body: prompt | essay ──────────────────────── */}
      <div className="yf-room-body">
        {/* Left – Prompt (40%) */}
        <div
          className="yf-passage-panel"
          style={{ width: "40%" }}
        >
          {/* Task badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 12,
              padding: "4px 12px",
              borderRadius: 20,
              background:
                task.task_number === 1 ? "#e8f5e9" : "#ede7f6",
              color:
                task.task_number === 1 ? "var(--yf-green)" : "#7c3aed",
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            {task.task_number === 1 ? "📊" : "📝"} Task {task.task_number}
          </div>

          <h2 className="yf-passage-title">
            {task.title ?? topTitle}
          </h2>

          {/* Task image (Task 1) */}
          {task.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={task.image_url}
              alt="Task 1 diagram"
              style={{
                width: "100%",
                borderRadius: 8,
                marginBottom: 16,
                border: "1px solid var(--yf-border)",
              }}
            />
          )}

          {/* Prompt */}
          <div className="yf-passage-text">
            {task.prompt ? (
              <p style={{ whiteSpace: "pre-wrap" }}>{task.prompt}</p>
            ) : (
              <p style={{ color: "var(--yf-text-muted)", fontStyle: "italic" }}>
                Đề bài đang được cập nhật…
              </p>
            )}
          </div>
        </div>

        {/* Right – Essay area (60%) */}
        <div
          style={{
            width: "60%",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            background: "#fafafa",
          }}
        >
          {/* Submitted: show sample essay */}
          {submitted && showSample && task.sample_essay ? (
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "20px 24px",
              }}
            >
              {/* Score placeholder */}
              <div
                style={{
                  background: "linear-gradient(135deg, #e8f5e9, #f1f8e9)",
                  border: "1px solid #a5d6a7",
                  borderRadius: 10,
                  padding: "16px 20px",
                  marginBottom: 20,
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: "var(--yf-green)",
                    color: "#fff",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: 20, fontWeight: 800 }}>✍️</span>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                    Đã nộp bài
                  </div>
                  <div style={{ fontSize: 13, color: "var(--yf-text-muted)" }}>
                    Từ của bạn: <strong>{wordCount}</strong> từ
                    {wordOk ? " ✅" : ` (cần ≥${minWords} từ) ⚠️`}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--yf-text-muted)",
                      marginTop: 4,
                    }}
                  >
                    AI chấm bài tự động sắp ra mắt (v2). Đối chiếu bài mẫu bên dưới.
                  </div>
                </div>
              </div>

              {/* Your essay */}
              <div style={{ marginBottom: 24 }}>
                <h3
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--yf-text-muted)",
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Bài của bạn
                </h3>
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid var(--yf-border)",
                    borderRadius: 8,
                    padding: "16px",
                    fontSize: 14,
                    lineHeight: 1.8,
                    whiteSpace: "pre-wrap",
                    color: "var(--yf-text-primary)",
                  }}
                >
                  {essay || <span style={{ color: "var(--yf-text-muted)" }}>Bạn chưa viết gì.</span>}
                </div>
              </div>

              {/* Sample essay */}
              <div>
                <h3
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--yf-green)",
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  📖 Bài mẫu tham khảo
                </h3>
                <div
                  style={{
                    background: "#f9fbe7",
                    border: "1px solid #c5e1a5",
                    borderRadius: 8,
                    padding: "16px",
                    fontSize: 14,
                    lineHeight: 1.8,
                    whiteSpace: "pre-wrap",
                    color: "var(--yf-text-primary)",
                  }}
                >
                  {task.sample_essay}
                </div>
              </div>
            </div>
          ) : submitted && !task.sample_essay ? (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: 40,
                gap: 12,
                color: "var(--yf-text-muted)",
              }}
            >
              <div style={{ fontSize: 48 }}>📝</div>
              <p style={{ fontWeight: 600, fontSize: 15 }}>Đã nộp bài thành công!</p>
              <p style={{ fontSize: 13 }}>
                Bài mẫu cho task này chưa có trong hệ thống.
              </p>
            </div>
          ) : (
            /* Essay textarea */
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                padding: "16px 20px",
                gap: 10,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "var(--yf-text-muted)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>✏️ Viết bài của bạn vào đây</span>
                <span
                  style={{
                    fontWeight: 700,
                    color: wordOk ? "var(--yf-green)" : "var(--yf-incorrect)",
                  }}
                >
                  {wordCount} từ {wordOk ? "✅" : `/ ${minWords}+`}
                </span>
              </div>
              <textarea
                ref={textareaRef}
                value={essay}
                onChange={(e) => setEssay(e.target.value)}
                placeholder={`Viết bài ${task.task_number === 1 ? "Task 1 (≥150 từ)" : "Task 2 (≥250 từ)"} của bạn tại đây…`}
                style={{
                  flex: 1,
                  resize: "none",
                  border: "1px solid var(--yf-border)",
                  borderRadius: 8,
                  padding: "14px 16px",
                  fontSize: 14,
                  lineHeight: 1.8,
                  fontFamily: "inherit",
                  outline: "none",
                  color: "var(--yf-text-primary)",
                  background: "#fff",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--yf-green)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--yf-border)")}
              />
              {/* Bottom actions */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <button
                  onClick={() => setShowSample(true)}
                  style={{
                    background: "transparent",
                    border: "1px solid var(--yf-green)",
                    color: "var(--yf-green)",
                    borderRadius: 20,
                    padding: "7px 18px",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    ((e.target as HTMLElement).style.background = "#e8f5e9")
                  }
                  onMouseLeave={(e) =>
                    ((e.target as HTMLElement).style.background = "transparent")
                  }
                >
                  👁 Xem bài mẫu
                </button>
                <button
                  className="yf-submit-btn"
                  onClick={handleSubmit}
                  disabled={submitted}
                >
                  Nộp bài 🔶
                </button>
              </div>
            </div>
          )}

          {/* Sample overlay (before submit) */}
          {showSample && !submitted && task.sample_essay && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.5)",
                zIndex: 99,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 24,
              }}
              onClick={() => setShowSample(false)}
            >
              <div
                style={{
                  background: "#fff",
                  borderRadius: 12,
                  padding: 24,
                  maxWidth: 700,
                  width: "100%",
                  maxHeight: "80vh",
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
                  <h3 style={{ fontWeight: 700, fontSize: 15 }}>📖 Bài mẫu tham khảo</h3>
                  <button
                    onClick={() => setShowSample(false)}
                    style={{
                      background: "#f5f5f5",
                      border: "none",
                      borderRadius: "50%",
                      width: 32,
                      height: 32,
                      cursor: "pointer",
                      fontSize: 16,
                    }}
                  >
                    ✕
                  </button>
                </div>
                <p
                  style={{
                    fontSize: 14,
                    lineHeight: 1.8,
                    whiteSpace: "pre-wrap",
                    color: "var(--yf-text-primary)",
                  }}
                >
                  {task.sample_essay}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
