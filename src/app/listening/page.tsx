import { ListeningListing, type ListeningListingItem } from "@/components/listening-listing";
import { YouFatNavbar } from "@/components/navbar";
import thumbnailManifest from "@/data/youpass-listening-thumbnails.json";
import { getQuestionTypesBySection } from "@/lib/question-types";
import { supabase } from "@/lib/supabase";

export const metadata = {
  title: "Luyện thi Listening IELTS – YouFat",
  description: "175 Listening sections Cambridge 10-20. Luyện thi tự chấm điểm.",
};

interface SectionRow {
  id: string;
  title: string;
  section_number: number;
  total_questions: number;
  test_id: string;
}

interface TestRow {
  id: string;
  book: number;
  test_number: number;
}

interface ThumbnailEntry {
  thumbnail_url: string | null;
}

const thumbnails = thumbnailManifest as Record<string, ThumbnailEntry>;

export default async function ListeningListingPage() {
  const [{ data: tests }, { data: sections }] = await Promise.all([
    supabase.from("tests").select("id,book,test_number").gte("book", 10).lte("book", 20).order("book,test_number"),
    supabase
      .from("sections")
      .select("id,title,section_number,total_questions,test_id")
      .eq("skill", "listening")
      .order("section_number"),
  ]);
  const typesBySection = await getQuestionTypesBySection((sections ?? []).map((section) => section.id));

  const testMap = new Map<string, TestRow>((tests ?? []).map((test: TestRow) => [test.id, test]));
  const items: ListeningListingItem[] = [];
  for (const rawSection of sections ?? []) {
    const section = rawSection as SectionRow;
    const test = testMap.get(section.test_id);
    if (!test) continue;

    const asset = thumbnails[`c${test.book}_t${test.test_number}_s${section.section_number}`];
    items.push({
      sectionId: section.id,
      testId: test.id,
      book: test.book,
      testNumber: test.test_number,
      sectionNumber: section.section_number,
      totalQuestions: section.total_questions,
      title: section.title,
      types: typesBySection.get(section.id) ?? [],
      thumbnailUrl: asset?.thumbnail_url ?? null,
    });
  }

  return (
    <div className="yf-listing-page">
      <YouFatNavbar />
      <ListeningListing items={items} />
    </div>
  );
}
