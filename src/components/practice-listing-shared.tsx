"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

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
  return <span className={`yf-sidebar-radio${checked ? " checked" : ""}`} aria-hidden="true" />;
}

function NestedOptions({ kind, values, selected, onChange }: { kind: "Passage" | "Section" | "Task" | "Part"; values: readonly number[]; selected: number | "all"; onChange?: (value: number) => void }) {
  return (
    <div className="yf-sidebar-nested" role="radiogroup" aria-label={`Loc theo ${kind}`}>
      {values.map((value) => (
        <button type="button" className={`yf-sidebar-sub-item yf-sidebar-nested-item${selected === value ? " active" : ""}`} role="radio" aria-checked={selected === value} onClick={() => onChange?.(value)} key={value}>
          <RadioMark checked={selected === value} />{kind} {value}
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
  const headingId = `sidebar-${title.replaceAll(" ", "-").toLowerCase()}`;
  return (
    <section className="yf-sidebar-filter-group" aria-labelledby={headingId}>
      <h2 className="yf-sidebar-filter-title" id={headingId}>
        <span className="yf-sidebar-filter-title-text">
          {title}
          {showInfo && (
            <span className="yf-sidebar-info-icon" title="Nguồn tài liệu đề bài: C10-C20 là Cambridge IELTS sách 10-20" aria-label="Thông tin về nguồn tài liệu">
              <svg viewBox="0 0 20 20" fill="none" width="14" height="14" aria-hidden="true">
                <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
                <path d="M10 9v5M10 7h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </span>
          )}
        </span>
        <span aria-hidden="true" className="yf-sidebar-chevron">
          <svg viewBox="0 0 16 16" fill="none" width="14" height="14" aria-hidden="true">
            <path d="M4 10l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </h2>
      <div className="yf-sidebar-filter-options">
        {options.map((option) => (
          <label
            className={`yf-sidebar-check${option.disabled ? " disabled" : ""}`}
            title={option.disabled ? "Chưa có dữ liệu trong phạm vi Cambridge 10-20" : undefined}
            key={option.value}
          >
            <input type="checkbox" checked={selected.includes(option.value)} disabled={option.disabled} onChange={() => onToggle?.(option.value)} />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </section>
  );
}

export function PracticeSidebar(props: PracticeSidebarProps) {
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
    <aside className="yf-sidebar" aria-label="Bộ lọc luyện tập">
      {/* Sidebar header: funnel icon + collapse arrow */}
      <div className="yf-sidebar-header-row">
        <span className="yf-sidebar-funnel-icon" aria-hidden="true">
          <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
            <path d="M3 5h14M6 10h8M9 15h2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        </span>
        <span className="yf-sidebar-collapse-arrow" aria-hidden="true">
          <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
            <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>

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
                <div role="radiogroup" aria-label="Kieu bai Reading">
                  <button type="button" className={`yf-sidebar-sub-item${readingMode === "single" ? " active" : ""}`} role="radio" aria-checked={readingMode === "single"} onClick={() => { props.onReadingModeChange?.("single"); props.onReadingPassageChange?.("all"); }}>
                    <RadioMark checked={readingMode === "single"} />Bài lẻ
                  </button>
                  {readingMode === "single" && <NestedOptions kind="Passage" values={[1, 2, 3]} selected={readingPassage} onChange={(value) => props.onReadingPassageChange?.(value as 1 | 2 | 3)} />}
                  <button type="button" className={`yf-sidebar-sub-item${readingMode === "full" ? " active" : ""}`} role="radio" aria-checked={readingMode === "full"} onClick={() => props.onReadingModeChange?.("full")}>
                    <RadioMark checked={readingMode === "full"} />Full đề
                  </button>
                </div>
              ) : group.skill === "listening" && active ? (
                <div role="radiogroup" aria-label="Kieu bai Listening">
                  <button type="button" className={`yf-sidebar-sub-item${listeningMode === "single" ? " active" : ""}`} role="radio" aria-checked={listeningMode === "single"} onClick={() => { props.onListeningModeChange?.("single"); props.onListeningSectionChange?.("all"); }}>
                    <RadioMark checked={listeningMode === "single"} />Bài lẻ
                  </button>
                  {listeningMode === "single" && <NestedOptions kind="Section" values={[1, 2, 3, 4]} selected={listeningSection} onChange={(value) => props.onListeningSectionChange?.(value as 1 | 2 | 3 | 4)} />}
                  {(["full", "dictation"] as const).map((mode) => (
                    <button type="button" className={`yf-sidebar-sub-item${listeningMode === mode ? " active" : ""}`} role="radio" aria-checked={listeningMode === mode} onClick={() => props.onListeningModeChange?.(mode)} key={mode}>
                      <RadioMark checked={listeningMode === mode} />{mode === "full" ? "Full đề" : "Dictation"}
                    </button>
                  ))}
                </div>
              ) : group.skill === "writing" && active ? (
                <div role="radiogroup" aria-label="Kieu bai Writing">
                  <button type="button" className="yf-sidebar-sub-item active" role="radio" aria-checked="true" onClick={() => props.onWritingTaskChange?.("all")}>
                    <RadioMark checked />Bài lẻ
                  </button>
                  <NestedOptions kind="Task" values={[1, 2]} selected={writingTask} onChange={(value) => props.onWritingTaskChange?.(value as 1 | 2)} />
                </div>
              ) : group.skill === "speaking" && active ? (
                <div role="radiogroup" aria-label="Kieu bai Speaking">
                  <button type="button" className={`yf-sidebar-sub-item${speakingMode === "single" ? " active" : ""}`} role="radio" aria-checked={speakingMode === "single"} onClick={() => { props.onSpeakingModeChange?.("single"); props.onSpeakingPartChange?.("all"); }}>
                    <RadioMark checked={speakingMode === "single"} />Bài lẻ
                  </button>
                  {speakingMode === "single" && <NestedOptions kind="Part" values={[1, 2, 3]} selected={speakingPart} onChange={(value) => props.onSpeakingPartChange?.(value as 1 | 2 | 3)} />}
                  {(["full", "shadowing"] as const).map((mode) => (
                    <button type="button" className={`yf-sidebar-sub-item${speakingMode === mode ? " active" : ""}`} role="radio" aria-checked={speakingMode === mode} onClick={() => props.onSpeakingModeChange?.(mode)} key={mode}>
                      <RadioMark checked={speakingMode === mode} />{mode === "full" ? "Full đề" : "Shadowing"}
                    </button>
                  ))}
                </div>
              ) : (
                group.options.map((label) => (
                  <Link href={group.href} className="yf-sidebar-sub-item" key={label}>
                    <RadioMark checked={false} />{label}
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

