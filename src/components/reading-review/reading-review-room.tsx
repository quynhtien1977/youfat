'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import type { SubmissionSnapshot } from '@/types/database';
import type { ReviewModel, ReviewQuestion, ReviewSection } from '@/types/reading-review';
import { loadReadingReview } from '@/lib/reading-review';
import { supabase } from '@/lib/supabase';
import { formatElapsedTime } from '@/lib/submission-controls';
import { sanitizeReviewContentHtml } from '@/lib/sanitizer';
import { GapFillingReview } from './gap-filling-review';
import { ChoiceQuestionReview } from './choice-question-review';
import { MatchingMatrixReview } from './matching-matrix-review';
import { MatchingHeadingReview } from './matching-heading-review';
import { ReviewItemFallback } from './review-item-fallback';
import {
  LocationSpeechIcon,
  CloseIcon,
  ClockIcon,
  NoteIcon,
  GearIcon,
  ShareIcon,
  HighlightToolIcon,
  NotesToolIcon,
  DictionaryToolIcon,
} from './icons';
import styles from './reading-review.module.css';

interface ReadingReviewRoomProps {
  snapshot: SubmissionSnapshot;
  onBack: () => void;
}

const GAP_TYPES = new Set([
  'SUMMARY_COMPLETION',
  'FILL_BLANK',
  'SENTENCE_COMPLETION',
  'SHORT_ANSWER',
  'TABLE_COMPLETION',
  'MAP_DIAGRAM_LABEL',
]);

const CHOICE_TYPES = new Set([
  'TRUE_FALSE',
  'YES_NO',
  'MULTIPLE_CHOICE_ONE',
  'MULTIPLE_CHOICE_MANY',
]);

const MATRIX_TYPES = new Set([
  'MATCHING_INFO',
  'MATCHING_FEATURES',
  'MATCHING',
]);

interface ReviewQuestionGroup {
  setTitle: string | undefined;
  instruction: string | undefined;
  isGapGroup: boolean;
  isMatrixGroup: boolean;
  isHeadingGroup: boolean;
  templateHtml?: string;
  questions: ReviewQuestion[];
}

function groupReviewQuestions(questions: ReviewQuestion[]): ReviewQuestionGroup[] {
  const groups: ReviewQuestionGroup[] = [];
  let current: ReviewQuestionGroup | null = null;

  for (const q of questions) {
    const type = q.historical.question_type;
    const isGap = GAP_TYPES.has(type);
    const isMatrix = MATRIX_TYPES.has(type);
    const isHeading = type === 'MATCHING_HEADING';
    const setTitle = q.content?.question_set_title || undefined;
    const instruction = q.content?.instruction || undefined;

    const key = setTitle
      ? `title:${setTitle}`
      : instruction
      ? `instr:${instruction}`
      : `type:${type}`;

    const currentKey = current?.setTitle
      ? `title:${current.setTitle}`
      : current?.instruction
      ? `instr:${current.instruction}`
      : current
      ? `type:${current.questions[0]?.historical.question_type}`
      : '';

    if (!current || currentKey !== key) {
      current = {
        setTitle,
        instruction,
        isGapGroup: isGap,
        isMatrixGroup: isMatrix,
        isHeadingGroup: isHeading,
        questions: [],
      };
      groups.push(current);
    }
    current.questions.push(q);
  }

  // Detect templateHtml and synthesize setTitle if missing
  for (const group of groups) {
    const gapTemplate = group.questions.find((q) =>
      q.content?.prompt?.includes('data-question-id')
    )?.content?.prompt;
    if (gapTemplate) {
      group.templateHtml = gapTemplate;
      group.isGapGroup = true;
    }

    if (!group.setTitle && group.questions.length > 0) {
      const orders = group.questions
        .map((q) => q.historical.question_order)
        .sort((a, b) => a - b);
      const min = orders[0];
      const max = orders[orders.length - 1];
      if (min === max) {
        group.setTitle = `Question ${min}:`;
      } else {
        group.setTitle = `Questions ${min} - ${max}:`;
      }
    }
  }

  return groups;
}

