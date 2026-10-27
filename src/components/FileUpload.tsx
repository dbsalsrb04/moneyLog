import { useRef, useState, type DragEvent } from 'react';
import { ArrowUpRight, CheckCircle2, FileJson, Upload } from 'lucide-react';
import { pickBackupFile } from '../filePicker';

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
  const [picking, setPicking] = useState(false);
  const [pickerError, setPickerError] = useState('');
  const hasFiles = (event: DragEvent<HTMLElement>) => event.dataTransfer.types.includes('Files');

  async function chooseFile() {
    setPickerError('');
    setPicking(true);
    try {
      const result = await pickBackupFile();
      if (result.status === 'unsupported') input.current?.click();
      else if (result.status === 'selected') onFiles([result.file]);
    } catch {
      setPickerError('파일을 열 수 없습니다. 파일이 이동하거나 삭제되지 않았는지 확인하고 다시 선택해 주세요.');
    } finally {
      setPicking(false);
    }
  }

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
      setPickerError('');
      onFiles(Array.from(event.dataTransfer.files));
    }}
  >
    <div className="upload-icon"><FileJson size={25} /></div>
    <div className="upload-copy">
      <h2>{dragging ? 'JSON 파일 놓기' : fileName || 'JSON 백업 · 드래그 앤 드롭'}</h2>
      {summary && <p><CheckCircle2 size={13} />{summary}</p>}
      {pickerError && <p className="file-picker-error" role="alert">{pickerError}</p>}
    </div>
    <input
      ref={input}
      type="file"
      accept=".json,application/json"
      className="file-input"
      hidden
      aria-label="JSON 파일 선택"
      onChange={event => {
        setPickerError('');
        onFiles(Array.from(event.target.files ?? []));
        event.target.value = '';
      }}
    />
    <button className="primary" onClick={chooseFile} disabled={loading || picking}>
      <Upload size={16} />{loading ? '파일 읽는 중…' : fileName ? '다른 파일 선택' : 'JSON 파일 선택'}<ArrowUpRight size={16} />
    </button>
  </section>;
}
