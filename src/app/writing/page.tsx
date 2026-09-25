import { supabase } from "@/lib/supabase";
import Link from "next/link";
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
            <Link href="/listening" className="yf-sidebar-group-header">
              🎧 Listening
            </Link>
            <div className="yf-sidebar-sub">
              <Link href="/listening" className="yf-sidebar-sub-item">
                <span className="yf-sidebar-radio" />
                Bài lẻ
              </Link>
            </div>
          </div>
          <div className="yf-sidebar-group">
            <Link href="/writing" className="yf-sidebar-group-header active">
              ✏️ Writing
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
              🎤 Speaking
            </Link>
          </div>
        </aside>

        {/* Content */}
        <main className="yf-content">
          <div className="yf-promo">
            <span className="yf-promo-emoji">✍️</span>
            <div className="yf-promo-text">
              <div className="yf-promo-title">
                76 Writing Tasks Cambridge 10-20 – Task 1 & Task 2
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
                    const badgeCls = isTask1 ? "yf-badge-s3" : "yf-badge-s2";
                    const emoji = isTask1 ? "📊" : "📝";
                    const bg = isTask1 ? "#e8f5e9" : "#ede7f6";

                    return (
                      <Link
                        key={task.id}
                        href={`/writing/${task.id}`}
                        className="yf-card"
                      >
                        <div className="yf-card-thumb" style={{ background: bg }}>
                          <div className="yf-card-thumb-fallback" style={{ background: bg }}>
                            {emoji}
                          </div>
                          <span className={`yf-card-badge ${badgeCls}`}>
                            Task {task.task_number}
                          </span>
                          <span className="yf-card-plays">
                            📖 C{test.book}T{test.test_number}
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