function extractCandidateQuotes(text: string): string[] {
  const candidates: string[] = [];
  const parenMatches = text.match(/\(([^)]{15,250})\)/g);
  if (parenMatches) {
    for (const m of parenMatches) {
      const inner = m.slice(1, -1).trim();
      if (inner.length >= 15 && !inner.startsWith('Bước') && !inner.startsWith('http')) {
        candidates.push(inner);
      }
    }
  }
  const quoteMatches = text.match(/["“]([^"”]{15,250})["”]/g);
  if (quoteMatches) {
    for (const m of quoteMatches) {
      const inner = m.slice(1, -1).trim();
      if (inner.length >= 15 && !inner.startsWith('Bước')) {
        candidates.push(inner);
      }
    }
  }
  return candidates;
}

function findEvidenceInParagraphs(
  activeQuestion: ReviewQuestion | null,
  paragraphs: string[]
): { paragraphIndex: number | null; quote: string | null } {
  if (!activeQuestion) return { paragraphIndex: null, quote: null };

  const qType = activeQuestion.historical.question_type;

  // 1. MATCHING_HEADING: Paragraph letter match
  if (qType === 'MATCHING_HEADING') {
    const prompt = activeQuestion.content?.prompt || '';
    const match = prompt.match(/Paragraph\s+([A-Z])/i) || prompt.match(/^([A-Z])$/i);
    if (match) {
      const letter = match[1].toUpperCase();
      const idx = paragraphs.findIndex((p) => new RegExp(`^${letter}[\\.\\s]`, 'i').test(p));
      if (idx !== -1) return { paragraphIndex: idx, quote: null };
    }
  }

  // 2. MATCHING_INFO: target answer is the paragraph letter
  if (qType === 'MATCHING_INFO') {
    const targetLetter = activeQuestion.historical.correct_answers[0]?.trim().toUpperCase();
    if (targetLetter && /^[A-Z]$/.test(targetLetter)) {
      const idx = paragraphs.findIndex((p) => new RegExp(`^${targetLetter}[\\.\\s]`, 'i').test(p));
      if (idx !== -1) {
        const expl = activeQuestion.content?.explanation || '';
        const rawText = expl.replace(/<[^>]+>/g, ' ');
        const quotes = extractCandidateQuotes(rawText);
        for (const cand of quotes) {
          const normC = cand.toLowerCase().replace(/\s+/g, ' ').trim();
          if (normC.length < 15) continue;
          const normP = paragraphs[idx].toLowerCase().replace(/\s+/g, ' ');
          if (normP.includes(normC)) {
            return { paragraphIndex: idx, quote: cand };
          }
        }
        return { paragraphIndex: idx, quote: null };
      }
    }
  }

  // 3. Quoted evidence in explanation matching a paragraph
  const expl = activeQuestion.content?.explanation || '';
  if (expl) {
    const rawText = expl.replace(/<[^>]+>/g, ' ');
    const quotes = extractCandidateQuotes(rawText);
    for (const cand of quotes) {
      const normC = cand.toLowerCase().replace(/\s+/g, ' ').trim();
      if (normC.length < 15) continue;
      for (let i = 0; i < paragraphs.length; i++) {
        const normP = paragraphs[i].toLowerCase().replace(/\s+/g, ' ');
        if (normP.includes(normC)) {
          return { paragraphIndex: i, quote: cand };
        }
      }
    }

    // Paragraph letter mention: "Đoạn C" or "Paragraph C"
    const pLetter = rawText.match(/(?:Đoạn|Paragraph)\s+([A-Z])/i);
    if (pLetter) {
      const letter = pLetter[1].toUpperCase();
      const idx = paragraphs.findIndex((p) => new RegExp(`^${letter}[\\.\\s]`, 'i').test(p));
      if (idx !== -1) return { paragraphIndex: idx, quote: null };
    }
  }

  // 4. Keyword overlap fallback from question prompt & options
  const prompt = activeQuestion.content?.prompt || '';
  const optionTexts = (activeQuestion.content?.options || []).map((o) => o.text).join(' ');
  const combinedText = `${prompt} ${optionTexts}`;
  const words = combinedText.match(/\b[A-Za-z0-9-]{4,}\b/g) || [];
  const ignore = new Set([
    'what', 'which', 'where', 'when', 'with', 'from', 'this', 'that', 'they', 'their',
    'have', 'been', 'were', 'about', 'into', 'more', 'than', 'does', 'each', 'true', 'false', 'given'
  ]);
  const kws = words.map((w) => w.toLowerCase()).filter((w) => !ignore.has(w));
  if (kws.length > 0) {
    let bestIdx = -1;
    let bestScore = 0;
    for (let i = 0; i < paragraphs.length; i++) {
      const pText = paragraphs[i].toLowerCase();
      let score = 0;
      for (const kw of kws) {
        if (pText.includes(kw)) score++;
      }
      if (score > bestScore && score >= 2) {
        bestScore = score;
        bestIdx = i;
      }
    }
    if (bestIdx !== -1) return { paragraphIndex: bestIdx, quote: null };
  }

  return { paragraphIndex: null, quote: null };
}

