'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import type { SubmissionSnapshot } from '@/types/database';
import type { ReviewModel, ReviewQuestion, ReviewSection } from '@/types/reading-review';
import { loadReadingReview } from '@/lib/reading-review';
import { buildReviewPills } from '@/lib/reading-review-slots';
import { resolveReadingLocate } from '@/lib/reading-locate';
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

    loadReadingReview(snapshot, supabase, { includePassageStructure: true })
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

  const capsulePills = useMemo(() => {
    if (!model) return [];
    return buildReviewPills(model);
  }, [model]);

  const handlePillClick = useCallback((order: number) => {
    setActiveQuestionOrder(order);
    const targetQ = model?.questions.find((q) => {
      if (q.historical.question_order === order) return true;
      const maxMarks = q.historical.max_marks || 1;
      return order >= q.historical.question_order && order < q.historical.question_order + maxMarks;
    });
    const isHeading = targetQ?.historical.question_type === 'MATCHING_HEADING';
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
          document.getElementById(`q-${targetQ?.historical.question_order}`) ||
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
      model.questions.find((q) => {
        if (q.historical.question_order === activeQuestionOrder) return true;
        const maxMarks = q.historical.max_marks || 1;
        return (
          activeQuestionOrder >= q.historical.question_order &&
          activeQuestionOrder < q.historical.question_order + maxMarks
        );
      }) || null
    );
  }, [model, activeQuestionOrder]);

  const activeSlot = useMemo(() => {
    if (!activeQuestion || activeQuestionOrder === null) return undefined;
    const locateInfo = activeQuestion.content?.locate_info;
    if (!locateInfo || 'paragraph_ranges' in locateInfo) return undefined;
    return Math.max(0, activeQuestionOrder - activeQuestion.historical.question_order);
  }, [activeQuestion, activeQuestionOrder]);

  const sectionContent = activeSection?.content;
  const passageTitle = sectionContent?.section_title || sectionContent?.title || 'Bài đọc Reading';
  const passageText = sectionContent?.passage_text;
  const passageStructure = sectionContent?.passage_structure ?? null;
  const sectionNumber = activeSection?.sectionNumber ?? 1;
  const sectionLabel = `Reading passage ${sectionNumber}`;
  const minQuestionOrder = useMemo(() => {
    if (!model || model.questions.length === 0) return 1;
    return Math.min(...model.questions.map((q) => q.historical.question_order));
  }, [model]);
  const maxQuestionOrder = useMemo(() => {
    if (!model || model.questions.length === 0) return 40;
    return Math.max(
      ...model.questions.map(
        (q) => q.historical.question_order + (q.historical.max_marks || 1) - 1
      )
    );
  }, [model]);
  const showMetaHeader = passageTitle !== sectionLabel;

  const locateResolution = useMemo(() => {
    if (!activeQuestion || !sectionContent) return null;
    return resolveReadingLocate(
      sectionContent.passage_structure,
      activeQuestion.content?.locate_info,
      {
        passageText: sectionContent.passage_text,
        slot: activeSlot,
      }
    );
  }, [activeQuestion, sectionContent, activeSlot]);

  const highlightedTokenIds = useMemo(() => {
    if (!locateResolution || !locateResolution.available) return new Set<string>();
    return new Set<string>(locateResolution.tokenIds);
  }, [locateResolution]);

  const activeParagraphNumber = useMemo(() => {
    if (!locateResolution || !locateResolution.available) return null;
    const firstToken = locateResolution.ranges[0]?.tokens[0];
    return firstToken ? firstToken.paragraph : null;
  }, [locateResolution]);

  const rawParagraphs = useMemo(() => {
    if (!passageText) return [];
    return passageText.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  }, [passageText]);

  // Fallback paragraphs when passage_structure is null
  const fallbackParagraphs = useMemo(
    () => rawParagraphs.filter((p) => !/^\d+$/.test(p)),
    [rawParagraphs]
  );

  useEffect(() => {
    if (activeParagraphNumber !== null) {
      const el = document.getElementById(`passage-para-${activeParagraphNumber}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeParagraphNumber]);

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

        <div className={styles.topbarActions} />
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
            {showMetaHeader && (
              <div className={styles.passageMetaHeader}>
                <div className={styles.passageSectionLabel}>{sectionLabel}</div>
                <p className={styles.passageInstructionMeta}>
                  You should spend about 20 minutes on questions {minQuestionOrder} - {maxQuestionOrder} which are based on Reading Passage {sectionNumber} below.
                </p>
              </div>
            )}
            <h2 className={styles.passageTitle}>{passageTitle}</h2>
            <div className={styles.passageContent}>
              {passageStructure ? (
                passageStructure.paragraphs.map((p) => {
                  if (p.sentences.length === 0) return null;
                  const firstTokenText = p.sentences[0]?.tokens[0]?.text?.trim() || '';
                  const paraLetterMatch = firstTokenText.match(/^([A-Z])[\.\s]?$/);
                  const letter = paraLetterMatch ? paraLetterMatch[1].toUpperCase() : null;
                  const headingQ = letter ? headingQuestionsByLetter.get(letter) : undefined;
                  const isParaActive =
                    activeParagraphNumber === p.paragraph ||
                    (headingQ && activeQuestionOrder === headingQ.historical.question_order);

                  let targetHeadingText = '';
                  let userAnswerText = '';
                  let isHeadingCorrect = false;

                  if (headingQ) {
                    isHeadingCorrect = headingQ.status === 'correct';
                    const targetKey = headingQ.historical.correct_answers[0]?.trim().toLowerCase();
                    const targetOpt = headingQ.content?.options?.find(
                      (o) => o.option.trim().toLowerCase() === targetKey
                    );
                    targetHeadingText = targetOpt
                      ? `${targetOpt.option}. ${targetOpt.text}`
                      : headingQ.historical.correct_answers[0] || '';

                    const userRaw = Array.isArray(headingQ.historical.user_answer)
                      ? headingQ.historical.user_answer[0]
                      : headingQ.historical.user_answer;
                    const userKey = userRaw ? userRaw.trim().toLowerCase() : '';
                    const userOpt = headingQ.content?.options?.find(
                      (o) => o.option.trim().toLowerCase() === userKey
                    );
                    userAnswerText = userOpt ? userOpt.text : userRaw || '';
                  }

                  return (
                    <div
                      key={p.paragraph}
                      id={`passage-para-${p.paragraph}`}
                      className={isParaActive ? styles.passageParagraphHighlighted : undefined}
                      style={{ marginBottom: '1.25rem' }}
                    >
                      {headingQ && targetHeadingText && (
                        <div
                          id={`passage-q-${headingQ.historical.question_order}`}
                          className={styles.passageHeadingBlock}
                        >
                          <div className={styles.headingUserRow}>
                            <div className={styles.headingOrderCircle}>
                              {headingQ.historical.question_order}
                            </div>
                            <div className={styles.headingUserBox}>
                              <span
                                className={
                                  isHeadingCorrect
                                    ? styles.headingUserText
                                    : styles.headingUserTextWrong
                                }
                              >
                                {userAnswerText || ''}
                              </span>
                              {isParaActive && (
                                <div className={styles.headingLocateTooltip}>
                                  <span>Xem vị trí</span>
                                </div>
                              )}
                              {isHeadingCorrect ? (
                                <span className={styles.headingCorrectMark}>✓</span>
                              ) : (
                                <span className={styles.headingWrongMark}>✕</span>
                              )}
                            </div>
                          </div>

                          <div className={styles.headingAnswerRow}>
                            <span className={styles.headingAnswerLabel}>Đáp án:</span>
                            <span className={styles.headingAnswerTarget}>
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
                        </div>
                      )}

                      {isParaActive && !headingQ && (
                        <div className={styles.passageLocateBadge}>
                          <LocationSpeechIcon size={14} />
                          <span>Xem vị trí</span>
                        </div>
                      )}

                      <p>
                        {p.sentences.map((s) => (
                          <span key={s.sentence} className={styles.passageSentence}>
                            {s.tokens.map((t) => {
                              const tokenId = `word-${p.paragraph}-${s.sentence}-${t.index}`;
                              const isHighlighted = highlightedTokenIds.has(tokenId);
                              return (
                                <span
                                  key={t.index}
                                  id={tokenId}
                                  className={
                                    isHighlighted ? styles.passageWordHighlighted : styles.passageWord
                                  }
                                >
                                  {t.text}
                                </span>
                              );
                            })}
                          </span>
                        ))}
                      </p>
                    </div>
                  );
                })
              ) : fallbackParagraphs.length > 0 ? (
                fallbackParagraphs.map((para, i) => {
                  const paraLetterMatch = para.match(/^([A-Z])[\.\s]/);
                  const letter = paraLetterMatch ? paraLetterMatch[1].toUpperCase() : null;
                  const headingQ = letter ? headingQuestionsByLetter.get(letter) : undefined;
                  const isParaActive =
                    headingQ && activeQuestionOrder === headingQ.historical.question_order;

                  let targetHeadingText = '';
                  let userAnswerText = '';
                  let isHeadingCorrect = false;

                  if (headingQ) {
                    isHeadingCorrect = headingQ.status === 'correct';
                    const targetKey = headingQ.historical.correct_answers[0]?.trim().toLowerCase();
                    const targetOpt = headingQ.content?.options?.find(
                      (o) => o.option.trim().toLowerCase() === targetKey
                    );
                    targetHeadingText = targetOpt
                      ? `${targetOpt.option}. ${targetOpt.text}`
                      : headingQ.historical.correct_answers[0] || '';

                    const userRaw = Array.isArray(headingQ.historical.user_answer)
                      ? headingQ.historical.user_answer[0]
                      : headingQ.historical.user_answer;
                    const userKey = userRaw ? userRaw.trim().toLowerCase() : '';
                    const userOpt = headingQ.content?.options?.find(
                      (o) => o.option.trim().toLowerCase() === userKey
                    );
                    userAnswerText = userOpt ? userOpt.text : userRaw || '';
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
                          className={styles.passageHeadingBlock}
                        >
                          <div className={styles.headingUserRow}>
                            <div className={styles.headingOrderCircle}>
                              {headingQ.historical.question_order}
                            </div>
                            <div className={styles.headingUserBox}>
                              <span
                                className={
                                  isHeadingCorrect
                                    ? styles.headingUserText
                                    : styles.headingUserTextWrong
                                }
                              >
                                {userAnswerText || ''}
                              </span>
                              {isParaActive && (
                                <div className={styles.headingLocateTooltip}>
                                  <span>Xem vị trí</span>
                                </div>
                              )}
                              {isHeadingCorrect ? (
                                <span className={styles.headingCorrectMark}>✓</span>
                              ) : (
                                <span className={styles.headingWrongMark}>✕</span>
                              )}
                            </div>
                          </div>

                          <div className={styles.headingAnswerRow}>
                            <span className={styles.headingAnswerLabel}>Đáp án:</span>
                            <span className={styles.headingAnswerTarget}>
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
                        </div>
                      )}

                      <p>{para}</p>
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
                  Câu {activeQuestionOrder ?? activeQuestion.historical.question_order} - Giải thích đáp án
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
              <div className={styles.dockedDrawerContent}>
                {locateResolution && !locateResolution.available && (
                  <div className={styles.locateUnavailableNotice}>
                    <span>ℹ️</span>
                    <span>Vị trí dẫn chứng trong bài đọc chưa khả dụng cho câu hỏi này.</span>
                  </div>
                )}
                <div
                  dangerouslySetInnerHTML={{
                    __html: sanitizeReviewContentHtml(
                      activeQuestion.content?.explanation || '<p>Chưa có giải thích chi tiết cho câu hỏi này.</p>'
                    ),
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Nav Bar - YouPass Signature Capsule & Actions */}
      <footer className={styles.bottomNav}>
        <div className={styles.bottomNavCenter}>
          <div className={styles.capsuleContainer}>
            {capsulePills.map((p) => (
              <button
                key={p.questionId}
                type="button"
                className={`${styles.questionPill} ${styles[p.status] || ''} ${
                  activeQuestionOrder === p.order ? styles.active : ''
                }`}
                onClick={() => handlePillClick(p.order)}
                title={p.status === 'unknown'
                  ? `Câu ${p.order}: chưa xác định (${p.reason === 'legacy_selection_order' ? 'bài cũ thiếu thứ tự lựa chọn' : 'điểm lưu không khớp lựa chọn'})`
                  : `Câu ${p.order} (${p.status})`}
              >
                {p.order}
              </button>
            ))}
          </div>
          {capsulePills.some((p) => p.status === 'unknown') && (
            <div className={styles.unknownLegend} role="note" aria-label="Bài cũ thiếu thứ tự lựa chọn">
              <span className={styles.unknownLegendBadge} aria-hidden="true" />
              <span>Bài cũ thiếu thứ tự lựa chọn</span>
            </div>
          )}
        </div>

        <div className={styles.bottomNavActions}>
          <button type="button" className={styles.btnOtherTest} onClick={onBack}>
            Làm bài khác
          </button>
        </div>
      </footer>
    </div>
  );
}
