import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Image from "next/image";
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
              <Image src="/nav_reading.webp" alt="Reading" width={16} height={16} className="w-4 h-4 object-contain" />
              <span>Reading</span>
            </Link>
            <div className="yf-sidebar-sub">
              <Link href="/reading" className="yf-sidebar-sub-item">
                <span className="yf-sidebar-radio" />
                Bài lẻ
              </Link>
              <Link href="/reading/full" className="yf-sidebar-sub-item">
                <span className="yf-sidebar-radio" />
                Full đề
              </Link>
            </div>
          </div>
          <div className="yf-sidebar-group">
            <Link href="/listening" className="yf-sidebar-group-header active">
              <Image src="/nav_listening.webp" alt="Listening" width={16} height={16} className="w-4 h-4 object-contain" />
              <span>Listening</span>
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
              <Image src="/nav_writing.svg" alt="Writing" width={16} height={16} className="w-4 h-4 object-contain" />
              <span>Writing</span>
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
              <Image src="/nav_speaking.webp" alt="Speaking" width={16} height={16} className="w-4 h-4 object-contain" />
              <span>Speaking</span>
            </Link>
            <div className="yf-sidebar-sub">
              <Link href="/speaking" className="yf-sidebar-sub-item">
                <span className="yf-sidebar-radio" />
                Luyện nói
              </Link>
            </div>
          </div>
        </aside>

        {/* Content */}
        <main className="yf-content">
          {/* Promo banner */}
          <div className="yf-promo">
            <div className="w-9 h-9 relative flex-shrink-0">
              <Image
                src="/mascot.webp"
                alt="YouFat Mascot"
                width={36}
                height={36}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="yf-promo-text">
              <div className="yf-promo-title">
                Luyện Listening cùng audio Cambridge gốc!
              </div>
              <div className="yf-promo-subtitle">
                175 sections · Audio chuẩn British &amp; American accent · Tự chấm điểm tức thì
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

                    return (
                      <Link
                        key={section.id}
                        href={`/listening/${section.id}`}
                        className="yf-card"
                      >
                        <div
                          className="yf-card-thumb relative overflow-hidden"
                          style={{
                            background:
                              section.section_number === 1
                                ? "linear-gradient(135deg, #FFF9F2 0%, #FFEEDD 100%)"
                                : section.section_number === 2
                                ? "linear-gradient(135deg, #F0F7FF 0%, #DBEAFE 100%)"
                                : section.section_number === 3
                                ? "linear-gradient(135deg, #FDF4FF 0%, #F3E8FF 100%)"
                                : "linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%)",
                          }}
                        >
                          {/* Centered Headphones Graphic */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                            <svg className="w-20 h-20 text-[#ffa41b]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>
                            </svg>
                          </div>

                          <span className="yf-card-plays">
                            {section.total_questions} câu
                          </span>

                          <span
                            className="yf-card-badge"
                            style={{
                              background: "rgba(255,255,255,0.85)",
                              color: "#475569",
                              fontWeight: 700,
                              borderRadius: 6,
                              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                            }}
                          >
                            Section {section.section_number}
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
