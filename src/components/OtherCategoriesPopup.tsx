import { useLayoutEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { formatPercentage, type CategoryShare } from '../analysis';
import { won } from '../data';

type Props = { rows: CategoryShare[]; point: { x: number; y: number }; partLabel: string; onClose: () => void; restoreFocus: () => void };

export default function OtherCategoriesPopup({ rows, point, partLabel, onClose, restoreFocus }: Props) {
  const popup = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = popup.current!;
    element.showPopover();
    const position = () => {
      const bounds = element.getBoundingClientRect();
      element.style.left = `${Math.max(8, Math.min(point.x + 10, window.innerWidth - bounds.width - 8))}px`;
      element.style.top = `${Math.max(8, Math.min(point.y + 10, window.innerHeight - bounds.height - 8))}px`;
    };
    position();
    window.addEventListener('resize', position);
    return () => { window.removeEventListener('resize', position); element.hidePopover(); };
  }, [point]);

  return <div ref={popup} className="other-categories-popup" popover="auto" role="dialog" aria-label="그 외 카테고리" onToggle={event => { if (event.newState === 'closed') onClose(); }}>
    <div className="other-popup-header"><strong>그 외</strong><button aria-label="그 외 닫기" onClick={() => { onClose(); restoreFocus(); }}><X size={16} /></button></div>
    <div className="other-popup-scroll"><table className="other-categories-table"><thead><tr><th>카테고리</th><th>백분율</th><th>{partLabel} 금액</th></tr></thead><tbody>{rows.map((row, index) => <tr key={row.category} className="other-category-row" style={{ animationDelay: `${index * 80}ms` }}><th scope="row">{row.category}</th><td>{formatPercentage(row.percentage)}</td><td>{won(row.amount)}</td></tr>)}</tbody></table></div>
  </div>;
}
