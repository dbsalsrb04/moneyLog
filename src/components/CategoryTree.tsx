import { useId, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { toggleSelection } from '../data';

type CategoryNode = { path: string; label: string; children: CategoryNode[] };
type Props = {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
};

function buildTree(options: string[]): CategoryNode[] {
  const roots: CategoryNode[] = [];
  const nodes = new Map<string, CategoryNode>();
  for (const option of options) {
    const parts = option.split('/');
    let siblings = roots;
    parts.forEach((label, index) => {
      const path = parts.slice(0, index + 1).join('/');
      let node = nodes.get(path);
      if (!node) {
        node = { path, label, children: [] };
        nodes.set(path, node);
        siblings.push(node);
      }
      siblings = node.children;
    });
  }
  return roots;
}

export default function CategoryTree({ options, selected, onChange }: Props) {
  const roots = useMemo(() => buildTree(options), [options]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const id = useId();

  function toggleExpanded(path: string) {
    setExpanded(previous => {
      const next = new Set(previous);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  function renderNode(node: CategoryNode, depth: number) {
    const open = expanded.has(node.path);
    const childrenId = `${id}-${encodeURIComponent(node.path)}`;
    return <div key={node.path}>
      <div className={`category-row ${depth === 0 ? 'category-root' : ''}`} style={{ paddingLeft: Math.min(depth, 5) * 14 }}>
        <button
          className={`chip category-option ${selected.includes(node.path) ? 'selected' : ''}`}
          title={node.path}
          aria-label={node.path}
          aria-pressed={selected.includes(node.path)}
          onClick={() => onChange(toggleSelection(selected, node.path))}
        >
          {depth > 0 ? <span className="branch">└</span> : null}
          {node.label}
        </button>
        {node.children.length > 0 && <button
          className="category-toggle"
          aria-label={`${node.path} ${open ? '접기' : '펼치기'}`}
          aria-expanded={open}
          aria-controls={childrenId}
          onClick={() => toggleExpanded(node.path)}
        >
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>}
      </div>
      {node.children.length > 0 && <div id={childrenId} hidden={!open}>
        {node.children.map(child => renderNode(child, depth + 1))}
      </div>}
    </div>;
  }

  return <div className="category-tree">{roots.map(node => renderNode(node, 0))}</div>;
}
