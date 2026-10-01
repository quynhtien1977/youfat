"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

export type PracticeSkill = "reading" | "listening" | "writing" | "speaking";
export type ReadingMode = "single" | "full";
export type ListeningMode = "single" | "full" | "dictation";
export type SpeakingMode = "single" | "full" | "shadowing";
export type PassageFilter = "all" | 1 | 2 | 3;
export type ListeningSectionFilter = "all" | 1 | 2 | 3 | 4;
export type WritingTaskFilter = "all" | 1 | 2;
export type SpeakingPartFilter = "all" | 1 | 2 | 3;

export interface SidebarFilterOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: string;
}

interface PracticeSidebarProps {
  activeSkill: PracticeSkill;
  readingMode?: ReadingMode;
  readingPassage?: PassageFilter;
  onReadingModeChange?: (mode: ReadingMode) => void;
  onReadingPassageChange?: (passage: PassageFilter) => void;
  listeningMode?: ListeningMode;
  listeningSection?: ListeningSectionFilter;
  onListeningModeChange?: (mode: ListeningMode) => void;
  onListeningSectionChange?: (section: ListeningSectionFilter) => void;
  writingTask?: WritingTaskFilter;
  onWritingTaskChange?: (task: WritingTaskFilter) => void;
  speakingMode?: SpeakingMode;
  speakingPart?: SpeakingPartFilter;
  onSpeakingModeChange?: (mode: SpeakingMode) => void;
  onSpeakingPartChange?: (part: SpeakingPartFilter) => void;
  detailFilterTitle?: string;
  detailFilters?: SidebarFilterOption[];
  selectedDetailFilters?: readonly string[];
  onDetailFilterToggle?: (value: string) => void;
  selectedSourceFilters?: readonly string[];
  onSourceFilterToggle?: (value: string) => void;
}

const GROUPS = [
  { skill: "reading", label: "Reading", href: "/reading", icon: "/nav_reading.webp", options: ["Bài lẻ", "Full đề"] },
  { skill: "listening", label: "Listening", href: "/listening", icon: "/nav_listening.webp", options: ["Bài lẻ", "Full đề", "Dictation"] },
  { skill: "writing", label: "Writing", href: "/writing", icon: "/nav_writing.svg", options: ["Bài lẻ"] },
  { skill: "speaking", label: "Speaking", href: "/speaking", icon: "/nav_speaking.webp", options: ["Bài lẻ", "Full đề", "Shadowing"] },
] as const;

const SOURCE_FILTERS: Record<PracticeSkill, SidebarFilterOption[]> = {
  reading: ["YouPass PRO", "YouPass Simulation", "YouPass Collect đề thi", "C10-C20", "Actual Tests", "Các nguồn khác"].map((label) => ({ value: label, label })),
  listening: ["YouPass PRO", "YouPass Simulation", "YouPass Collect đề thi", "C10-C20", "Actual Tests", "Các nguồn khác"].map((label) => ({ value: label, label })),
  writing: ["YouPass Collect đề thi", "Actual Tests", "Forecast T9-12/2025", "IELTS Insights", "C10-C20"].map((label) => ({ value: label, label })),
  speaking: ["Đề thường gặp", "Đề mới quý này", "Đề giữ từ quý trước"].map((label) => ({ value: label, label })),
};

function RadioMark({ checked }: { checked: boolean }) {
  return (
    <span className={`yf-sidebar-radio${checked ? " checked" : ""}`} aria-hidden="true">
      {checked && <span className="yf-sidebar-radio-inner" />}
    </span>
  );
}

