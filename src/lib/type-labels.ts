/**
 * Single source of truth for question type → display label mapping.
 * YouPass groups all fill-in-blank variants ("Gap Filling") on card labels.
 */

export const TYPE_LABELS: Record<string, string> = {
  TRUE_FALSE: "True - False - Not Given",
  YES_NO: "Yes - No - Not Given",
  MULTIPLE_CHOICE_ONE: "Multiple Choice (One Answer)",
  MULTIPLE_CHOICE_MANY: "Multiple Choice (Many Answers)",
  MATCHING_HEADING: "Matching Headings",
  MATCHING_INFO: "Matching Information",
  MATCHING_FEATURES: "Matching Features",
  MATCHING: "Matching",
  MAP_DIAGRAM_LABEL: "Map, Diagram Label",
  // All fill-in-blank variants → "Gap Filling" (matches YouPass card labels)
  FILL_BLANK: "Gap Filling",
  SUMMARY_COMPLETION: "Gap Filling",
  SENTENCE_COMPLETION: "Gap Filling",
  TABLE_COMPLETION: "Gap Filling",
  SHORT_ANSWER: "Gap Filling",
};

/** Deduplicated labels for a card (max 3 distinct) */
export function getCardLabels(types: string[], max = 3): string[] {
  return Array.from(new Set(types.map((t) => TYPE_LABELS[t] ?? t))).slice(0, max);
}

export const READING_FILTER_GROUPS: Record<string, string[]> = {
  MATCHING_HEADING: ["MATCHING_HEADING"],
  TRUE_FALSE: ["TRUE_FALSE"],
  YES_NO: ["YES_NO"],
  MULTIPLE_CHOICE_ONE: ["MULTIPLE_CHOICE_ONE"],
  MATCHING_INFO: ["MATCHING_INFO"],
  MATCHING_FEATURES: ["MATCHING_FEATURES"],
  MULTIPLE_CHOICE_MANY: ["MULTIPLE_CHOICE_MANY"],
  MAP_DIAGRAM_LABEL: ["MAP_DIAGRAM_LABEL"],
  GAP_FILLING: ["FILL_BLANK", "SUMMARY_COMPLETION", "SENTENCE_COMPLETION", "TABLE_COMPLETION", "SHORT_ANSWER"],
  OTHER: ["MATCHING"],
};

export const LISTENING_FILTER_GROUPS: Record<string, string[]> = {
  GAP_FILLING: ["FILL_BLANK", "SUMMARY_COMPLETION", "SENTENCE_COMPLETION", "TABLE_COMPLETION", "SHORT_ANSWER"],
  MAP_DIAGRAM_LABEL: ["MAP_DIAGRAM_LABEL"],
  MULTIPLE_CHOICE_ONE: ["MULTIPLE_CHOICE_ONE"],
  MATCHING_INFO: ["MATCHING_INFO"],
  MULTIPLE_CHOICE_MANY: ["MULTIPLE_CHOICE_MANY"],
  MATCHING: ["MATCHING", "MATCHING_FEATURES", "MATCHING_HEADING"],
  OTHER: ["TRUE_FALSE", "YES_NO"],
};
