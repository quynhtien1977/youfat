import { WritingListing, type WritingListingItem } from "@/components/writing-listing";
import { YouFatNavbar } from "@/components/navbar";
import thumbnailManifest from "@/data/youpass-writing-thumbnails.json";
import { supabase } from "@/lib/supabase";

export const metadata = {
  title: "Luyện thi Writing IELTS – YouFat",
  description: "76 Writing tasks Cambridge 10-20. Task 1 & Task 2.",
};

interface WritingTaskRow {
  id: string;
  task_number: number;
  title: string | null;
  prompt: string | null;
  test_id: string;
}

interface TestRow {
  id: string;
  book: number;
  test_number: number;
}

interface ThumbnailEntry {
  thumbnail_url: string | null;
  category: string | null;
}

const thumbnails = thumbnailManifest as Record<string, ThumbnailEntry>;

export default async function WritingListingPage() {
  const [{ data: tests }, { data: tasks }] = await Promise.all([
    supabase.from("tests").select("id,book,test_number").gte("book", 10).lte("book", 20).order("book,test_number"),
    supabase.from("writing_tasks").select("id,task_number,title,prompt,test_id").order("task_number"),
  ]);

  const testMap = new Map<string, TestRow>((tests ?? []).map((test: TestRow) => [test.id, test]));
  const items: WritingListingItem[] = [];
  for (const rawTask of tasks ?? []) {
    const task = rawTask as WritingTaskRow;
    const test = testMap.get(task.test_id);
    if (!test) continue;

    const asset = thumbnails[`c${test.book}_t${test.test_number}_task${task.task_number}`];
    items.push({
      taskId: task.id,
      testId: test.id,
      book: test.book,
      testNumber: test.test_number,
      taskNumber: task.task_number,
      title: task.title ?? `[C${test.book}T${test.test_number}] Writing Task ${task.task_number}`,
      prompt: task.prompt ?? "",
      thumbnailUrl: asset?.thumbnail_url ?? null,
      category: asset?.category ?? null,
    });
  }

  return (
    <div className="yf-listing-page">
      <YouFatNavbar />
      <WritingListing items={items} />
    </div>
  );
}