export function ReadingReviewRoom({ snapshot, onBack }: ReadingReviewRoomProps) {
  const [model, setModel] = useState<ReviewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prevSnapshot, setPrevSnapshot] = useState(snapshot);
  const [activeQuestionOrder, setActiveQuestionOrder] = useState<number | null>(null);
  const [openHeadingExplanations, setOpenHeadingExplanations] = useState<Set<number>>(new Set());

  if (prevSnapshot !== snapshot) {
    setPrevSnapshot(snapshot);
    setLoading(true);
    setError(null);
  }

  useEffect(() => {
    let active = true;

    loadReadingReview(snapshot, supabase)
      .then((res) => {
        if (active) {
          setModel(res);
          setLoading(false);
          // In YouPass, explanation drawer starts closed until a question is clicked
          setActiveQuestionOrder(null);
        }
      })
      .catch((err) => {
        if (active) {
          console.error('[reading-review] Failed to load live content', err);
          setError('Không thể tải nội dung xem lại từ máy chủ. Vui lòng thử lại sau.');
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [snapshot]);

  const activeSection: ReviewSection | null = model?.sections[0] || null;

  const questionGroups = useMemo(() => {
    if (!model) return [];
    return groupReviewQuestions(model.questions);
  }, [model]);

  const headingQuestionsByLetter = useMemo(() => {
    if (!model) return new Map<string, ReviewQuestion>();
    const map = new Map<string, ReviewQuestion>();
    const headingQs = model.questions.filter(
      (q) => q.historical.question_type === 'MATCHING_HEADING'
    );
    for (const q of headingQs) {
      const prompt = q.content?.prompt || '';
      const match = prompt.match(/Paragraph\s+([A-Z])/i) || prompt.match(/^([A-Z])$/i);
      if (match) {
        map.set(match[1].toUpperCase(), q);
      }
    }
    return map;
  }, [model]);

  const handlePillClick = useCallback((order: number) => {
    setActiveQuestionOrder(order);
    const isHeading = model?.questions.some(
      (q) => q.historical.question_order === order && q.historical.question_type === 'MATCHING_HEADING'
    );
    if (isHeading) {
      setOpenHeadingExplanations((prev) => {
        const next = new Set(prev);
        next.add(order);
        return next;
      });
      const passageEl = document.getElementById(`passage-q-${order}`);
      if (passageEl) {
        passageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      setTimeout(() => {
        const el =
          document.getElementById(`q-${order}`) ||
          document.getElementById(`review-gap-${order}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
    }
  }, [model]);

  const handlePassageSpeechClick = useCallback((order: number) => {
    setActiveQuestionOrder(order);
    setOpenHeadingExplanations((prev) => {
      const next = new Set(prev);
      if (next.has(order)) {
        next.delete(order);
      } else {
        next.add(order);
      }
      return next;
    });
  }, []);

  const activeQuestion = useMemo(() => {
    if (!model || activeQuestionOrder === null) return null;
    return (
      model.questions.find((q) => q.historical.question_order === activeQuestionOrder) ||
      null
    );
  }, [model, activeQuestionOrder]);

  const sectionContent = activeSection?.content;
  const passageTitle = sectionContent?.section_title || sectionContent?.title || 'Bài đọc Reading';
  const passageText = sectionContent?.passage_text;
  const rawParagraphs = useMemo(() => {
    if (!passageText) return [];
    return passageText.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  }, [passageText]);

  // Filter out standalone paragraph numbers (e.g. Cambridge raw "14", "15" gap placeholders)
  const paragraphs = useMemo(
    () => rawParagraphs.filter((p) => !/^\d+$/.test(p)),
    [rawParagraphs]
  );

  const evidence = useMemo(
    () => findEvidenceInParagraphs(activeQuestion, paragraphs),
    [activeQuestion, paragraphs]
  );
  const activeParagraphIndex = evidence.paragraphIndex;
  const activeEvidenceQuote = evidence.quote;

  useEffect(() => {
    if (activeParagraphIndex !== null) {
      const el = document.getElementById(`passage-para-${activeParagraphIndex}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeParagraphIndex]);

  if (loading) {
    return (
      <div className={styles.reviewRoom} style={{ alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#6b7280' }}>Đang tải nội dung xem lại bài làm…</p>
      </div>
    );
  }

  if (error || !model) {
    return (
      <div className={styles.reviewRoom} style={{ alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
        <p role="alert" style={{ color: '#ef4444' }}>{error || 'Không tìm thấy dữ liệu.'}</p>
        <button type="button" className={styles.closeCircleBtn} onClick={onBack} title="Quay lại">
          <CloseIcon size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className={styles.reviewRoom}>
      {/* Topbar - YouPass 1:1 Layout */}
      <header className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <button
            type="button"
            className={styles.closeCircleBtn}
            onClick={onBack}
            title="Đóng xem lại"
            aria-label="Đóng xem lại"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <div className={styles.topbarCenter}>
          <div className={styles.clockBox}>
            <ClockIcon size={16} />
            <span>{formatElapsedTime(snapshot.time_spent_seconds)}</span>
          </div>
          <div className={styles.scoreCapsule}>
            <span>{snapshot.correct_marks}/{snapshot.total_marks} câu đúng</span>
          </div>
        </div>

        <div className={styles.topbarActions}>
          <button type="button" className={styles.topbarActionBtn}>
            <NoteIcon size={15} />
            <span>Xem note</span>
          </button>
          <button type="button" className={styles.topbarActionBtn}>
            <GearIcon size={15} />
            <span>Cài đặt</span>
          </button>
          <button type="button" className={`${styles.topbarActionBtn} ${styles.topbarShareBtn}`}>
            <ShareIcon size={15} />
            <span>Chia sẻ bài làm</span>
          </button>
        </div>
      </header>

      {/* Drift/Missing Warning Banner */}
      {model.warning && (
        <div className={styles.warningBanner} role="alert">
          <span>⚠️</span>
          <span>{model.warning}</span>
        </div>
      )}

      {/* Body: Split View with Tool Palette */}
      <div className={styles.bodyContainer}>
        {/* Left: Tool Palette + Passage Column */}
        <div className={styles.passageWrapper}>
          <div className={styles.toolPalette}>
            <div className={styles.toolPaletteTitle}>Công cụ</div>
            <div className={styles.toolCard}>
              <HighlightToolIcon size={20} />
              <span className={styles.toolLabel}>Highlight</span>
              <span className={styles.toolSub}>Phím (H)</span>
            </div>
            <div className={styles.toolCard}>
              <NotesToolIcon size={20} />
              <span className={styles.toolLabel}>Notes</span>
              <span className={styles.toolSub}>Phím (N)</span>
            </div>
            <div className={styles.toolCard}>
              <DictionaryToolIcon size={20} />
              <span className={styles.toolLabel}>Tra từ vựng</span>
              <span className={styles.toolSub}>Phím (T)</span>
            </div>
          </div>

          <div className={styles.passageColumn}>
            <h2 className={styles.passageTitle}>{passageTitle}</h2>
            <div className={styles.passageContent}>
              {paragraphs.length > 0 ? (
                paragraphs.map((para, i) => {
                  const paraLetterMatch = para.match(/^([A-Z])[\.\s]/);
                  const letter = paraLetterMatch ? paraLetterMatch[1].toUpperCase() : null;
                  const headingQ = letter ? headingQuestionsByLetter.get(letter) : undefined;
                  const isParaActive =
                    activeParagraphIndex === i ||
                    (headingQ && activeQuestionOrder === headingQ.historical.question_order);

                  let targetHeadingText = '';
                  if (headingQ) {
                    const targetKey = headingQ.historical.correct_answers[0]?.trim().toLowerCase();
                    const targetOpt = headingQ.content?.options?.find(
                      (o) => o.option.trim().toLowerCase() === targetKey
                    );
                    targetHeadingText = targetOpt
                      ? `${targetOpt.option}. ${targetOpt.text}`
                      : headingQ.historical.correct_answers[0] || '';
                  }

                  // Render paragraph text with highlighted quote if active
                  let paraContent: React.ReactNode = para;
                  if (isParaActive && activeEvidenceQuote) {
                    const normQuote = activeEvidenceQuote.toLowerCase().replace(/\s+/g, ' ').trim();
                    const normPara = para.toLowerCase();
                    let matchIdx = normPara.indexOf(normQuote);
                    let matchLen = normQuote.length;

                    if (matchIdx === -1) {
                      const shortQuote = normQuote.slice(0, Math.min(25, normQuote.length));
                      matchIdx = normPara.indexOf(shortQuote);
                      matchLen = Math.min(para.length - matchIdx, normQuote.length);
                    }

                    if (matchIdx !== -1) {
                      const before = para.slice(0, matchIdx);
                      const matched = para.slice(matchIdx, matchIdx + matchLen);
                      const after = para.slice(matchIdx + matchLen);
                      paraContent = (
                        <>
                          {before}
                          <span className={styles.passageEvidenceHighlight}>{matched}</span>
                          {after}
                        </>
                      );
                    }
                  }

                  return (
                    <div
                      key={i}
                      id={`passage-para-${i}`}
                      className={isParaActive ? styles.passageParagraphHighlighted : undefined}
                      style={{ marginBottom: '1.25rem' }}
                    >
                      {headingQ && targetHeadingText && (
                        <div
                          id={`passage-q-${headingQ.historical.question_order}`}
                          className={styles.passageHeadingBanner}
                        >
                          <span className={styles.passageHeadingOrder}>
                            {headingQ.historical.question_order}
                          </span>
                          <span className={styles.passageHeadingText}>
                            {targetHeadingText}
                          </span>
                          <button
                            type="button"
                            className={styles.passageSpeechBtn}
                            onClick={() => handlePassageSpeechClick(headingQ.historical.question_order)}
                            title={`Xem vị trí câu ${headingQ.historical.question_order}`}
                            aria-label={`Xem vị trí câu ${headingQ.historical.question_order}`}
                          >
                            <LocationSpeechIcon size={18} />
                          </button>
                        </div>
                      )}

                      {isParaActive && !headingQ && (
                        <div className={styles.passageLocateBadge}>
                          <LocationSpeechIcon size={14} />
                          <span>Xem vị trí</span>
                        </div>
                      )}

                      <p>{paraContent}</p>
                    </div>
                  );
                })
              ) : (
                <p style={{ color: '#9ca3af', fontStyle: 'italic' }}>
                  Nội dung bài đọc chưa khả dụng.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Questions + Docked Explanation Drawer */}
        <div className={styles.questionsColumn}>
          <div className={styles.questionsScrollArea}>
            {questionGroups.map((group, groupIndex) => (
              <div key={groupIndex} className={styles.questionGroupCard}>
                <div className={styles.groupHeader}>
                  {group.setTitle && <div className={styles.groupTitle}>{group.setTitle}</div>}
                  {group.instruction && (
                    <div
                      className={styles.groupInstruction}
                      dangerouslySetInnerHTML={{ __html: sanitizeReviewContentHtml(group.instruction) }}
                    />
                  )}
                </div>

                {group.isGapGroup ? (
                  <GapFillingReview
                    questions={group.questions}
                    templateHtml={group.templateHtml}
                    onSelectQuestion={handlePillClick}
                    activeQuestionOrder={activeQuestionOrder}
                  />
                ) : group.isMatrixGroup ? (
                  <MatchingMatrixReview
                    questions={group.questions}
                    onSelectQuestion={handlePillClick}
                    activeQuestionOrder={activeQuestionOrder}
                  />
                ) : group.isHeadingGroup ? (
                  <MatchingHeadingReview
                    questions={group.questions}
                    openExplanations={openHeadingExplanations}
                    onToggleExplanation={(order) => {
                      setOpenHeadingExplanations((prev) => {
                        const next = new Set(prev);
                        if (next.has(order)) next.delete(order);
                        else next.add(order);
                        return next;
                      });
                    }}
                    activeQuestionOrder={activeQuestionOrder}
                    onSelectQuestion={handlePillClick}
                  />
                ) : (
                  group.questions.map((q) => {
                    if (CHOICE_TYPES.has(q.historical.question_type)) {
                      return (
                        <ChoiceQuestionReview
                          key={q.historical.question_id}
                          question={q}
                          onSelectQuestion={handlePillClick}
                          activeQuestionOrder={activeQuestionOrder}
                        />
                      );
                    }
                    return (
                      <ReviewItemFallback
                        key={q.historical.question_id}
                        question={q}
                        onSelectQuestion={handlePillClick}
                        activeQuestionOrder={activeQuestionOrder}
                      />
                    );
                  })
                )}
              </div>
            ))}
          </div>

          {/* Docked Explanation Drawer at bottom of questions column */}
          {activeQuestion && (
            <div
              className={`${styles.dockedExplanationDrawer} ${
                activeQuestion.status === 'correct' ? styles.drawerCorrect : styles.drawerWrong
              }`}
            >
              <div className={styles.dockedDrawerHeader}>
                <span className={styles.dockedDrawerTitle}>
                  Câu {activeQuestion.historical.question_order} - Giải thích đáp án
                </span>
                <button
                  type="button"
                  className={styles.dockedDrawerCloseBtn}
                  onClick={() => setActiveQuestionOrder(null)}
                  title="Đóng giải thích"
                  aria-label="Đóng giải thích"
                >
                  <CloseIcon size={14} />
                </button>
              </div>
              <div
                className={styles.dockedDrawerContent}
                dangerouslySetInnerHTML={{
                  __html: sanitizeReviewContentHtml(
                    activeQuestion.content?.explanation || '<p>Chưa có giải thích chi tiết cho câu hỏi này.</p>'
                  ),
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Bottom Nav Bar - YouPass Signature Capsule & Actions */}
      <footer className={styles.bottomNav}>
        <div className={styles.bottomNavCenter}>
          <div className={styles.capsuleContainer}>
            {model.questions.map((q) => (
              <button
                key={q.historical.question_id}
                type="button"
                className={`${styles.questionPill} ${styles[q.status]} ${
                  activeQuestionOrder === q.historical.question_order ? styles.active : ''
                }`}
                onClick={() => handlePillClick(q.historical.question_order)}
                title={`Câu ${q.historical.question_order} (${q.status})`}
              >
                {q.historical.question_order}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.bottomNavActions}>
          <button type="button" className={styles.btnStepByStep}>
            <span>Sửa từng bước</span>
            <span style={{ fontSize: '0.625rem', backgroundColor: '#ffffff', color: '#ff5722', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 800 }}>PRO</span>
          </button>
          <button type="button" className={styles.btnOtherTest} onClick={onBack}>
            Làm bài khác
          </button>
        </div>
      </footer>
    </div>
  );
}
