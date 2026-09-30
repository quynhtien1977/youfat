"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AllFilterTab,
  EmptyListing,
  Pagination,
  PracticePromo,
  PracticeSidebar,
  type SidebarFilterOption,
  type WritingTaskFilter,
} from "@/components/practice-listing-shared";

export interface WritingListingItem {
  taskId: string;
  testId: string;
  book: number;
  testNumber: number;
  taskNumber: number;
  title: string;
  prompt: string;
  thumbnailUrl: string | null;
  category: string | null;
}

const WRITING_ICONS: Record<string, string> = {
  "Line Graph": "https://cms.youpass.vn/assets/ff989aa7-ae91-4d20-af00-1ddb08ec36ab?width=1000",
  "Bar Chart": "https://cms.youpass.vn/assets/3c700a46-9d03-4bc2-b8a7-ff99f0a6fbf5?width=1000",
  "Pie Chart": "https://cms.youpass.vn/assets/6f819885-1c00-4a4f-8611-e23614d45737?width=1000",
  "Table": "https://cms.youpass.vn/assets/8869774c-167f-468e-8737-ff19e6d075d7?width=1000",
  "Mixed Graph": "https://cms.youpass.vn/assets/ff989aa7-ae91-4d20-af00-1ddb08ec36ab?width=1000",
  "Map": "https://cms.youpass.vn/assets/9b14e5c9-e6c4-4027-bbaa-09fd1f9fbe01?width=1000",
  "Process": "https://cms.youpass.vn/assets/a3fddb32-b2ee-467b-80c3-0fed660855aa?width=1000",
};

const CATEGORY_OPTIONS: SidebarFilterOption[] = [
  "Line Graph",
  "Bar Chart",
  "Pie Chart",
  "Table",
  "Mixed Graph",
  "Map",
  "Process",
].map((label) => ({ value: label, label, icon: WRITING_ICONS[label] }));

const PAGE_SIZE = 20;

function WritingFallback({ task }: { task: number }) {
  return (
    <div className={`yf-writing-fallback yf-writing-fallback-${task}`} aria-hidden="true">
      {task === 1 ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 19V9m6 10V5m6 14v-7m4 7H2" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      )}
    </div>
  );
}

function WritingCard({ item }: { item: WritingListingItem }) {
  return (
    <Link href={`/writing/${item.taskId}`} className="yf-writing-card">
      <div className="yf-writing-card-thumb">
        {item.thumbnailUrl ? (
          <Image
            src={item.thumbnailUrl}
            alt=""
            fill
            sizes="(max-width: 700px) 34vw, 150px"
            className="yf-card-image"
          />
        ) : (
          <WritingFallback task={item.taskNumber} />
        )}
        <span className="yf-writing-card-tag">{item.category ?? `Task ${item.taskNumber}`}</span>
      </div>
      <div className="yf-writing-card-body">
        <div className="yf-writing-card-title">{item.title}</div>
        <p className="yf-writing-card-prompt">{item.prompt}</p>
      </div>
    </Link>
  );
}

export function WritingListing({ items }: { items: WritingListingItem[] }) {
  const [taskFilter, setTaskFilter] = useState<WritingTaskFilter>("all");
  const [categories, setCategories] = useState<string[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  const sourceMatches = sources.length === 0 || sources.includes("C10-C20");

  const visibleItems = useMemo(
    () =>
      items.filter(
        (item) =>
          sourceMatches &&
          (taskFilter === "all" || item.taskNumber === taskFilter) &&
          (categories.length === 0 ||
            Boolean(item.category && categories.includes(item.category))),
      ),
    [categories, items, sourceMatches, taskFilter],
  );

  const totalPages = Math.max(1, Math.ceil(visibleItems.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const paged = visibleItems.slice(start, start + PAGE_SIZE);

  const resetPage = () => setPage(1);
  const toggleCategory = (value: string) => {
    resetPage();
    setCategories((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  };
  const toggleSource = (value: string) => {
    resetPage();
    setSources((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  };

  return (
    <div className="yf-listing-layout">
      <PracticeSidebar
        activeSkill="writing"
        writingTask={taskFilter}
        onWritingTaskChange={(t) => {
          setTaskFilter(t);
          resetPage();
        }}
        selectedSourceFilters={sources}
        onSourceFilterToggle={toggleSource}
        detailFilterTitle="Dạng đề"
        detailFilters={CATEGORY_OPTIONS}
        selectedDetailFilters={categories}
        onDetailFilterToggle={toggleCategory}
      />
      <main className="yf-content">
        <PracticePromo
          title="Phá đảo tất cả dạng đề IELTS cùng YouFat!"
          subtitle={'Chốt đầu vào, mục tiêu, thời gian và nhận Practice Plan được "may đo" miễn phí cho bạn!'}
        />
        <AllFilterTab />
        <div className="yf-writing-grid">
          {paged.map((item) => (
            <WritingCard item={item} key={item.taskId} />
          ))}
        </div>
        {visibleItems.length === 0 && (
          <EmptyListing>Không có bài Writing phù hợp với bộ lọc hiện tại.</EmptyListing>
        )}
        {totalPages > 1 && <Pagination current={page} total={totalPages} onChange={setPage} />}
      </main>
    </div>
  );
}
