import { FolderTree, Hash } from 'lucide-react';
import { toggleSelection } from '../data';
import CategoryTree from './CategoryTree';
import CategoryButtons from './CategoryButtons';
import { useSettings } from '../settings';
type Props = { kind: 'category' | 'tag'; options: string[]; recordedCategories?: string[]; selected: string[]; onChange: (selected: string[])=>void; disabled?: boolean };
export default function FilterPanel({kind,options,recordedCategories,selected,onChange,disabled}:Props) {
  const category=kind==='category';
  const { categorySelectionMode } = useSettings();
  // Retain a selected ancestor as a visible button when switching from the tree.
  const visibleOptions = category && categorySelectionMode === 'buttons'
    ? [...new Set([...(recordedCategories ?? options), ...selected])].sort((a,b) => a.localeCompare(b,'ko'))
    : options;
  return <section className={`card filter-card ${category?'category-filter':''}`} aria-label={category?'카테고리 필터':'태그 필터'}>
    <div className="filter-heading"><span className={`icon-box ${category?'':'violet'}`}>{category?<FolderTree size={18}/>:<Hash size={18}/>}</span><h2>{category?'카테고리':'태그'}</h2><span className="count">{visibleOptions.length}</span></div>
    <div className="filter-scroll"><div className="chips"><button disabled={disabled} className={`chip ${selected.length===0?'selected':''}`} aria-pressed={selected.length===0} onClick={()=>onChange([])}>전체</button></div>
    {category ? categorySelectionMode === 'tree'
      ? <CategoryTree options={options} selected={selected} onChange={onChange}/>
      : <CategoryButtons options={visibleOptions} selected={selected} onChange={onChange}/>
      : <div className="chips tag-chips">{options.map(value=><button key={value} aria-label={value} className={`chip ${selected.includes(value)?'selected':''}`} aria-pressed={selected.includes(value)} onClick={()=>onChange(toggleSelection(selected,value))}><span className="hash">#</span>{value}</button>)}</div>}
    {!options.length&&<p className="filter-placeholder">{disabled?'파일을 선택하면 항목이 표시됩니다.':'사용 가능한 항목이 없습니다.'}</p>}</div>
  </section>;
}
