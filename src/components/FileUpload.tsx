import { useRef, useState, type DragEvent } from 'react';
import { ArrowUpRight, CheckCircle2, FileJson, Upload } from 'lucide-react';

type Props = {
  fileName: string;
  summary?: string;
  loading: boolean;
  onFiles: (files: File[]) => void;
};

export default function FileUpload({ fileName, summary, loading, onFiles }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const hasFiles = (event: DragEvent<HTMLElement>) => event.dataTransfer.types.includes('Files');

  return <section
    className={`upload-card ${dragging ? 'dragging' : ''}`}
    aria-label="JSON 파일 업로드"
    onDragEnter={event => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragDepth.current += 1;
      setDragging(true);
    }}
    onDragOver={event => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    }}
    onDragLeave={event => {
      event.preventDefault();
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragging(false);
    }}
    onDrop={event => {
      event.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      onFiles(Array.from(event.dataTransfer.files));
    }}
  >
    <div className="upload-icon"><FileJson size={25} /></div>
    <div className="upload-copy">
      <h2>{dragging ? 'JSON 파일 놓기' : fileName || 'JSON 백업 · 드래그 앤 드롭'}</h2>
      {summary && <p><CheckCircle2 size={13} />{summary}</p>}
    </div>
    <input
      ref={input}
      type="file"
      accept=".json,application/json"
      className="file-input"
      aria-label="JSON 파일 선택"
      onChange={event => {
        onFiles(Array.from(event.target.files ?? []));
        event.target.value = '';
      }}
    />
    <button className="primary" onClick={() => input.current?.click()} disabled={loading}>
      <Upload size={16} />{loading ? '파일 읽는 중…' : fileName ? '다른 파일 선택' : 'JSON 파일 선택'}<ArrowUpRight size={16} />
    </button>
  </section>;
}
