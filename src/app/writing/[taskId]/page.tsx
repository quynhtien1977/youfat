"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { RotateCcw, CheckCircle2, AlertTriangle, ArrowLeft, GripVertical, Laptop } from "lucide-react";
import { supabase } from "@/lib/supabase";

// ============================================================
// /writing/[taskId] – Writing Practice Room
// Faithful clone of YouPass Writing experience:
// - Left: Rounded-3xl Card, Framed Prompt Box, Chart Image (Task 1)
// - Middle: Resizer Handle (20% - 70%)
// - Right: Rounded-3xl Card with:
//   * Header: "Bài mẫu" Pill Toggle + "Word count: X"
//   * Scrollable Sections: Introduction, Overview/Body 1, Body 2, etc.
//   * Toggle replaces Textareas with green Sample cards in-place
//   * Footer: Stopwatch counting up + "Lưu bài viết" (FREE) + "Sửa bài" (PRO)
// ============================================================

interface SamplePart {
  part_name: string;
  text: string;
}

interface WritingTaskData {
  id: string;
  task_number: number;
  title: string | null;
  prompt: string | null;
  image_url: string | null;
  sample_essay: string | null;
  sample_essay_parts: SamplePart[] | null;
  test_id: string;
}

function countWords(text: string): number {
  if (!text) return 0;
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

const PART_MIN_HEIGHTS: Record<string, number> = {
  Introduction: 62,
  Overview: 80,
  "Body 1": 134,
  "Body 2": 134,
  Conclusion: 62,
};

export default function WritingPracticePage() {
  const params = useParams<{ taskId: string }>();
  const taskId = params.taskId;

  const [task, setTask] = useState<WritingTaskData | null>(null);
  const [testInfo, setTestInfo] = useState<{ book: number; test_number: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User input per section part
  const [userParts, setUserParts] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [showSampleToggle, setShowSampleToggle] = useState(false);
  const [activeTab, setActiveTab] = useState<"sample" | "user" | "compare">("sample");

  // Stopwatch timer (counts UP every second like YouPass)
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Validation warning popover & Word count tooltip
  const [showMinWordWarning, setShowMinWordWarning] = useState(false);
  const [isWcHovered, setIsWcHovered] = useState(false);

  // Resizer state (default 38% for Left Pane matching YouPass)
  const [splitPos, setSplitPos] = useState(38);
  const isDraggingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newPos = ((e.clientX - rect.left) / rect.width) * 100;
      if (newPos >= 20 && newPos <= 70) {
        setSplitPos(newPos);
      }
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // Fetch task data
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

      // Load draft from localStorage if present
      try {
        const saved = localStorage.getItem(`yf_writing_draft_${taskId}`);
        if (saved) {
          setUserParts(JSON.parse(saved));
        }
      } catch {}

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

  // Stopwatch effect (counts up 00:00:00 -> 00:00:01)
  useEffect(() => {
    if (submitted) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [submitted]);

  // Format timer as HH:MM:SS
  const formatStopwatch = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Determine section parts
  const sectionParts = useMemo(() => {
    if (!task) return [];
    if (task.sample_essay_parts && Array.isArray(task.sample_essay_parts) && task.sample_essay_parts.length > 0) {
      return task.sample_essay_parts;
    }
    // Fallback if DB doesn't have sample_essay_parts
    if (task.task_number === 1) {
      return [
        { part_name: "Introduction", text: "" },
        { part_name: "Overview", text: "" },
        { part_name: "Body 1", text: "" },
        { part_name: "Body 2", text: "" },
      ];
    } else {
      return [
        { part_name: "Introduction", text: "" },
        { part_name: "Body 1", text: "" },
        { part_name: "Body 2", text: "" },
        { part_name: "Conclusion", text: "" },
      ];
    }
  }, [task]);

  const handlePartChange = (partName: string, value: string) => {
    setUserParts((prev) => {
      const next = { ...prev, [partName]: value };
      try {
        localStorage.setItem(`yf_writing_draft_${taskId}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Total word count
  const totalWordCount = useMemo(() => {
    return Object.values(userParts).reduce((sum, text) => sum + countWords(text), 0);
  }, [userParts]);

  const minWords = task ? MIN_WORDS[task.task_number] ?? 250 : 250;
  const wordOk = totalWordCount >= minWords;

  const fullUserEssay = useMemo(() => {
    return sectionParts
      .map((p) => userParts[p.part_name] || "")
      .filter((text) => text.trim() !== "")
      .join("\n\n");
  }, [sectionParts, userParts]);

  const handleSave = () => {
    if (totalWordCount === 0) return;
    if (totalWordCount < minWords) {
      setShowMinWordWarning(true);
      setTimeout(() => setShowMinWordWarning(false), 5000);
      return;
    }
    setSubmitted(true);
    setActiveTab("sample");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleReset = () => {
    setSubmitted(false);
    setUserParts({});
    setElapsedSeconds(0);
    try {
      localStorage.removeItem(`yf_writing_draft_${taskId}`);
    } catch {}
  };

  if (loading) {
    return (
      <div className="yf-writing-room-loading">
        <div className="yf-writing-room-spinner" />
        <p>Đang tải đề thi Writing…</p>
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

  const sampleWordCount = task.sample_essay ? countWords(task.sample_essay) : 0;
  const topTitle = testInfo
    ? `[C${testInfo.book}T${testInfo.test_number}] Writing Task ${task.task_number}`
    : `Writing Task ${task.task_number}`;

  const spentMinutes = Math.floor(elapsedSeconds / 60);
  const spentSecs = elapsedSeconds % 60;

  return (
    <div className="yf-writing-room-layout">
      {/* ─── Top Navigation Bar ──────────────────────────────── */}
      <header className="yf-writing-room-topbar">
        <Link href="/writing" className="yf-writing-room-back">
          <ArrowLeft size={16} /> Quay lại
        </Link>
        <span className="yf-writing-room-sep">|</span>
        <h1 className="yf-writing-room-title" title={topTitle}>
          ✏️ {topTitle}
        </h1>
        <span className="yf-writing-room-meta">
          {task.task_number === 1 ? "Gợi ý: 20 phút | ≥150 từ" : "Gợi ý: 40 phút | ≥250 từ"}
        </span>
      </header>

      {/* ─── Mobile View Notice (<768px) ────────────────────────── */}
      <div className="yf-writing-mobile-notice">
        <Laptop size={48} className="text-gray-400 mb-4" />
        <h2 className="text-lg font-bold text-gray-800 mb-2">Vui lòng thử ở thiết bị khác</h2>
        <p className="text-sm text-gray-600 max-w-sm leading-relaxed mb-6">
          Tính năng luyện tập Writing hiện chưa hỗ trợ tối ưu trên thiết bị di động. Vui lòng truy cập trên máy tính hoặc laptop để có trải nghiệm học tập tốt nhất.
        </p>
        <Link
          href="/writing"
          className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-200"
        >
          ← Quay về danh sách
        </Link>
      </div>

      {/* ─── Body: Split View (Prompt Card | Resizer | Editor Card) ──────── */}
      <div className="yf-writing-room-body" ref={containerRef}>
        {/* Left – Prompt Panel Card */}
        <div className="yf-writing-pane-left" style={{ width: `${splitPos}%` }}>
          <div className="yf-writing-pane-card">
            <div className="yf-writing-pane-left-scroll">
              {/* Framed Prompt Box (YouPass Style: square corners, gray-400 border, italic font) */}
              <div className="yf-writing-prompt-box">
                <em>
                  <strong>
                    {cleanPrompt(task.prompt) || (
                      <span style={{ color: "var(--yf-text-muted)", fontStyle: "italic" }}>
                        Đề bài đang được cập nhật…
                      </span>
                    )}
                  </strong>
                </em>
              </div>

              {/* Task 1: Chart / Diagram / Map Image (Centered, clean white container) */}
              {task.task_number === 1 && task.image_url && (
                <div className="yf-writing-image-container">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={task.image_url}
                    alt={task.title || "Task 1 Chart Diagram"}
                    className="yf-writing-image"
                  />
                </div>
              )}

              {/* Task 2: Standard closing prompt note */}
              {task.task_number === 2 && (
                <p style={{ fontSize: 13.5, color: "#4b5563", lineHeight: 1.6, marginTop: 12 }}>
                  Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Resizer Handle (Divider with Grip Icon) */}
        <div
          className="yf-writing-resizer"
          onMouseDown={handleMouseDown}
          role="separator"
          aria-valuenow={Math.round(splitPos)}
          aria-valuemin={20}
          aria-valuemax={70}
          title="Kéo để điều chỉnh độ rộng 2 khung"
        >
          <div className="yf-writing-resizer-grip">
            <GripVertical size={11} />
          </div>
        </div>

        {/* Right – Editor / Submission Review Panel Card */}
        <div className="yf-writing-pane-right" style={{ width: `calc(100% - ${splitPos}% - 12px)` }}>
          <div className="yf-writing-pane-card">
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
                        Số từ: <strong>{totalWordCount}</strong> từ ({wordOk ? `Đạt yêu cầu ≥${minWords} từ` : `Chưa đủ ≥${minWords} từ`}) | Thời gian làm bài: <strong>{spentMinutes}m {spentSecs}s</strong>
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
                    ✍️ Bài của bạn ({totalWordCount} từ)
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
                        {totalWordCount} / {minWords}+ từ
                      </span>
                    </div>
                    <div className="yf-writing-essay-box">
                      {fullUserEssay || <span style={{ color: "#9ca3af", fontStyle: "italic" }}>Bạn chưa nhập nội dung.</span>}
                    </div>
                  </div>
                )}

                {/* Tab 3: Side-by-Side Comparison */}
                {activeTab === "compare" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div>
                      <h4 style={{ fontSize: 13, fontWeight: 700, color: "#4b5563", marginBottom: 8 }}>
                        ✍️ Bài của bạn ({totalWordCount} từ)
                      </h4>
                      <div className="yf-writing-essay-box" style={{ minHeight: 380 }}>
                        {fullUserEssay || <span style={{ color: "#9ca3af", fontStyle: "italic" }}>Bạn chưa nhập nội dung.</span>}
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
              /* ─── Practice Mode: Header + Sections + Footer ─── */
              <>
                {/* 1. Sticky Header Bar */}
                <div className="yf-writing-center-header">
                  <div className="yf-writing-toggle-wrapper">
                    <span className="yf-writing-toggle-label">Bài Sample từ YouPass</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={showSampleToggle}
                      onClick={() => setShowSampleToggle((prev) => !prev)}
                      className={`yf-writing-toggle-pill ${showSampleToggle ? "on" : "off"}`}
                      title={showSampleToggle ? "Ẩn bài mẫu để tự viết" : "Xem bài mẫu từng phần"}
                    >
                      <div className={`yf-writing-toggle-knob ${showSampleToggle ? "on" : "off"}`} />
                    </button>
                  </div>

                  <div className="yf-writing-wc-container">
                    {totalWordCount > 0 && !wordOk && (
                      <div
                        className="yf-writing-wc-warning-wrap"
                        onMouseEnter={() => setIsWcHovered(true)}
                        onMouseLeave={() => setIsWcHovered(false)}
                        onClick={() => setIsWcHovered((prev) => !prev)}
                        title="Bấm hoặc rê chuột để xem lưu ý số từ"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          viewBox="0 0 18 18"
                          fill="none"
                          className="w-[18px] h-[18px] shrink-0"
                        >
                          <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M8.854.047c.097-.007.195-.007.292 0 .42.031.76.22 1.07.464.293.229.616.552.994.93l.116.099c.257.22.385.33.54.391.154.062.322.07.66.087l.197.01c.592 0 1.099 0 1.504.054.432.059.84.189 1.171.52.33.33.461.739.52 1.171.054.405.054.911.054 1.504l.01.197c.016.337.025.506.086.66.062.154.172.283.392.54l.098.115c.379.378.702.702.93.994.244.31.433.65.465 1.07.007.098.007.196 0 .293-.032.42-.221.76-.464 1.07-.229.293-.552.616-.93.994l-.1.116c-.22.257-.33.385-.39.54-.062.154-.07.322-.088.66l-.01.197c0 .592 0 1.099-.054 1.504-.058.432-.188.84-.519 1.171-.33.33-.74.461-1.171.52-.405.054-.912.054-1.504.054l-.245.017c-.338.023-.507.035-.66.1-.154.064-.28.177-.533.403l-.075.066c-.378.379-.701.702-.993.93-.311.244-.651.433-1.07.465a1.958 1.958 0 01-.293 0c-.42-.032-.76-.221-1.071-.464-.292-.229-.616-.552-.994-.93l-.115-.1c-.257-.22-.386-.33-.54-.39-.154-.062-.323-.07-.66-.088l-.197-.01c-.593 0-1.1 0-1.504-.054-.432-.058-.84-.188-1.171-.519-.331-.33-.461-.74-.52-1.171-.054-.405-.054-.912-.054-1.504l-.01-.197c-.017-.338-.025-.506-.087-.66-.061-.155-.171-.283-.391-.54l-.099-.116c-.378-.378-.701-.701-.93-.993-.243-.311-.433-.651-.464-1.07a1.958 1.958 0 010-.293c.031-.42.22-.76.464-1.071.229-.292.552-.616.93-.994l.099-.115c.22-.257.33-.386.391-.54.062-.154.07-.323.087-.66l.01-.197c0-.593 0-1.1.054-1.504.059-.432.189-.84.52-1.171.33-.331.739-.461 1.171-.52.405-.054.911-.054 1.504-.054l.244-.017c.339-.023.508-.035.661-.1.153-.065.28-.177.533-.403l.074-.067c.378-.378.702-.701.994-.93.31-.243.65-.433 1.07-.464zm-.12 7.726c.207.027.491.101.733.343.242.242.316.526.343.732.023.17.023.37.023.536v3.366a.833.833 0 01-1.667 0V9.417a.833.833 0 010-1.667H8.2c.167 0 .365 0 .536.023zm.262-3.356a.831.831 0 00-.83.833c0 .46.372.833.83.833h.007c.459 0 .83-.373.83-.833a.831.831 0 00-.83-.833h-.007z"
                            fill="#FF3B30"
                          />
                        </svg>

                        {(isWcHovered || showMinWordWarning) && (
                          <div className="yf-writing-wc-tooltip-dropdown">
                            <div className="yf-writing-wc-tooltip-card">
                              <div className="yf-writing-wc-tooltip-arrow">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="28"
                                  height="8"
                                  viewBox="0 0 28 8"
                                  fill="none"
                                >
                                  <path
                                    fillRule="evenodd"
                                    clipRule="evenodd"
                                    d="M28 8L25.2683 8C25.2683 8 25.2683 8 25.2683 8C25.2683 8 22.5366 8 20.4878 5.97895C18.439 3.9579 17.7561 2.94737 16.3902 1.26316C15.0244 -0.421052 14.3415 -0.421052 12.9756 1.26316C11.6098 2.94737 10.2439 4.63158 8.87805 5.97895C7.5122 7.32632 6.82927 8 3.41463 8C-1.90735e-06 8 0 8 0 8L28 8Z"
                                    fill="#FF6D3A"
                                  />
                                </svg>
                              </div>
                              <div className="yf-writing-wc-tooltip-text">
                                Bạn cần viết tối thiểu{" "}
                                <span className="font-bold">{minWords} từ</span>, AI sẽ không
                                thể chấm chữa nếu bài chưa đủ số{" "}
                                <span className="font-bold">từ tối thiểu</span> và có chứa{" "}
                                <span className="font-bold">
                                  ngôn ngữ khác ngoài tiếng Anh.
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <span className="yf-writing-word-counter">
                      Word count: {totalWordCount}
                    </span>
                  </div>
                </div>

                {/* 2. Scrollable Sections Area */}
                <div className="yf-writing-pane-right-scroll">
                  {sectionParts.map((part) => {
                    const minH = PART_MIN_HEIGHTS[part.part_name] ?? 100;
                    return (
                      <div key={part.part_name} className="yf-writing-section-card">
                        <div className="yf-writing-section-label">
                          {part.part_name}
                        </div>

                        {showSampleToggle ? (
                          /* Sample Essay Card for this part */
                          <div className="yf-writing-part-sample" style={{ minHeight: minH }}>
                            {part.text || (
                              <span style={{ color: "#9ca3af", fontStyle: "italic" }}>
                                Chưa có nội dung mẫu cho phần này.
                              </span>
                            )}
                          </div>
                        ) : (
                          /* User Input Textarea for this part */
                          <div
                            className="yf-writing-textarea-container"
                            style={{ minHeight: minH }}
                          >
                            <textarea
                              id={part.part_name.toLowerCase().replace(/\s+/g, "_")}
                              value={userParts[part.part_name] || ""}
                              onChange={(e) => handlePartChange(part.part_name, e.target.value)}
                              placeholder="Nhập phần viết của bạn ở đây"
                              className="yf-writing-part-textarea"
                              style={{ minHeight: minH - 2 }}
                              spellCheck={false}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* 3. Footer Bar */}
                <div className="yf-writing-center-footer">
                  <div className="yf-writing-footer-timer">
                    Thời gian:
                    <p>{formatStopwatch(elapsedSeconds)}</p>
                  </div>

                  <div className="yf-writing-footer-buttons">
                    <button
                      type="button"
                      onClick={handleSave}
                      className={`yf-writing-save-btn ${totalWordCount > 0 ? "active" : "inactive"}`}
                      title={totalWordCount === 0 ? "Hãy viết bài trước khi lưu" : "Lưu bài viết"}
                    >
                      Lưu bài viết
                      <div className="yf-writing-free-badge">FREE</div>
                    </button>

                    <button
                      type="button"
                      disabled
                      title="Tính năng sửa bài AI sắp ra mắt"
                      className="yf-writing-edit-btn"
                    >
                      <span>Sửa bài</span>
                      <div className="yf-writing-pro-badge">PRO</div>
                    </button>

                    {/* Minimum word warning popover */}
                    {showMinWordWarning && (
                      <div className="yf-writing-warning-popover">
                        <strong>Chưa đủ số từ tối thiểu</strong>
                        <p>
                          Bạn cần viết tối thiểu {minWords} từ, AI sẽ không thể chấm chữa nếu bài chưa đủ số từ tối thiểu và có chứa ngôn ngữ khác ngoài tiếng Anh.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
