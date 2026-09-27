import { ReadingListing, type ReadingListingItem } from "@/components/reading-listing";
import { YouFatNavbar } from "@/components/navbar";
import thumbnailManifest from "@/data/youpass-reading-thumbnails.json";
import { getQuestionTypesBySection } from "@/lib/question-types";
import { supabase } from "@/lib/supabase";

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
}

interface ThumbnailEntry {
  thumbnail_url: string | null;
}

const thumbnails = thumbnailManifest as Record<string, ThumbnailEntry>;

export default async function ReadingListingPage() {
  const [{ data: tests }, { data: sections }] = await Promise.all([
    supabase.from("tests").select("id,book,test_number").gte("book", 10).lte("book", 20).order("book,test_number"),
    supabase
      .from("sections")
      .select("id,title,section_title,section_number,total_questions,test_id")
      .eq("skill", "reading")
      .order("section_number"),
  ]);
  const typesBySection = await getQuestionTypesBySection((sections ?? []).map((section) => section.id));

  const testMap = new Map<string, TestRow>(
    (tests ?? []).map((test: TestRow) => [test.id, test]),
  );

  const items: ReadingListingItem[] = [];
  for (const rawSection of sections ?? []) {
    const section = rawSection as SectionRow;
    const test = testMap.get(section.test_id);
    if (!test) continue;

    const manifestKey = `c${test.book}_t${test.test_number}_p${section.section_number}`;
    const asset = thumbnails[manifestKey];
    items.push({
      sectionId: section.id,
      testId: test.id,
      book: test.book,
      testNumber: test.test_number,
      sectionNumber: section.section_number,
      totalQuestions: section.total_questions,
      title: section.section_title ?? section.title,
      types: typesBySection.get(section.id) ?? [],
      thumbnailUrl: asset?.thumbnail_url ?? null,
    });
  }

  return (
    <div className="yf-listing-page">
      <YouFatNavbar />
      <ReadingListing items={items} />
    </div>
  );
}
