import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { YouFatNavbar } from "@/components/navbar";

export const metadata = {
  title: "Luyện thi Listening IELTS – YouFat",
  description: "175 Listening sections Cambridge 10-20. Luyện thi tự chấm điểm.",
};

interface SectionRow {
  id: string;
  title: string;
  section_title: string | null;
  section_number: number;
  total_questions: number;
  test_id: string;
  audio_url: string | null;
}
interface TestRow {
  id: string;
  book: number;
  test_number: number;
  title: string;
}

const TYPE_LABELS: Record<string, string> = {
  SUMMARY_COMPLETION: "Summary Completion",
  MULTIPLE_CHOICE_ONE: "Multiple Choice",
  MULTIPLE_CHOICE_MANY: "Multiple Choice (Many)",
  MATCHING: "Matching",
  MATCHING_INFO: "Matching Information",
  MATCHING_FEATURES: "Matching Features",
  MATCHING_HEADING: "Matching Headings",
  TRUE_FALSE: "True - False - Not Given",
  YES_NO: "Yes - No - Not Given",
  MAP_DIAGRAM_LABEL: "Map / Diagram Label",
  SENTENCE_COMPLETION: "Sentence Completion",
  SHORT_ANSWER: "Short Answer",
  FILL_BLANK: "Form / Note Completion",
  TABLE_COMPLETION: "Table Completion",
};

const SECTION_BADGE: Record<number, { cls: string; label: string }> = {
  1: { cls: "yf-badge-s1", label: "Section 1" },
  2: { cls: "yf-badge-s2", label: "Section 2" },
  3: { cls: "yf-badge-s3", label: "Section 3" },
  4: { cls: "yf-badge-s4", label: "Section 4" },
};

const SECTION_EMOJI: Record<number, string> = {
  1: "🎧",
  2: "📻",
  3: "🎙️",
  4: "🏛️",
};

const SECTION_BG: Record<number, string> = {
  1: "#fff3e0",
  2: "#e3f2fd",
  3: "#ede7f6",
  4: "#e0f7fa",
};

export default async function ListeningListingPage() {
  const { data: tests } = await supabase
    .from("tests")
    .select("id,book,test_number,title")
    .order("book,test_number");

  const { data: sections } = await supabase
    .from("sections")
    .select("id,title,section_title,section_number,total_questions,test_id,audio_url")
    .eq("skill", "listening")
    .order("section_number");

  const { data: qtypes } = await supabase
    .from("questions")
    .select("section_id,type");

  const typesBySection = new Map<string, Set<string>>();
  for (const q of qtypes ?? []) {
    if (!typesBySection.has(q.section_id))
      typesBySection.set(q.section_id, new Set());
    typesBySection.get(q.section_id)!.add(q.type);
  }

  const testMap = new Map<string, TestRow>(
    (tests ?? []).map((t: TestRow) => [t.id, t])
  );

  const byBook = new Map<number, { test: TestRow; section: SectionRow }[]>();
  for (const sec of sections ?? []) {
    const test = testMap.get(sec.test_id);
    if (!test) continue;
    if (!byBook.has(test.book)) byBook.set(test.book, []);
    byBook.get(test.book)!.push({ test, section: sec as SectionRow });
  }
  const books = Array.from(byBook.keys()).sort((a, b) => a - b);

  return (
    <div style={{ minHeight: "100vh", background: "var(--yf-bg-page)" }}>
      <YouFatNavbar />

      <div className="yf-listing-layout">
        {/* Sidebar */}
        <aside className="yf-sidebar">
          <div className="yf-sidebar-group">
            <Link href="/reading" className="yf-sidebar-group-header">
              📖 Reading
            </Link>
            <div className="yf-sidebar-sub">
              <Link href="/reading" className="yf-sidebar-sub-item">
                <span className="yf-sidebar-radio" />
                Bài lẻ
              </Link>
            </div>
          </div>
          <div className="yf-sidebar-group">
            <Link href="/listening" className="yf-sidebar-group-header active">
              🎧 Listening
            </Link>
            <div className="yf-sidebar-sub">
              <Link href="/listening" className="yf-sidebar-sub-item active">
                <span className="yf-sidebar-radio checked" />
                Bài lẻ
              </Link>
              <Link href="/listening/full" className="yf-sidebar-sub-item">
                <span className="yf-sidebar-radio" />
                Full đề
              </Link>
              <Link href="/listening/dictation" className="yf-sidebar-sub-item">
                <span className="yf-sidebar-radio" />
                Dictation
              </Link>
            </div>
          </div>
          <div className="yf-sidebar-group">
            <Link href="/writing" className="yf-sidebar-group-header">
              ✏️ Writing
            </Link>
            <div className="yf-sidebar-sub">
              <Link href="/writing" className="yf-sidebar-sub-item">
                <span className="yf-sidebar-radio" />
                Bài lẻ
              </Link>
            </div>
          </div>
          <div className="yf-sidebar-group">
            <Link href="/speaking" className="yf-sidebar-group-header">
              🎤 Speaking
            </Link>
          </div>
        </aside>

        {/* Content */}
        <main className="yf-content">
          {/* Promo banner */}
          <div className="yf-promo">
            <span className="yf-promo-emoji">🎧</span>
            <div className="yf-promo-text">
              <div className="yf-promo-title">
                Luyện Listening cùng audio Cambridge gốc!
              </div>
              <div className="yf-promo-subtitle">
                175 sections · Audio chuẩn British & American accent · Tự chấm điểm tức thì
              </div>
            </div>
            <button className="yf-promo-btn">Tạo Practice Plan</button>
          </div>

          {/* Filter */}
          <div className="yf-filter-tabs">
            <span className="yf-filter-tab active">Tất cả</span>
          </div>

          {books.map((book) => {
            const items = byBook.get(book) ?? [];
            return (
              <div key={book}>
                <div className="yf-section-header">Cambridge {book}</div>
                <div className="yf-grid" style={{ marginBottom: 24 }}>
                  {items.map(({ test, section }) => {
                    const types = Array.from(
                      typesBySection.get(section.id) ?? []
                    ).slice(0, 3);
                    const badge =
                      SECTION_BADGE[section.section_number] ??
                      SECTION_BADGE[1];
                    const emoji = SECTION_EMOJI[section.section_number] ?? "🎧";
                    const bg = SECTION_BG[section.section_number] ?? "#e8f5e9";
                    const hasAudio = !!section.audio_url;

                    return (
                      <Link
                        key={section.id}
                        href={`/listening/${section.id}`}
                        className="yf-card"
                      >
                        <div className="yf-card-thumb" style={{ background: bg }}>
                          <div className="yf-card-thumb-fallback" style={{ background: bg }}>
                            {emoji}
                          </div>
                          <span className={`yf-card-badge ${badge.cls}`}>
                            {badge.label}
                          </span>
                          <span className="yf-card-plays">
                            {hasAudio ? "🎵" : "📄"} {section.total_questions} câu
                          </span>
                        </div>
                        <div className="yf-card-body">
                          <div className="yf-card-title">
                            [C{test.book}T{test.test_number}] –{" "}
                            {section.section_title ?? section.title}
                          </div>
                          <div className="yf-card-types">
                            {types.map((t) => (
                              <span key={t} className="yf-card-type">
                                {TYPE_LABELS[t] ?? t}
                              </span>
                            ))}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </main>
      </div>
    </div>
  );
}
