import { useId, useLayoutEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

type PopupProps = { memo: string; id: string; anchor: HTMLButtonElement; onClose: () => void };

function MemoPopup({ memo, id, anchor, onClose }: PopupProps) {
  const popup = useRef<HTMLDivElement>(null);

  function close() {
    if (popup.current?.contains(document.activeElement)) anchor.focus();
    onClose();
  }

  useLayoutEffect(() => {
    const element = popup.current!;
    element.showPopover();
    function position() {
      const origin = anchor.getBoundingClientRect();
      const list = anchor.closest('.search-results')!.getBoundingClientRect();
      const body = anchor.closest('.search-dialog-body')!;
      const viewport = body.getBoundingClientRect();
      const controls = body.querySelector('.search-controls')!.getBoundingClientRect();
      const visibleTop = Math.max(list.top, viewport.top, controls.bottom);
      const visibleBottom = Math.min(list.bottom, viewport.bottom);
      if (origin.bottom <= visibleTop || origin.top >= visibleBottom) {
        element.hidePopover();
        return;
      }
      const bounds = element.getBoundingClientRect();
      const left = Math.max(8, Math.min(origin.right + 8, window.innerWidth - bounds.width - 8));
      const top = Math.max(8, Math.min(origin.top - bounds.height - 8, window.innerHeight - bounds.height - 8));
      element.style.left = `${left}px`;
      element.style.top = `${top}px`;
    }
    position();
    window.addEventListener('resize', position);
    document.addEventListener('scroll', position, true);
    return () => {
      window.removeEventListener('resize', position);
      document.removeEventListener('scroll', position, true);
      element.hidePopover();
    };
  }, [anchor]);

  return <div
    ref={popup}
    id={id}
    className="memo-popover"
    popover="auto"
    role="dialog"
    aria-label="메모 전체 내용"
    onToggle={event => { if (event.newState === 'closed') close(); }}
  >
    <div className="memo-popover-header"><span>메모</span><button aria-label="메모 닫기" onClick={close}><X size={16} /></button></div>
    <div className="memo-full-text">{memo}</div>
  </div>;
}

export default function MemoPreview({ memo }: { memo: string }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();

  return <>
    <button
      ref={trigger}
      className="memo-preview"
      disabled={!memo}
      aria-label="메모 전체 보기"
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls={open ? id : undefined}
      onClick={() => {
        if (window.getSelection()?.isCollapsed !== false) setOpen(previous => !previous);
      }}
    >{memo || '—'}</button>
    {open && trigger.current && <MemoPopup id={id} memo={memo} anchor={trigger.current} onClose={() => setOpen(false)} />}
  </>;
}
