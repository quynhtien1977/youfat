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
  type PassageFilter,
  type ReadingMode,
  type SidebarFilterOption,
} from "@/components/practice-listing-shared";
import { getCardLabels, READING_FILTER_GROUPS } from "@/lib/type-labels";

export interface ReadingListingItem {
  sectionId: string;
  testId: string;
  book: number;
  testNumber: number;
  sectionNumber: number;
  totalQuestions: number;
  title: string;
  types: string[];
  thumbnailUrl: string | null;
}

const FILTER_TYPES = READING_FILTER_GROUPS;

const FILTER_OPTIONS: SidebarFilterOption[] = [
  ["MATCHING_HEADING", "Matching Headings"],
  ["TRUE_FALSE", "True - False - Not Given"],
  ["YES_NO", "Yes - No - Not Given"],
  ["MULTIPLE_CHOICE_ONE", "Multiple Choice (One Answer)"],
  ["MATCHING_INFO", "Matching Information"],
  ["MATCHING_FEATURES", "Matching Features"],
  ["MULTIPLE_CHOICE_MANY", "Multiple Choice (Many Answers)"],
  ["MAP_DIAGRAM_LABEL", "Map, Diagram Label"],
  ["GAP_FILLING", "Gap Filling"],
  ["OTHER", "Other Types"],
].map(([value, label]) => ({ value, label }));

const PAGE_SIZE = 20;

function BookFallback({ passage }: { passage: number }) {
  return (
    <div className={`yf-card-thumb-fallback yf-card-thumb-fallback-${passage}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    </div>
  );
}

function CardBody({ title, types }: { title: string; types: string[] }) {
  const labels = getCardLabels(types);
  return (
    <div className="yf-card-body">
      <div className="yf-card-title">{title}</div>
      <div className="yf-card-types">
        {labels.map((label) => (
          <span key={label} className="yf-card-type">{label}</span>
        ))}
      </div>
    </div>
  );
}

function PassageCard({ item }: { item: ReadingListingItem }) {
  return (
    <Link href={`/reading/${item.sectionId}`} className="yf-card">
      <div className="yf-card-thumb">
        {item.thumbnailUrl ? (
          <Image src={item.thumbnailUrl} alt="" fill sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 250px" className="yf-card-image" />
        ) : (
          <BookFallback passage={item.sectionNumber} />
        )}
        <span className="yf-card-plays">{item.totalQuestions} cau</span>
        <span className={`yf-card-badge yf-badge-${item.sectionNumber}`}>Passage {item.sectionNumber}</span>
      </div>
      <CardBody title={`[C${item.book}T${item.testNumber}] - ${item.title}`} types={item.types} />
    </Link>
  );
}

function FullTestCard({ items }: { items: ReadingListingItem[] }) {
  const first = items[0];
  const questionCount = items.reduce((sum, item) => sum + item.totalQuestions, 0);
  const allTypes = Array.from(new Set(items.flatMap((item) => item.types)));
  return (
    <Link href={`/reading/${first.sectionId}`} className="yf-card">
      <div className="yf-card-thumb">
        {first.thumbnailUrl ? (
          <Image src={first.thumbnailUrl} alt="" fill sizes="(max-width: 900px) 50vw, 250px" className="yf-card-image" />
        ) : (
          <BookFallback passage={1} />
        )}
        <span className="yf-card-plays">{questionCount} cau</span>
        <span className="yf-card-badge yf-badge-full">Full Test</span>
      </div>
      <CardBody title={`Cambridge ${first.book} - Test ${first.testNumber}`} types={allTypes} />
    </Link>
  );
}

function matchesSelectedTypes(item: ReadingListingItem, selected: string[]) {
  return selected.length === 0 || selected.some((filter) => (FILTER_TYPES[filter] ?? []).some((type) => item.types.includes(type)));
}

export function ReadingListing({ items }: { items: ReadingListingItem[] }) {
  const [mode, setMode] = useState<ReadingMode>("single");
  const [passage, setPassage] = useState<PassageFilter>("all");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  const books = useMemo(() => Array.from(new Set(items.map((i) => i.book))).sort((a, b) => a - b), [items]);

  const filteredItems = useMemo(
    () =>
      selectedSources.length > 0 && !selectedSources.includes("C10-C20")
        ? []
        : items.filter((item) => matchesSelectedTypes(item, selectedTypes)),
    [items, selectedSources, selectedTypes],
  );

  const resetPage = () => setPage(1);

  const toggleType = (value: string) => {
    resetPage();
    setSelectedTypes((cur) => (cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]));
  };
  const toggleSource = (value: string) => {
    resetPage();
    setSelectedSources((cur) => (cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]));
  };

  // For single mode: filter by passage; for full mode: group per test
  const flatCards: ReadingListingItem[] | ReadingListingItem[][] = useMemo(() => {
    if (mode === "single") {
      const base = passage === "all" ? filteredItems : filteredItems.filter((i) => i.sectionNumber === passage);
      return base;
    }
    const result: ReadingListingItem[][] = [];
    for (const book of books) {
      const testNumbers = Array.from(
        new Set(filteredItems.filter((i) => i.book === book).map((i) => i.testNumber)),
      ).sort((a, b) => a - b);
      for (const tn of testNumbers) {
        result.push(items.filter((i) => i.book === book && i.testNumber === tn));
      }
    }
    return result;
  }, [mode, passage, filteredItems, books, items]);

  const totalItems = flatCards.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const paged = flatCards.slice(start, start + PAGE_SIZE);

  return (
    <div className="yf-listing-layout">
      <PracticeSidebar
        activeSkill="reading"
        readingMode={mode}
        readingPassage={passage}
        onReadingModeChange={(m) => { setMode(m); resetPage(); }}
        onReadingPassageChange={(p) => { setPassage(p); resetPage(); }}
        selectedSourceFilters={selectedSources}
        onSourceFilterToggle={toggleSource}
        detailFilterTitle="Loại câu hỏi"
        detailFilters={FILTER_OPTIONS}
        selectedDetailFilters={selectedTypes}
        onDetailFilterToggle={toggleType}
      />
      <main className="yf-content">
        <PracticePromo
          title="Phá đảo tất cả dạng đề IELTS cùng YouFat!"
          subtitle={'Chốt đầu vào, mục tiêu, thời gian và nhận Practice Plan được "may đo" miễn phí cho bạn!'}
        />
        <AllFilterTab />
        <div className="yf-grid">
          {mode === "single"
            ? (paged as ReadingListingItem[]).map((item) => <PassageCard item={item} key={item.sectionId} />)
            : (paged as ReadingListingItem[][]).map((testItems) => <FullTestCard items={testItems} key={testItems[0].testId} />)}
        </div>
        {filteredItems.length === 0 && (
          <EmptyListing>Không có bài Reading phù hợp với bộ lọc hiện tại.</EmptyListing>
        )}
        {totalPages > 1 && <Pagination current={page} total={totalPages} onChange={setPage} />}
      </main>
    </div>
  );
}

