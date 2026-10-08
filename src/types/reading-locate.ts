/** Content-only coordinate contract. Never persisted in SubmissionSnapshot. */
export interface ReadingLocatePosition { paragraph: number; sentence: number; index: number }
export interface ReadingLocateRange { start: ReadingLocatePosition; end: ReadingLocatePosition }
export interface ReadingLocateRanges { paragraph_ranges: ReadingLocateRange[] }
export type ReadingLocateInfo = ReadingLocateRanges | Record<string, ReadingLocateRanges>;
export interface ReadingPassageStructure {
  schema_version: 1;
  coordinate_system: 'youpass-dom-word-v1';
  /** Exact DB text at capture/import, used to fail closed on content drift. Not HTML. */
  reference_passage_text: string;
  paragraphs: {
    paragraph: number;
    sentences: {sentence: number; tokens: {index: number; text: string}[]}[];
  }[];
}
export interface ReadingLocateToken extends ReadingLocatePosition {
  text: string;
  /** UTF-16 [start,end) in THIS source paragraph's concatenated token text, not passage_text. */
  start: number;
  end: number;
}
export type ReadingLocateUnavailable = 'missing_structure' | 'invalid_structure' | 'missing_locate'
  | 'invalid_locate' | 'passage_text_changed' | 'out_of_range' | 'invalid_slot' | 'empty_ranges';
export type ReadingLocateResolution =
  | {available: false; reason: ReadingLocateUnavailable}
  | {available: true; tokenIds: string[]; ranges: {slot: number | null; tokens: ReadingLocateToken[]}[]};
