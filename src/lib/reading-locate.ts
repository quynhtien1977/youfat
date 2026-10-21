import type {
  ReadingLocateInfo, ReadingLocatePosition, ReadingLocateRange, ReadingLocateRanges,
  ReadingLocateResolution, ReadingLocateToken, ReadingPassageStructure,
} from '../types/reading-locate';

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const positive = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) > 0;
const compare = (a: ReadingLocatePosition, b: ReadingLocatePosition) =>
  a.paragraph - b.paragraph || a.sentence - b.sentence || a.index - b.index;
const id = (p: ReadingLocatePosition) => `word-${p.paragraph}-${p.sentence}-${p.index}`;
function position(raw: unknown): ReadingLocatePosition | null {
  if (!record(raw) || !positive(raw.paragraph) || !positive(raw.sentence) || !positive(raw.index)) return null;
  return {paragraph: raw.paragraph, sentence: raw.sentence, index: raw.index};
}
function ranges(raw: unknown): ReadingLocateRanges | null {
  if (!record(raw) || !Array.isArray(raw.paragraph_ranges) || raw.paragraph_ranges.length > 256) return null;
  const result: ReadingLocateRange[] = [];
  for (const item of raw.paragraph_ranges) {
    if (!record(item)) return null;
    const start = position(item.start), end = position(item.end);
    if (!start || !end || compare(start,end) > 0) return null;
    result.push({start,end});
  }
  return {paragraph_ranges: result};
}

/** Untrusted optional source data: bad/missing ranges must not crash review. Returns a fresh DTO. */
export function parseReadingLocateInfo(raw: unknown): ReadingLocateInfo | null {
  if (!record(raw)) return null;
  if (Object.hasOwn(raw,'paragraph_ranges')) return ranges(raw);
  const keys = Object.keys(raw);
  if (!keys.length || keys.length > 16 || keys.some((key,i) => key !== String(i))) return null;
  const result: Record<string, ReadingLocateRanges> = {};
  for (const key of keys) {
    const parsed = ranges(raw[key]);
    if (!parsed) return null;
    result[key] = parsed;
  }
  return result;
}

/** Preserve all paragraph numbers, sentence gaps and token whitespace; never guess segmentation. */
export function parsePassageStructure(raw: unknown): ReadingPassageStructure | null {
  if (!record(raw) || raw.schema_version !== 1 || raw.coordinate_system !== 'youpass-dom-word-v1'
    || typeof raw.reference_passage_text !== 'string' || raw.reference_passage_text.length > 500_000
    || !Array.isArray(raw.paragraphs) || !raw.paragraphs.length || raw.paragraphs.length > 500) return null;
  const paragraphs: ReadingPassageStructure['paragraphs'] = [];
  let count = 0, textLength = 0;
  for (const [i,p] of raw.paragraphs.entries()) {
    if (!record(p) || p.paragraph !== i+1 || !Array.isArray(p.sentences) || p.sentences.length > 1_000) return null;
    const sentences: ReadingPassageStructure['paragraphs'][number]['sentences'] = [];
    let previousSentence = 0;
    for (const s of p.sentences) {
      if (!record(s) || !positive(s.sentence) || s.sentence <= previousSentence
        || !Array.isArray(s.tokens) || !s.tokens.length) return null;
      const tokens: {index: number; text: string}[] = [];
      for (const [j,t] of s.tokens.entries()) {
        if (!record(t) || t.index !== j+1 || typeof t.text !== 'string' || t.text.length > 4_096 || ++count > 20_000) return null;
        textLength += t.text.length;
        if (textLength > 500_000) return null;
        tokens.push({index:t.index,text:t.text});
      }
      sentences.push({sentence:s.sentence,tokens}); previousSentence = s.sentence;
    }
    paragraphs.push({paragraph:i+1,sentences});
  }
  return count ? {schema_version:1,coordinate_system:'youpass-dom-word-v1',
    reference_passage_text:raw.reference_passage_text,paragraphs} : null;
}

/**
 * Pure source-coordinate resolver, no DOM/storage/fetch/grading.
 * UI must render structure tokens as text; offsets refer to that representation only.
 * Undefined slot resolves all MCQ slots; explicit slot selects the source ordinal, not a choice label.
 * Any invalid segment fails the entire resolution closed, without partial or heuristic highlights.
 */
export function resolveReadingLocate(rawStructure: unknown, rawLocate: unknown,
  options: {passageText: string | null | undefined; slot?: number}): ReadingLocateResolution {
  if (rawStructure == null) return {available:false,reason:'missing_structure'};
  const structure = parsePassageStructure(rawStructure);
  if (!structure) return {available:false,reason:'invalid_structure'};
  if (structure.reference_passage_text !== options.passageText) return {available:false,reason:'passage_text_changed'};
  if (rawLocate == null) return {available:false,reason:'missing_locate'};
  const info = parseReadingLocateInfo(rawLocate);
  if (!info) return {available:false,reason:'invalid_locate'};
  const single = Object.hasOwn(info,'paragraph_ranges');
  if (options.slot !== undefined && (single || !Number.isSafeInteger(options.slot)
    || !Object.hasOwn(info,String(options.slot)))) return {available:false,reason:'invalid_slot'};
  const groups: {slot: number | null; ranges: ReadingLocateRange[]}[] = single
    ? [{slot:null,ranges:(info as ReadingLocateRanges).paragraph_ranges}]
    : Object.entries(info as Record<string,ReadingLocateRanges>)
      .filter(([key])=>options.slot === undefined || Number(key) === options.slot)
      .map(([key,value])=>({slot:Number(key),ranges:value.paragraph_ranges}));
  const tokens: ReadingLocateToken[] = [], indices = new Map<string,number>();
  for (const p of structure.paragraphs) {
    let offset = 0;
    for (const s of p.sentences) for (const t of s.tokens) {
      const token = {paragraph:p.paragraph,sentence:s.sentence,index:t.index,text:t.text,
        start:offset,end:offset+t.text.length};
      indices.set(id(token),tokens.length); tokens.push(token); offset = token.end;
    }
  }
  const resolved: {slot: number | null; tokens: ReadingLocateToken[]}[] = [], tokenIds = new Set<string>();
  let expandedCount = 0;
  for (const group of groups) for (const range of group.ranges) {
    const start = indices.get(id(range.start)), end = indices.get(id(range.end));
    if (start === undefined || end === undefined) return {available:false,reason:'out_of_range'};
    // Overlapping ranges can otherwise multiply output far beyond the input budget.
    expandedCount += end-start+1;
    if (expandedCount > 20_000) return {available:false,reason:'invalid_locate'};
    const selected = tokens.slice(start,end+1).map(t=>({...t}));
    selected.forEach(t=>tokenIds.add(id(t))); resolved.push({slot:group.slot,tokens:selected});
  }
  return resolved.length ? {available:true,tokenIds:[...tokenIds],ranges:resolved} : {available:false,reason:'empty_ranges'};
}
