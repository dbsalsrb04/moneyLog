import { useId, useState } from 'react';
import { CircleHelp } from 'lucide-react';

export default function HelpTip({ label, children }: { label: string; children: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return <span className="analysis-help" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
    <button type="button" aria-label={label} aria-describedby={open ? id : undefined} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); }
    }}><CircleHelp size={16} /></button>
    {open && <span id={id} role="tooltip" className="help-tooltip">{children}</span>}
  </span>;
}
