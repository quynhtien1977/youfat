import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Image from "next/image";
import { YouFatNavbar } from "@/components/navbar";

export const metadata = {
  title: "Luyện thi Writing IELTS – YouFat",
  description: "76 Writing tasks Cambridge 10-20. Task 1 & Task 2.",
};

interface WritingTask {
  id: string;
  task_number: number;
  title: string | null;
  prompt: string | null;
  image_url: string | null;
  test_id: string;
}
interface TestRow {
  id: string;
  book: number;
  test_number: number;
}

export default async function WritingListingPage() {
  const { data: tests } = await supabase
    .from("tests")
    .select("id,book,test_number")
    .order("book,test_number");

  const { data: tasks } = await supabase
    .from("writing_tasks")
    .select("id,task_number,title,prompt,image_url,test_id")
    .order("task_number");

  const testMap = new Map<string, TestRow>(
    (tests ?? []).map((t: TestRow) => [t.id, t])
  );

  const byBook = new Map<number, { test: TestRow; task: WritingTask }[]>();
  for (const task of tasks ?? []) {
    const test = testMap.get(task.test_id);
    if (!test) continue;
    if (!byBook.has(test.book)) byBook.set(test.book, []);
    byBook.get(test.book)!.push({ test, task: task as WritingTask });
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
            <Link href="/listening" className="yf-sidebar-group-header">
              <Image src="/nav_listening.webp" alt="Listening" width={16} height={16} className="w-4 h-4 object-contain" />
              <span>Listening</span>
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
            <Link href="/writing" className="yf-sidebar-group-header active">
              <Image src="/nav_writing.svg" alt="Writing" width={16} height={16} className="w-4 h-4 object-contain" />
              <span>Writing</span>
            </Link>
            <div className="yf-sidebar-sub">
              <Link href="/writing" className="yf-sidebar-sub-item active">
                <span className="yf-sidebar-radio checked" />
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
                76 Writing Tasks Cambridge 10-20 – Task 1 &amp; Task 2
              </div>
              <div className="yf-promo-subtitle">
                Xem đề, tự viết, đối chiếu bài mẫu Band 8.0+
              </div>
            </div>
            <button className="yf-promo-btn">Tạo Practice Plan</button>
          </div>

          <div className="yf-filter-tabs">
            <span className="yf-filter-tab active">Tất cả</span>
            <span className="yf-filter-tab">Task 1</span>
            <span className="yf-filter-tab">Task 2</span>
          </div>

          {books.map((book) => {
            const items = byBook.get(book) ?? [];
            return (
              <div key={book}>
                <div className="yf-section-header">Cambridge {book}</div>
                <div className="yf-grid" style={{ marginBottom: 24 }}>
                  {items.map(({ test, task }) => {
                    const isTask1 = task.task_number === 1;

                    return (
                      <Link
                        key={task.id}
                        href={`/writing/${task.id}`}
                        className="yf-card"
                      >
                        <div
                          className="yf-card-thumb relative overflow-hidden"
                          style={{
                            background: isTask1
                              ? "linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)"
                              : "linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%)",
                          }}
                        >
                          {/* Centered Graphic */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                            {isTask1 ? (
                              <svg className="w-16 h-16 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="20" x2="18" y2="10" />
                                <line x1="12" y1="20" x2="12" y2="4" />
                                <line x1="6" y1="20" x2="6" y2="14" />
                              </svg>
                            ) : (
                              <svg className="w-16 h-16 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                              </svg>
                            )}
                          </div>

                          <span className="yf-card-plays">
                            Cam {test.book} · Test {test.test_number}
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
                            Task {task.task_number}
                          </span>
                        </div>
                        <div className="yf-card-body">
                          <div className="yf-card-title">
                            {task.title ??
                              `[C${test.book}T${test.test_number}] Writing Task ${task.task_number}`}
                          </div>
                          <div className="yf-card-types">
                            <span className="yf-card-type">
                              {isTask1
                                ? "Graph / Chart / Map / Process"
                                : "Academic Essay – Opinion / Discussion"}
                            </span>
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
