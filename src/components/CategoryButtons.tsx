import { Check } from 'lucide-react';
import { toggleSelection } from '../data';

type Props = { options: string[]; selected: string[]; onChange: (selected: string[]) => void };

export default function CategoryButtons({ options, selected, onChange }: Props) {
  return <div className="chips category-buttons">{options.map((value, index) => {
    const button = <button
      className={`chip ${selected.includes(value) ? 'selected' : ''}`}
      aria-label={value}
      aria-pressed={selected.includes(value)}
      onClick={() => onChange(toggleSelection(selected, value))}
    >{selected.includes(value) && <Check size={13} />}{value}</button>;
    const newGroup = index > 0 && value.split('/')[0] !== options[index - 1].split('/')[0];
    return newGroup ? <span className="category-group-start" key={value}>
      <span className="category-divider" role="separator" aria-orientation="vertical" />{button}
    </span> : <span className="category-button-item" key={value}>{button}</span>;
  })}</div>;
}
