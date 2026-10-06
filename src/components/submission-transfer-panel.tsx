'use client';

import { useState } from 'react';
import { getLocalRepository } from '@/lib/submission-client';
import { parseImport, readEnvelope, exportSubmissions } from '@/lib/submission-transfer';
import { utf8Bytes } from '@/lib/submission-snapshot';
import { LOCAL_MAX_ATTEMPTS, LOCAL_MAX_BYTES } from '@/lib/local-submission-repository';
import { storageFailureMessage, describeSubmission } from '@/lib/submission-presentation';
import { SubmissionError } from '@/lib/submission-errors';
import type { SubmissionImportReport } from '@/types/submission-storage';
import styles from './submission-history.module.css';

export function SubmissionTransferPanel({onChanged}:{onChanged:()=>void}) {
  const [report,setReport] = useState<SubmissionImportReport | null>(null);
  const [fileName,setFileName] = useState('');
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState('');
  const [error,setError] = useState('');
  async function download() {
    setError('');setBusy(true);
    try {
      const json=await getLocalRepository().exportSubmissions();
      const url=URL.createObjectURL(new Blob([json],{type:'application/json'}));
      const link=document.createElement('a');link.href=url;link.download='youfat-submissions-v1.json';
      document.body.append(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    } catch (cause) {setError(storageFailureMessage(cause));}
    finally {setBusy(false);}
  }
  async function preview(file:File) {
    setReport(null);setError('');setMessage('');setFileName(file.name);setBusy(true);
    try {
      // Bound untrusted file parsing; this isn't the repository's storage cap.
      if(file.size>10*1024*1024) throw new SubmissionError('VALIDATION_ERROR','IMPORT_FILE_TOO_LARGE');
      const current=readEnvelope(JSON.parse(await getLocalRepository().exportSubmissions()));
      setReport(parseImport(await file.text(),current.submissions));
    } catch(cause) {setError(storageFailureMessage(cause));}
    finally {setBusy(false);}
  }
  async function confirm() {
    if(!report || busy) return;
    setBusy(true);setError('');let saved=0;
    try {
      const repository=getLocalRepository();
      // Re-preview against fresh data; another tab may have saved since the preview.
      const current=readEnvelope(JSON.parse(await repository.exportSubmissions()));
      const fresh=parseImport(exportSubmissions(report.valid),current.submissions);
      if(fresh.conflicts.length) throw new SubmissionError('PAYLOAD_CONFLICT','IMPORT_CONFLICT');
      const merged=[...current.submissions,...fresh.valid];
      if(merged.length>LOCAL_MAX_ATTEMPTS || utf8Bytes(exportSubmissions(merged))>LOCAL_MAX_BYTES)
        throw new SubmissionError('STORAGE_FULL','IMPORT_LIMIT');
      for(const snapshot of fresh.valid) {await repository.save(snapshot);saved++;}
      setMessage(`Đã nhập ${saved} bài. ${fresh.duplicates.length} bài trùng đã được giữ nguyên.`);
      setReport(null);
    } catch(cause) {
      setError(`${storageFailureMessage(cause)}${saved ? ` Đã lưu ${saved} bài trước khi gặp lỗi; thử lại không tạo bản trùng.` : ''}`);
    } finally {setBusy(false);onChanged();}
  }
  return <section className={styles.card} aria-labelledby="transfer-title">
    <h2 id="transfer-title">Xuất / nhập bài làm</h2>
    <div className={styles.actions}>
      <button type="button" disabled={busy} onClick={()=>void download()}>Xuất file JSON</button>
      <label className={styles.fileLabel}>Chọn file để nhập
        <input className={styles.fileInput} type="file" accept=".json,application/json" disabled={busy}
          onChange={event=>{const file=event.target.files?.[0];event.target.value='';if(file) void preview(file);}} />
      </label>
    </div>
    {busy && <p role="status">Đang xử lý…</p>}
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {message && <p role="status">{message}</p>}
    {report && <div className={styles.preview}>
      <h3>Xem trước nhập file</h3><p>{fileName}</p>
      <p>Hợp lệ: {report.valid.length} · Lỗi: {report.errors.length} · Trùng: {report.duplicates.length} · Xung đột: {report.conflicts.length}</p>
      <p className={styles.muted}>Chưa ghi dữ liệu. Chỉ nhập bài hợp lệ mới; bỏ qua bài lỗi, trùng hoặc xung đột. Không ghi đè bài cũ.</p>
      <ul>{report.valid.map(snapshot=>{const label=describeSubmission(snapshot);return <li key={snapshot.id}>{label.title} — {label.skill}, {label.scope} · {snapshot.correct_marks}/{snapshot.total_marks}</li>;})}
        {[...report.errors,...report.duplicates,...report.conflicts].map((issue,index)=><li key={index}>{issue.index<0?'File':`Mục ${issue.index+1}`}: {issue.reason}</li>)}
      </ul>
      <div className={styles.actions}>
        <button type="button" onClick={()=>setReport(null)} disabled={busy}>Hủy nhập</button>
        <button type="button" className={styles.primary} onClick={()=>void confirm()} disabled={busy || !report.valid.length}>Xác nhận nhập {report.valid.length} bài</button>
      </div>
    </div>}
  </section>;
}