function CheckboxMark({ checked }: { checked: boolean }) {
  return (
    <span className={`yf-sidebar-checkbox-mark${checked ? " checked" : ""}`} aria-hidden="true">
      {checked && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </span>
  );
}

function SourceInfoTooltip() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className="yf-source-tooltip-wrapper"
      onClick={(e) => e.stopPropagation()}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        className="yf-source-tooltip-trigger"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        aria-label="Thông tin về các nguồn tài liệu"
        aria-expanded={isOpen}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <g>
            <path
              d="M14.667 8A6.667 6.667 0 1 1 1.333 8a6.667 6.667 0 0 1 13.334 0Z"
              stroke="currentColor"
              strokeWidth="1.25"
            />
            <path
              d="M8.163 11.333V8c0-.314 0-.471-.098-.569-.097-.098-.254-.098-.569-.098"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M7.996 5.333h.006"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </svg>
      </button>

      {isOpen && (
        <div className="yf-source-tooltip-popover" role="tooltip">
          <div className="yf-source-tooltip-arrow" aria-hidden="true" />
          <ul className="yf-source-tooltip-list">
            <li>
              <span className="yf-tooltip-tag">[YouPass PRO]</span>: Giải pháp <strong>THOÁT KẸT BAND</strong>. Luyện tập theo Logical Framework, hiểu chính xác từng bước làm bài và phân tích lỗi sai giúp tăng band bền vững.
            </li>
            <li>
              <span className="yf-tooltip-tag">[YouPass Simulation]</span>: Bộ đề mô phỏng do đội ngũ chuyên môn biên soạn bám sát xu hướng và độ khó của đề thi thực tế.
            </li>
            <li>
              <span className="yf-tooltip-tag">[YouPass Collect]</span>: Đề thi thật trong 6 tháng gần đây, được cộng đồng học viên tổng hợp và báo về.
            </li>
            <li>
              <span className="yf-tooltip-tag">[Actual Tests]</span>: Các bộ đề thi thật đã từng ra trước đây, phù hợp để mở rộng vốn từ và rèn luyện kỹ năng.
            </li>
            <li>
              <span className="yf-tooltip-tag">[C10 - C20]</span>: Bộ đề kinh điển Cambridge IELTS 10 - 20 chuẩn quốc tế, tài liệu luyện thi cốt lõi.
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

function NestedOptions({ kind, values, selected, onChange }: { kind: "Passage" | "Section" | "Task" | "Part"; values: readonly number[]; selected: number | "all"; onChange?: (value: number) => void }) {
  return (
    <div className="yf-sidebar-nested" role="radiogroup" aria-label={`Lọc theo ${kind}`}>
      {values.map((value) => (
        <button type="button" className={`yf-sidebar-sub-item yf-sidebar-nested-item${selected === value ? " active" : ""}`} role="radio" aria-checked={selected === value} onClick={() => onChange?.(value)} key={value}>
          <RadioMark checked={selected === value} />
          <span className="yf-sidebar-sub-label">{kind} {value}</span>
        </button>
      ))}
    </div>
  );
}

function SidebarCheckboxGroup({
  title,
  options,
  selected = [],
  onToggle,
  showInfo,
}: {
  title: string;
  options: SidebarFilterOption[];
  selected?: readonly string[];
  onToggle?: (value: string) => void;
  showInfo?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const headingId = `sidebar-${title.replaceAll(" ", "-").toLowerCase()}`;
  return (
    <section className={`yf-sidebar-filter-group${isOpen ? " is-open" : " is-closed"}`} aria-labelledby={headingId}>
      <div
        className="yf-sidebar-filter-title"
        onClick={() => setIsOpen((prev) => !prev)}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }
        }}
      >
        <span className="yf-sidebar-filter-title-text" id={headingId}>
          <span>{title}</span>
          {showInfo && <SourceInfoTooltip />}
        </span>
        <span className={`yf-sidebar-chevron-btn${isOpen ? " is-open" : ""}`} aria-hidden="true">
          <svg
            width="20"
            height="20"
            viewBox="0 0 12 12"
            fill="currentColor"
            className={`yf-sidebar-chevron-icon${isOpen ? " is-open" : ""}`}
            aria-hidden="true"
          >
            <path d="M9.35494 4.10493C9.30846 4.05807 9.25316 4.02087 9.19223 3.99548C9.1313 3.9701 9.06595 3.95703 8.99994 3.95703C8.93393 3.95703 8.86858 3.9701 8.80765 3.99548C8.74672 4.02087 8.69142 4.05807 8.64494 4.10493L6.35494 6.39493C6.30846 6.44179 6.25316 6.47899 6.19223 6.50437C6.1313 6.52976 6.06594 6.54282 5.99994 6.54282C5.93393 6.54282 5.86858 6.52976 5.80765 6.50437C5.74672 6.47899 5.69142 6.44179 5.64494 6.39493L3.35494 4.10493C3.30846 4.05807 3.25316 4.02087 3.19223 3.99548C3.1313 3.9701 3.06594 3.95703 2.99994 3.95703C2.93393 3.95703 2.86858 3.9701 2.80765 3.99548C2.74672 4.02087 2.69142 4.05807 2.64494 4.10493C2.55181 4.19861 2.49954 4.32534 2.49954 4.45743C2.49954 4.58952 2.55181 4.71625 2.64494 4.80993L4.93994 7.10492C5.22119 7.38582 5.60244 7.5436 5.99994 7.5436C6.39744 7.5436 6.77869 7.38582 7.05994 7.10492L9.35494 4.80993C9.44806 4.71625 9.50034 4.58952 9.50034 4.45743C9.50034 4.32534 9.44806 4.19861 9.35494 4.10493Z" />
          </svg>
        </span>
      </div>
      {isOpen && (
        <div className="yf-sidebar-filter-options">
          {options.map((option) => (
            <label
              className={`yf-sidebar-check${option.disabled ? " disabled" : ""}`}
              title={option.disabled ? "Chưa có dữ liệu trong phạm vi Cambridge 10-20" : undefined}
              key={option.value}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={selected.includes(option.value)}
                disabled={option.disabled}
                onChange={() => onToggle?.(option.value)}
              />
              <CheckboxMark checked={selected.includes(option.value)} />
              {option.icon && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={option.icon} alt="" className="yf-sidebar-filter-icon" />
              )}
              <span className="yf-sidebar-check-label">{option.label}</span>
            </label>
          ))}
        </div>
      )}
    </section>
  );
}

