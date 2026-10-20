import { Check, FolderTree, Hash } from 'lucide-react';
import { toggleSelection } from '../data';
type Props = { kind: 'category' | 'tag'; options: string[]; selected: string[]; onChange: (selected: string[])=>void; disabled?: boolean };
export default function FilterPanel({kind,options,selected,onChange,disabled}:Props) {
  const category=kind==='category';
  return <section className="card filter-card" aria-label={category?'카테고리 필터':'태그 필터'}>
    <div className="filter-heading"><span className={`icon-box ${category?'':'violet'}`}>{category?<FolderTree size={18}/>:<Hash size={18}/>}</span><h2>{category?'카테고리':'태그'}</h2><span className="count">{options.length}</span></div>
    <p className="muted filter-description">{category?'상위 항목 선택 시 하위 항목도 포함해요.':'여러 태그를 선택해 함께 확인하세요.'}</p>
    <div className="filter-scroll"><div className="chips"><button disabled={disabled} className={`chip ${selected.length===0?'selected':''}`} aria-pressed={selected.length===0} onClick={()=>onChange([])}>{!selected.length&&<Check size={13}/>}전체</button></div>
    {category ? <div className="category-tree">{options.map(value=>{const depth=value.split('/').length-1; return <div key={value} style={{paddingLeft:Math.min(depth,5)*14}} className={depth?'tree-child':'tree-parent'}><button className={`chip ${selected.includes(value)?'selected':''}`} title={value} aria-label={value} aria-pressed={selected.includes(value)} onClick={()=>onChange(toggleSelection(selected,value))}>{selected.includes(value)?<Check size={13}/>:depth>0?<span className="branch">└</span>:null}{value.split('/').at(-1)}</button></div>;})}</div> : <div className="chips tag-chips">{options.map(value=><button key={value} aria-label={value} className={`chip ${selected.includes(value)?'selected':''}`} aria-pressed={selected.includes(value)} onClick={()=>onChange(toggleSelection(selected,value))}><span className="hash">#</span>{value}</button>)}</div>}
    {!options.length&&<p className="filter-placeholder">{disabled?'파일을 선택하면 항목이 표시됩니다.':'사용 가능한 항목이 없습니다.'}</p>}</div>
  </section>;
}
