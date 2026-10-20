import { useMemo, useRef, useState } from 'react';
import { BarChart3, CalendarDays, RotateCcw } from 'lucide-react';
import {
  aggregateDaily, aggregateMonthly, filterTransactions, getFilterOptions,
  monthRange, parseBackup, TRANSACTION_PARTS, won, type Backup, type TransactionPart,
} from './data';
import FileUpload from './components/FileUpload';
import FilterPanel from './components/FilterPanel';
import SpendingChart from './components/SpendingChart';

export default function App() {
  const [backup, setBackup] = useState<Backup | null>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [part, setPart] = useState<TransactionPart>('E');
  const [period, setPeriod] = useState(12);
  const [month, setMonth] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [datasetVersion, setDatasetVersion] = useState(0);
  const uploadVersion = useRef(0);
  const partLabel = TRANSACTION_PARTS.find(item => item.value === part)!.label;

  const options = useMemo(() => getFilterOptions(backup?.transactions ?? [], part), [backup, part]);
  const filtered = useMemo(() => filterTransactions(backup?.transactions ?? [], part, categories, tags), [backup, part, categories, tags]);
  const monthly = useMemo(() => backup ? aggregateMonthly(filtered, backup.latestMonth, period) : [], [backup, filtered, period]);
  const daily = useMemo(() => month ? aggregateDaily(filtered, month) : [], [filtered, month]);
  const months = useMemo(() => backup ? monthRange(backup.firstMonth < monthly[0].key ? backup.firstMonth : monthly[0].key, backup.latestMonth).reverse() : [], [backup, monthly]);
  const total = (points: typeof daily) => points.reduce((sum, point) => sum + point.amount, 0);

  function resetFilters() {
    setCategories([]);
    setTags([]);
  }

  function selectPart(next: TransactionPart) {
    if (next === part) return;
    setPart(next);
    resetFilters();
  }

  async function upload(files: File[]) {
    if (!files.length) return;
    const version = ++uploadVersion.current;
    setLoading(true);
    setError('');
    try {
      if (files.length !== 1) throw new Error('JSON 백업 파일을 한 번에 하나만 선택해 주세요.');
      const file = files[0];
      if (!/\.json$/i.test(file.name)) throw new Error('확장자가 .json인 백업 파일을 선택해 주세요.');
      const data = parseBackup(await file.text());
      if (version !== uploadVersion.current) return;
      setBackup(data);
      setFileName(file.name);
      setDatasetVersion(version);
      setPart('E');
      resetFilters();
      setPeriod(12);
      setMonth(data.latestMonth);
    } catch (e) {
      if (version === uploadVersion.current) setError(e instanceof Error ? e.message : '파일을 읽지 못했습니다. 다시 선택해 주세요.');
    } finally {
      if (version === uploadVersion.current) setLoading(false);
    }
  }

  return <div className="app-shell">
    <header className="site-header">
      <a className="brand" href="./"><span className="brand-mark"><BarChart3 size={22} /></span>money<span>Log</span><span className="brand-dot" /></a>
    </header>
    <main>
      <FileUpload
        fileName={fileName}
        loading={loading}
        onFiles={upload}
        summary={backup ? `${backup.transactions.length.toLocaleString('ko-KR')}개 거래 · ${backup.firstMonth.replace('-', '.')} – ${backup.latestMonth.replace('-', '.')}` : undefined}
      />
      {error && <div className="error" role="alert">{error}{backup && ' 기존 분석 데이터는 유지됩니다.'}</div>}
      <div className="section-heading">
        <h2>거래 대시보드</h2>
        <div className="part-selector" role="group" aria-label="거래 유형">
          {TRANSACTION_PARTS.map(item => <button
            key={item.value}
            aria-pressed={part === item.value}
            className={part === item.value ? 'active' : ''}
            onClick={() => selectPart(item.value)}
          >{item.label}</button>)}
        </div>
      </div>
      <div className="dashboard">
        <div className="charts-column">{backup ? <>
          <section className="card chart-card" aria-label={`월별 ${partLabel}`}>
            <div className="chart-header">
              <div>
                <div className="chart-title"><span className="icon-box"><BarChart3 size={18} /></span><h2>월별 {partLabel}</h2></div>
                <p className="chart-description">{monthly[0].label} – {monthly.at(-1)?.label} · 최근 {period}개월</p>
              </div>
              <div className="segmented" aria-label="월별 표시 기간">{[12, 6, 3].map(n => <button key={n} aria-pressed={period === n} className={period === n ? 'active' : ''} onClick={() => setPeriod(n)}>{n}개월</button>)}</div>
            </div>
            <div className="chart-total" data-testid="monthly-total">{won(total(monthly))}<span>선택 기간 {partLabel}</span></div>
            <SpendingChart points={monthly} partLabel={partLabel} selectedMonth={month} onSelect={setMonth} />
          </section>
          <section className="card chart-card" aria-label={`일별 ${partLabel}`}>
            <div className="chart-header">
              <div className="chart-title"><span className="icon-box violet"><CalendarDays size={18} /></span><h2>일별 {partLabel}</h2></div>
              <label className="month-select"><CalendarDays size={14} /><select aria-label="일별 조회 월" value={month} onChange={e => setMonth(e.target.value)}>
                {[...new Set([month, ...months])].sort().reverse().map(m => <option key={m} value={m}>{m.split('-')[0]}년 {Number(m.split('-')[1])}월</option>)}
              </select></label>
            </div>
            <div className="chart-total" data-testid="daily-total">{won(total(daily))}<span>{month.replace('-', '년 ')}월 {partLabel}</span></div>
            <SpendingChart points={daily} partLabel={partLabel} daily />
          </section>
        </> : <section className="card empty-state"><p>JSON 파일을 선택하면 분석 결과가 표시됩니다.</p></section>}</div>
        <aside>
          <div className="filter-toolbar"><span>필터 설정</span><button disabled={!backup || (!categories.length && !tags.length)} onClick={resetFilters}><RotateCcw size={12} />초기화</button></div>
          <FilterPanel key={`category-${part}-${datasetVersion}`} kind="category" options={options.categories} selected={categories} onChange={setCategories} disabled={!backup} />
          <FilterPanel kind="tag" options={options.tags} selected={tags} onChange={setTags} disabled={!backup} />
          <div className="filter-info">{backup && <p className="active-filters">카테고리: {categories.join(', ') || '전체'}<br />태그: {tags.join(', ') || '전체'}</p>}</div>
        </aside>
      </div>
    </main>
  </div>;
}