export function PracticeSidebar(props: PracticeSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const {
    activeSkill,
    readingMode = "single",
    readingPassage = "all",
    listeningMode = "single",
    listeningSection = "all",
    writingTask = "all",
    speakingMode = "single",
    speakingPart = "all",
    detailFilterTitle,
    detailFilters = [],
    selectedDetailFilters = [],
    selectedSourceFilters = [],
  } = props;

  return (
    <aside className={`yf-sidebar${isCollapsed ? " is-collapsed" : ""}`} aria-label="Bộ lọc luyện tập">
      {/* Sidebar header: funnel icon + collapse arrow toggle */}
      <div className="yf-sidebar-header-row">
        <button
          type="button"
          className="yf-sidebar-toggle-btn"
          onClick={() => setIsCollapsed((prev) => !prev)}
          title={isCollapsed ? "Mở rộng bộ lọc" : "Thu gọn bộ lọc"}
          aria-label={isCollapsed ? "Mở rộng bộ lọc" : "Thu gọn bộ lọc"}
          aria-expanded={!isCollapsed}
        >
          <span className="yf-sidebar-funnel-icon" aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
              <path d="M3 5h14M6 10h8M9 15h2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </span>
          <span className={`yf-sidebar-collapse-arrow${isCollapsed ? " is-collapsed" : ""}`} aria-hidden="true">
            <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
              <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>
      </div>

      <div className="yf-sidebar-body">
        {GROUPS.map((group) => {
          const active = group.skill === activeSkill;
          return (
            <section className={`yf-sidebar-group${active ? " is-active" : ""}`} key={group.skill}>
              <Link href={group.href} className={`yf-sidebar-group-header${active ? " active" : ""}`}>
                <Image src={group.icon} alt="" width={16} height={16} />
                <span>{group.label}</span>
              </Link>
              <div className="yf-sidebar-sub">
                {group.skill === "reading" && active ? (
                  <div role="radiogroup" aria-label="Kiểu bài Reading">
                    <button type="button" className={`yf-sidebar-sub-item${readingMode === "single" ? " active" : ""}`} role="radio" aria-checked={readingMode === "single"} onClick={() => { props.onReadingModeChange?.("single"); props.onReadingPassageChange?.("all"); }}>
                      <RadioMark checked={readingMode === "single"} />
                      <span className="yf-sidebar-sub-label">Bài lẻ</span>
                    </button>
                    {readingMode === "single" && <NestedOptions kind="Passage" values={[1, 2, 3]} selected={readingPassage} onChange={(value) => props.onReadingPassageChange?.(value as 1 | 2 | 3)} />}
                    <button type="button" className={`yf-sidebar-sub-item${readingMode === "full" ? " active" : ""}`} role="radio" aria-checked={readingMode === "full"} onClick={() => props.onReadingModeChange?.("full")}>
                      <RadioMark checked={readingMode === "full"} />
                      <span className="yf-sidebar-sub-label">Full đề</span>
                    </button>
                  </div>
                ) : group.skill === "listening" && active ? (
                  <div role="radiogroup" aria-label="Kiểu bài Listening">
                    <button type="button" className={`yf-sidebar-sub-item${listeningMode === "single" ? " active" : ""}`} role="radio" aria-checked={listeningMode === "single"} onClick={() => { props.onListeningModeChange?.("single"); props.onListeningSectionChange?.("all"); }}>
                      <RadioMark checked={listeningMode === "single"} />
                      <span className="yf-sidebar-sub-label">Bài lẻ</span>
                    </button>
                    {listeningMode === "single" && <NestedOptions kind="Section" values={[1, 2, 3, 4]} selected={listeningSection} onChange={(value) => props.onListeningSectionChange?.(value as 1 | 2 | 3 | 4)} />}
                    {(["full", "dictation"] as const).map((mode) => (
                      <button type="button" className={`yf-sidebar-sub-item${listeningMode === mode ? " active" : ""}`} role="radio" aria-checked={listeningMode === mode} onClick={() => props.onListeningModeChange?.(mode)} key={mode}>
                        <RadioMark checked={listeningMode === mode} />
                        <span className="yf-sidebar-sub-label">{mode === "full" ? "Full đề" : "Dictation"}</span>
                      </button>
                    ))}
                  </div>
                ) : group.skill === "writing" && active ? (
                  <div role="radiogroup" aria-label="Kiểu bài Writing">
                    <button type="button" className="yf-sidebar-sub-item active" role="radio" aria-checked="true" onClick={() => props.onWritingTaskChange?.("all")}>
                      <RadioMark checked />
                      <span className="yf-sidebar-sub-label">Bài lẻ</span>
                    </button>
                    <NestedOptions kind="Task" values={[1, 2]} selected={writingTask} onChange={(value) => props.onWritingTaskChange?.(value as 1 | 2)} />
                  </div>
                ) : group.skill === "speaking" && active ? (
                  <div role="radiogroup" aria-label="Kiểu bài Speaking">
                    <button type="button" className={`yf-sidebar-sub-item${speakingMode === "single" ? " active" : ""}`} role="radio" aria-checked={speakingMode === "single"} onClick={() => { props.onSpeakingModeChange?.("single"); props.onSpeakingPartChange?.("all"); }}>
                      <RadioMark checked={speakingMode === "single"} />
                      <span className="yf-sidebar-sub-label">Bài lẻ</span>
                    </button>
                    {speakingMode === "single" && <NestedOptions kind="Part" values={[1, 2, 3]} selected={speakingPart} onChange={(value) => props.onSpeakingPartChange?.(value as 1 | 2 | 3)} />}
                    {(["full", "shadowing"] as const).map((mode) => (
                      <button type="button" className={`yf-sidebar-sub-item${speakingMode === mode ? " active" : ""}`} role="radio" aria-checked={speakingMode === mode} onClick={() => props.onSpeakingModeChange?.(mode)} key={mode}>
                        <RadioMark checked={speakingMode === mode} />
                        <span className="yf-sidebar-sub-label">{mode === "full" ? "Full đề" : "Shadowing"}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  group.options.map((label) => (
                    <Link href={group.href} className="yf-sidebar-sub-item" key={label}>
                      <RadioMark checked={false} />
                      <span className="yf-sidebar-sub-label">{label}</span>
                    </Link>
                  ))
                )}
              </div>
            </section>
          );
        })}

        <SidebarCheckboxGroup
          title="Nguồn tài liệu"
          options={SOURCE_FILTERS[activeSkill]}
          selected={selectedSourceFilters}
          onToggle={props.onSourceFilterToggle}
          showInfo
        />
        {detailFilterTitle && detailFilters.length > 0 && (
          <SidebarCheckboxGroup
            title={detailFilterTitle}
            options={detailFilters}
            selected={selectedDetailFilters}
            onToggle={props.onDetailFilterToggle}
          />
        )}
      </div>
    </aside>
  );
}

export function AllFilterTab() {
  return (
    <div className="yf-filter-tabs">
      <span className="yf-filter-tab active">Tất cả</span>
    </div>
  );
}

export function PracticePromo({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <section className="yf-promo" aria-label="Practice Plan">
      <Image src="/mascot.webp" alt="" width={44} height={44} className="yf-promo-mascot" />
      <div className="yf-promo-text">
        <div className="yf-promo-title">{title}</div>
        <div className="yf-promo-subtitle">{subtitle}</div>
      </div>
      <button type="button" className="yf-promo-btn">Tạo Practice Plan</button>
    </section>
  );
}

export function EmptyListing({ children }: { children: ReactNode }) {
  return <div className="yf-listing-empty" role="status">{children}</div>;
}

/** YouPass-style numbered pagination with ellipsis */
export function Pagination({ current, total, onChange }: { current: number; total: number; onChange: (page: number) => void }) {
  const pages: (number | "...")[] = [];
  pages.push(1);
  const rangeStart = Math.max(2, current - 1);
  const rangeEnd = Math.min(total - 1, current + 1);
  if (rangeStart > 2) pages.push("...");
  for (let p = rangeStart; p <= rangeEnd; p++) pages.push(p);
  if (rangeEnd < total - 1) pages.push("...");
  if (total > 1) pages.push(total);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <nav className="yf-pagination" aria-label="Phân trang">
      <button
        className={`yf-page-nav${current === 1 ? " disabled" : ""}`}
        onClick={() => { if (current > 1) { onChange(current - 1); scrollTop(); } }}
        disabled={current === 1}
        aria-label="Trang trước"
      >
        <svg viewBox="0 0 16 16" fill="none" width="14" height="14" aria-hidden="true">
          <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>Trang trước</span>
      </button>

      <div className="yf-page-numbers">
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="yf-page-ellipsis">…</span>
          ) : (
            <button
              key={p}
              className={`yf-page-num${p === current ? " active" : ""}`}
              onClick={() => { onChange(p as number); scrollTop(); }}
              aria-label={`Trang ${p}`}
              aria-current={p === current ? "page" : undefined}
            >
              {p}
            </button>
          ),
        )}
      </div>

      <button
        className={`yf-page-nav${current === total ? " disabled" : ""}`}
        onClick={() => { if (current < total) { onChange(current + 1); scrollTop(); } }}
        disabled={current === total}
        aria-label="Trang sau"
      >
        <span>Trang sau</span>
        <svg viewBox="0 0 16 16" fill="none" width="14" height="14" aria-hidden="true">
          <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </nav>
  );
}

