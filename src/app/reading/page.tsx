import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { YouFatNavbar } from "@/components/navbar";

export const metadata = {
  title: "Luyện thi Reading IELTS – YouFat",
  description: "132 Reading passages Cambridge 10-20. Luyện thi tự chấm điểm.",
};

interface SectionRow {
  id: string;
  title: string;
  section_title: string | null;
  section_number: number;
  total_questions: number;
  test_id: string;
}
interface TestRow {
  id: string;
  book: number;
  test_number: number;
  title: string;
}

// Question type labels for card display
const TYPE_LABELS: Record<string, string> = {
  TRUE_FALSE: "True - False - Not Given",
  YES_NO: "Yes - No - Not Given",
  MULTIPLE_CHOICE_ONE: "Multiple Choice (One Answer)",
  MULTIPLE_CHOICE_MANY: "Multiple Choice (Many Answers)",
  SHORT_ANSWER: "Short Answer",
  SUMMARY_COMPLETION: "Summary Completion",
  MATCHING: "Matching",
  MATCHING_HEADING: "Matching Headings",
  MATCHING_INFO: "Matching Information",
  MATCHING_FEATURES: "Matching Features",
  SENTENCE_COMPLETION: "Sentence Completion",
  TABLE_COMPLETION: "Table Completion",
  MAP_DIAGRAM_LABEL: "Map, Diagram Label",
};

// Thumb fallback emoji by passage number
const THUMB_EMOJI: Record<number, string> = {
  1: "🏛️", 2: "🔬", 3: "🌍",
};

const BADGE_COLORS: Record<number, string> = {
  1: "yf-badge-1", 2: "yf-badge-2", 3: "yf-badge-3",
};

export default async function ReadingListingPage() {
  const { data: tests } = await supabase
    .from("tests")
    .select("id,book,test_number,title")
    .order("book,test_number");

  const { data: sections } = await supabase
    .from("sections")
    .select("id,title,section_title,section_number,total_questions,test_id")
    .eq("skill", "reading")
    .order("section_number");

  // Fetch distinct question types per section (for card display)
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
            <Link href="/reading" className="yf-sidebar-group-header active">
              📖 Reading
            </Link>
            <div className="yf-sidebar-sub">
              <Link href="/reading" className="yf-sidebar-sub-item active">
                <span className="yf-sidebar-radio checked" />
                Bài lẻ
              </Link>
              <Link href="/reading/full" className="yf-sidebar-sub-item">
                <span className="yf-sidebar-radio" />
                Full đề
              </Link>
            </div>
          </div>
          <div className="yf-sidebar-group">
            <Link href="/listening" className="yf-sidebar-group-header">
              🎧 Listening
            </Link>
            <div className="yf-sidebar-sub">
              <Link href="/listening" className="yf-sidebar-sub-item">
                <span className="yf-sidebar-radio" />
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
            <span className="yf-promo-emoji">🐥</span>
            <div className="yf-promo-text">
              <div className="yf-promo-title">
                Phá đảo tất cả dạng đề IELTS cùng YouFat!
              </div>
              <div className="yf-promo-subtitle">
                Chốt đầu vào, mục tiêu, thời gian và nhận Practice Plan được
                &quot;may đo&quot; miễn phí cho bạn!
              </div>
            </div>
            <button className="yf-promo-btn">Tạo Practice Plan</button>
          </div>

          {/* Filter tabs */}
          <div className="yf-filter-tabs">
            <span className="yf-filter-tab active">Tất cả</span>
          </div>

          {/* Books */}
          {books.map((book) => {
            const items = byBook.get(book) ?? [];
            // Group by test
            const byTest = new Map<number, typeof items>();
            for (const item of items) {
              const tn = item.test.test_number;
              if (!byTest.has(tn)) byTest.set(tn, []);
              byTest.get(tn)!.push(item);
            }

            return (
              <div key={book}>
                <div className="yf-section-header">Cambridge {book}</div>
                <div className="yf-grid" style={{ marginBottom: 24 }}>
                  {items.map(({ test, section }) => {
                    const types = Array.from(
                      typesBySection.get(section.id) ?? []
                    ).slice(0, 3);
                    const badgeCls =
                      BADGE_COLORS[section.section_number] ?? "yf-badge-1";
                    const emoji =
                      THUMB_EMOJI[section.section_number] ?? "📄";

                    return (
                      <Link
                        key={section.id}
                        href={`/reading/${section.id}`}
                        className="yf-card"
                      >
                        {/* Thumbnail */}
                        <div className="yf-card-thumb">
                          <div
                            className="yf-card-thumb-fallback"
                            style={{
                              background:
                                section.section_number === 1
                                  ? "#fff3e0"
                                  : section.section_number === 2
                                  ? "#ede7f6"
                                  : "#e0f7fa",
                            }}
                          >
                            {emoji}
                          </div>
                          <span
                            className={`yf-card-badge ${badgeCls}`}
                          >
                            Passage {section.section_number}
                          </span>
                          <span className="yf-card-plays">
                            👁 {section.total_questions} câu
                          </span>
                        </div>

                        {/* Body */}
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
