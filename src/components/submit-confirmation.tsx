'use client';

import { useEffect, useRef } from 'react';
import styles from './submit-confirmation.module.css';

export function SubmitConfirmation({ open, unansweredMarks, onCancel, onConfirm }: {
  open: boolean;
  unansweredMarks: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (open && !element?.open) element?.showModal();
    if (!open && element?.open) element.close();
  }, [open]);

  return (
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="submit-title"
      aria-describedby="submit-description" onCancel={onCancel}
      onKeyDown={event => {
        if (event.key !== 'Tab') return;
        const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>('button');
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first.focus();
        }
      }}>
      <div className={styles.content}>
        <button type="button" className={styles.close} aria-label="Đóng" onClick={onCancel}>×</button>
        <h2 id="submit-title">Xác nhận nộp bài</h2>
        <p id="submit-description">
          {unansweredMarks > 0
            ? `Bạn còn ${unansweredMarks} câu hỏi chưa hoàn thành. Bạn có chắc chắn muốn nộp bài không?`
            : 'Bạn có chắc chắn muốn nộp bài không?'}
        </p>
        <div className={styles.actions}>
          <button type="button" autoFocus onClick={onCancel}>Hủy</button>
          <button type="button" className={styles.confirm} onClick={onConfirm}>Nộp bài</button>
        </div>
      </div>
    </dialog>
  );
}
