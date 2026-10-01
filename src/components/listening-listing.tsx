"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AllFilterTab,
  EmptyListing,
  Pagination,
  PracticeSidebar,
  type ListeningMode,
  type ListeningSectionFilter,
  type SidebarFilterOption,
} from "@/components/practice-listing-shared";
import { getCardLabels, LISTENING_FILTER_GROUPS } from "@/lib/type-labels";

export interface ListeningListingItem {
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

const FILTER_TYPES = LISTENING_FILTER_GROUPS;

const FILTER_OPTIONS: SidebarFilterOption[] = [
  ["GAP_FILLING", "Gap Filling"],
  ["MAP_DIAGRAM_LABEL", "Map, Diagram Label"],
  ["MULTIPLE_CHOICE_ONE", "Multiple Choice (One Answer)"],
  ["MATCHING_INFO", "Matching Information"],
  ["MULTIPLE_CHOICE_MANY", "Multiple Choice (Many Answers)"],
  ["MATCHING", "Matching"],
  ["OTHER", "Other Types"],
].map(([value, label]) => ({ value, label }));

const PAGE_SIZE = 20;

function ListeningFallback({ section }: { section: number }) {
  return (
    <div className={`yf-card-thumb-fallback yf-listening-fallback-${section}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
      </svg>
    </div>
  );
}

function ListeningCard({ item }: { item: ListeningListingItem }) {
  const labels = getCardLabels(item.types);
  return (
    <Link href={`/listening/${item.sectionId}`} className="yf-card">
      <div className="yf-card-thumb">
        {item.thumbnailUrl ? (
          <Image src={item.thumbnailUrl} alt="" fill sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 250px" className="yf-card-image" />
        ) : (
          <ListeningFallback section={item.sectionNumber} />
        )}
        <span className="yf-card-plays">{item.totalQuestions} cau</span>
        <span className={`yf-card-badge yf-badge-s${item.sectionNumber}`}>Section {item.sectionNumber}</span>
      </div>
      <div className="yf-card-body">
        <div className="yf-card-title">{item.title}</div>
        <div className="yf-card-types">
          {labels.map((label) => <span className="yf-card-type" key={label}>{label}</span>)}
        </div>
      </div>
    </Link>
  );
}

function FullListeningCard({ items }: { items: ListeningListingItem[] }) {
  const first = items[0];
  const questionCount = items.reduce((sum, item) => sum + item.totalQuestions, 0);
  const allTypes = Array.from(new Set(items.flatMap((item) => item.types)));
  const labels = getCardLabels(allTypes);
  return (
    <Link href={`/listening/${first.sectionId}`} className="yf-card">
      <div className="yf-card-thumb">
        {first.thumbnailUrl ? (
          <Image src={first.thumbnailUrl} alt="" fill sizes="(max-width: 900px) 50vw, 250px" className="yf-card-image" />
        ) : (
          <ListeningFallback section={1} />
        )}
        <span className="yf-card-plays">{questionCount} cau</span>
        <span className="yf-card-badge yf-badge-full">Full Test</span>
      </div>
      <div className="yf-card-body">
        <div className="yf-card-title">Cambridge {first.book} - Test {first.testNumber}</div>
        <div className="yf-card-types">
          {labels.map((label) => <span className="yf-card-type" key={label}>{label}</span>)}
        </div>
      </div>
    </Link>
  );
}

function matchesSelectedTypes(item: ListeningListingItem, selected: string[]) {
  return selected.length === 0 || selected.some((filter) => (FILTER_TYPES[filter] ?? []).some((type) => item.types.includes(type)));
}

export function ListeningListing({ items }: { items: ListeningListingItem[] }) {
  const [mode, setMode] = useState<ListeningMode>("single");
  const [section, setSection] = useState<ListeningSectionFilter>("all");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  const books = useMemo(() => Array.from(new Set(items.map((item) => item.book))).sort((a, b) => a - b), [items]);
  const filteredItems = useMemo(
    () => selectedSources.length > 0 && !selectedSources.includes("C10-C20")
      ? []
      : items.filter((item) => matchesSelectedTypes(item, selectedTypes)),
    [items, selectedSources, selectedTypes],
  );

  const resetPage = () => setPage(1);
  const toggleType = (value: string) => { resetPage(); setSelectedTypes((cur) => cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]); };
  const toggleSource = (value: string) => { resetPage(); setSelectedSources((cur) => cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]); };

  const flatCards: ListeningListingItem[] | ListeningListingItem[][] = useMemo(() => {
    if (mode === "dictation") return [];
    if (mode === "single") {
      return section === "all" ? filteredItems : filteredItems.filter((i) => i.sectionNumber === section);
    }
    const result: ListeningListingItem[][] = [];
    for (const book of books) {
      const testNumbers = Array.from(new Set(filteredItems.filter((i) => i.book === book).map((i) => i.testNumber))).sort((a, b) => a - b);
      for (const tn of testNumbers) {
        result.push(items.filter((i) => i.book === book && i.testNumber === tn));
      }
    }
    return result;
  }, [mode, section, filteredItems, books, items]);

  const totalItems = flatCards.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const paged = flatCards.slice(start, start + PAGE_SIZE);

  const bookSections = useMemo(() => {
    if (mode === "single") {
      return paged as ListeningListingItem[];
    } else {
      return paged as ListeningListingItem[][];
    }
  }, [paged, mode]);

  return (
    <div className="yf-listing-layout">
      <PracticeSidebar
        activeSkill="listening"
        listeningMode={mode}
        listeningSection={section}
        onListeningModeChange={(m) => { setMode(m); resetPage(); }}
        onListeningSectionChange={(s) => { setSection(s); resetPage(); }}
        selectedSourceFilters={selectedSources}
        onSourceFilterToggle={toggleSource}
        detailFilterTitle="Loại câu hỏi"
        detailFilters={FILTER_OPTIONS}
        selectedDetailFilters={selectedTypes}
        onDetailFilterToggle={toggleType}
      />
      <main className="yf-content">
        <AllFilterTab />
        {mode === "dictation" ? (
          <EmptyListing>Chưa có bài Dictation trong dữ liệu Cambridge 10-20 hiện tại.</EmptyListing>
        ) : (
          <>
            <div className="yf-grid">
              {mode === "single"
                ? (bookSections as ListeningListingItem[]).map((item) => <ListeningCard item={item} key={item.sectionId} />)
                : (bookSections as ListeningListingItem[][]).map((testItems) => <FullListeningCard items={testItems} key={testItems[0].testId} />)}
            </div>
            {filteredItems.length === 0 && <EmptyListing>Không có bài Listening phù hợp với bộ lọc hiện tại.</EmptyListing>}
            {totalPages > 1 && <Pagination current={page} total={totalPages} onChange={setPage} />}
          </>
        )}
      </main>
    </div>
  );
}

