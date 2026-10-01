import { supabase } from "@/lib/supabase";

const SECTION_CHUNK_SIZE = 50;

export async function getQuestionTypesBySection(sectionIds: string[]) {
  const chunks: string[][] = [];
  for (let index = 0; index < sectionIds.length; index += SECTION_CHUNK_SIZE) {
    chunks.push(sectionIds.slice(index, index + SECTION_CHUNK_SIZE));
  }

  const responses = await Promise.all(
    chunks.map((ids) => supabase.from("questions").select("section_id,type").in("section_id", ids).range(0, 999)),
  );

  const typesBySection = new Map<string, string[]>();
  for (const response of responses) {
    if (response.error) throw response.error;
    for (const question of response.data ?? []) {
      const types = typesBySection.get(question.section_id) ?? [];
      if (!types.includes(question.type)) types.push(question.type);
      typesBySection.set(question.section_id, types);
    }
  }
  return typesBySection;
}
