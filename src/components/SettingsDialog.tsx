import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Settings, X } from 'lucide-react';
import { useSettings } from '../settings';

export default function SettingsDialog({ onClose }: { onClose: () => void }) {
  const { categorySelectionMode, setCategorySelectionMode } = useSettings();
  const dialog = useRef<HTMLDialogElement>(null);
  const backdropPointerDown = useRef(false);
  const id = useId();

  useEffect(() => {
    const element = dialog.current!;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    element.showModal();
    document.body.style.overflow = 'hidden';
    element.querySelector<HTMLInputElement>('input:checked')?.focus();
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  return createPortal(<dialog
    ref={dialog}
    className="settings-dialog"
    aria-labelledby={`${id}-title`}
    aria-modal="true"
    onCancel={event => { event.preventDefault(); onClose(); }}
    onPointerDownCapture={event => {
      const bounds = event.currentTarget.getBoundingClientRect();
      backdropPointerDown.current = event.target === event.currentTarget && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom);
    }}
    onPointerCancel={() => { backdropPointerDown.current = false; }}
    onClick={event => {
      const startedOnBackdrop = backdropPointerDown.current;
      backdropPointerDown.current = false;
      if (!startedOnBackdrop || event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
    }}
    onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const first = event.currentTarget.querySelector<HTMLButtonElement>('button')!;
      const last = event.currentTarget.querySelector<HTMLInputElement>('input:checked')!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    }}
  >
    <div className="settings-dialog-header"><h2 id={`${id}-title`}><Settings size={20} />설정</h2><button className="search-close" aria-label="설정 닫기" onClick={onClose}><X size={21} /></button></div>
    <fieldset className="settings-field">
      <legend>카테고리 선택 방식</legend>
      <div className="category-mode-options">
        <label><input type="radio" name={`${id}-category-mode`} value="tree" checked={categorySelectionMode === 'tree'} onChange={() => setCategorySelectionMode('tree')} />트리</label>
        <label><input type="radio" name={`${id}-category-mode`} value="buttons" checked={categorySelectionMode === 'buttons'} onChange={() => setCategorySelectionMode('buttons')} />개별 버튼</label>
      </div>
    </fieldset>
  </dialog>, document.body);
}
