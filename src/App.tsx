import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { ArrowUpRight, BarChart3, CalendarDays, CheckCircle2, FileJson, RotateCcw, Upload } from 'lucide-react';
import { aggregateDaily, aggregateMonthly, filterExpenses, monthRange, parseBackup, won, type Backup } from './data';
import FilterPanel from './components/FilterPanel';
import SpendingChart from './components/SpendingChart';
export default function App(){
 const [backup,setBackup]=useState<Backup|null>(null),[fileName,setFileName]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(false);
 const [period,setPeriod]=useState(12),[month,setMonth]=useState(''),[categories,setCategories]=useState<string[]>([]),[tags,setTags]=useState<string[]>([]);
 const input=useRef<HTMLInputElement>(null); const uploadVersion=useRef(0);
 const expenses=useMemo(()=>filterExpenses(backup?.transactions??[],categories,tags),[backup,categories,tags]);
 const monthly=useMemo(()=>backup?aggregateMonthly(expenses,backup.latestMonth,period):[],[backup,expenses,period]);
 const daily=useMemo(()=>month?aggregateDaily(expenses,month):[],[expenses,month]);
 const months=useMemo(()=>backup?monthRange(backup.firstMonth<monthly[0].key?backup.firstMonth:monthly[0].key,backup.latestMonth).reverse():[],[backup,monthly]);
 const total=(points: typeof daily)=>points.reduce((sum,p)=>sum+p.amount,0);
 async function upload(event:ChangeEvent<HTMLInputElement>){
  const file=event.target.files?.[0]; if(!file)return;
  const version=++uploadVersion.current; setLoading(true);setError('');
  try {const data=parseBackup(await file.text());if(version!==uploadVersion.current)return;setBackup(data);setFileName(file.name);setCategories([]);setTags([]);setPeriod(12);setMonth(data.latestMonth);}
  catch(e){if(version===uploadVersion.current)setError(e instanceof Error?e.message:'파일을 읽지 못했습니다. 다시 선택해 주세요.');}
  finally{if(version===uploadVersion.current)setLoading(false);event.target.value='';}
 }
 return <div className="app-shell"><header className="site-header"><a className="brand" href="./"><span className="brand-mark"><BarChart3 size={22}/></span>money<span>Log</span><span className="brand-dot"/></a></header>
 <main>
 <section className={`upload-card ${backup?'has-file':''}`} aria-label="JSON 파일 업로드"><div className="upload-icon"><FileJson size={25}/></div><div className="upload-copy"><h2>{backup?fileName:'가계부 JSON 백업'}</h2>{backup&&<p><CheckCircle2 size={13}/>{backup.transactions.length.toLocaleString('ko-KR')}개 거래 · {backup.firstMonth.replace('-','.')} – {backup.latestMonth.replace('-','.')}</p>}</div><input ref={input} type="file" accept=".json,application/json" onChange={upload} className="file-input" aria-label="JSON 파일 선택"/><button className="primary" onClick={()=>input.current?.click()} disabled={loading}><Upload size={16}/>{loading?'파일 읽는 중…':backup?'다른 파일 선택':'JSON 파일 선택'}<ArrowUpRight size={16}/></button></section>
 {error&&<div className="error" role="alert">{error}{backup&&' 기존 분석 데이터는 유지됩니다.'}</div>}
 <div className="section-heading"><h2>소비 대시보드</h2><span className="expense-badge"><span/>지출 E</span></div>
 <div className="dashboard"><div className="charts-column">{backup?<>
 <section className="card chart-card" aria-label="월별 소비량"><div className="chart-header"><div><div className="chart-title"><span className="icon-box"><BarChart3 size={18}/></span><h2>월별 소비량</h2></div><p className="chart-description">{monthly[0].label} – {monthly.at(-1)?.label} · 최근 {period}개월</p></div><div className="segmented" aria-label="월별 표시 기간">{[12,6,3].map(n=><button key={n} aria-pressed={period===n} className={period===n?'active':''} onClick={()=>setPeriod(n)}>{n}개월</button>)}</div></div><div className="chart-total" data-testid="monthly-total">{won(total(monthly))}<span>선택 기간 지출</span></div><SpendingChart points={monthly} selectedMonth={month} onSelect={setMonth}/></section>
 <section className="card chart-card" aria-label="일별 소비량"><div className="chart-header"><div><div className="chart-title"><span className="icon-box violet"><CalendarDays size={18}/></span><h2>일별 소비량</h2></div></div><label className="month-select"><CalendarDays size={14}/><select aria-label="일별 조회 월" value={month} onChange={e=>setMonth(e.target.value)}>{[...new Set([month,...months])].sort().reverse().map(m=><option key={m} value={m}>{m.split('-')[0]}년 {Number(m.split('-')[1])}월</option>)}</select></label></div><div className="chart-total" data-testid="daily-total">{won(total(daily))}<span>{month.replace('-','년 ')}월 지출</span></div><SpendingChart points={daily} daily/></section>
 </>:<section className="card empty-state"><p>JSON 파일을 선택하면 분석 결과가 표시됩니다.</p></section>}</div>
 <aside><div className="filter-toolbar"><span>필터 설정</span><button disabled={!backup||(!categories.length&&!tags.length)} onClick={()=>{setCategories([]);setTags([]);}}><RotateCcw size={12}/>초기화</button></div><FilterPanel kind="category" options={backup?.categories??[]} selected={categories} onChange={setCategories} disabled={!backup}/><FilterPanel kind="tag" options={backup?.tags??[]} selected={tags} onChange={setTags} disabled={!backup}/><div className="filter-info">{backup&&<p className="active-filters">카테고리: {categories.join(', ')||'전체'}<br/>태그: {tags.join(', ')||'전체'}</p>}</div></aside></div>
 </main></div>;
}
