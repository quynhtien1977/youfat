"use client";

// ============================================================
// PassagePanel – left pane, YouPass style
// ============================================================

interface PassagePanelProps {
  section: {
    title: string;
    section_title?: string | null;
    passage_text?: string | null;
  };
}

export function PassagePanel({ section }: PassagePanelProps) {
  const text = section.passage_text ?? "";
  const paragraphs = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="yf-passage-panel">
      <h2 className="yf-passage-title">
        {section.section_title ?? section.title}
      </h2>

      <div className="yf-passage-text">
        {paragraphs.length > 0 ? (
          paragraphs.map((para, i) => <p key={i}>{para}</p>)
        ) : (
          <div className="yf-passage-empty">
            <div className="yf-passage-empty-icon">📄</div>
            <div className="yf-passage-empty-title">
              Bài đọc chưa được nhập vào hệ thống
            </div>
            <p className="yf-passage-empty-desc">
              Nội dung passage đang được cập nhật. Bạn vẫn có thể làm câu
              hỏi ở bên phải và tự chấm điểm sau khi nộp bài.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
