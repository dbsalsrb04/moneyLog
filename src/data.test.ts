import { describe,it,expect } from 'vitest';
import { parseBackup,filterTransactions,getFilterOptions,aggregateMonthly,aggregateDaily,getDailyDetails,getMonthlyCalendar,getMonthStartWeekday,toggleSelection,validDate, type Transaction } from './data';
const t=(id:number,part:Transaction['part'],category:string,tags:string[],amount:number,dateKey='2026-08-01')=>({id,part,category,tags,amount,dateKey,memo:'',dateAt:0});
const rows=[t(1,'E','식비/편의점',['간식','식비'],7200),t(2,'E','식비',['PC방에서','식비'],13200),t(3,'E','교통비/지쿠',['교통비'],978),t(4,'R','수입/월급',[],100000,'2026-10-20'),t(5,'D','저축',[],50000),t(6,'O','식비/배달',['식비'],1)];
const parse=(moneyTrackTable:unknown=rows)=>parseBackup(JSON.stringify({moneyTrackTable,categoryInfoTable:[{categoryName:'식비/외식',id:8,order:65},{categoryName:'■식비'}],tagInfoTable:[{tagName:'여행',id:24,order:13}]}));
describe('백업 파싱과 보존',()=>{
 it('현재 유형에서 사용된 항목과 상위 경로만 표시하며 미사용 metadata는 보존한다',()=>{
  const b=parse(), options=getFilterOptions(b.transactions,'E');
  expect(options.categories).toEqual(['교통비','교통비/지쿠','식비','식비/편의점']);
  expect(new Set(options.tags)).toEqual(new Set(['간식','식비','PC방에서','교통비']));
  expect(b.raw.categoryInfoTable).toEqual([{categoryName:'식비/외식',id:8,order:65},{categoryName:'■식비'}]);
  expect(b.raw.tagInfoTable).toEqual([{tagName:'여행',id:24,order:13}]);
 });
 it('유형별 사용 항목은 전체 기간에서 추출하고 다른 유형 전용 태그를 제외한다',()=>{
  const history=[...rows,t(7,'R','수입/이자',['수입전용'],99,'2024-01-01'),t(8,'E','과거/분류',['옛태그'],100,'2020-01-01')];
  expect(getFilterOptions(history,'E').tags).toContain('옛태그');
  expect(getFilterOptions(history,'E').tags).not.toContain('수입전용');
  expect(getFilterOptions(history,'R')).toEqual({categories:['수입','수입/월급','수입/이자'],tags:['수입전용']});
  expect(getFilterOptions(history,'D')).toEqual({categories:['저축'],tags:[]});
  expect(getFilterOptions([], 'O')).toEqual({categories:[],tags:[]});
 });
 it.each([['E',[1,2,3]],['R',[4]],['D',[5]],['O',[6]]] as const)('%s 유형만 집계한다',(part,ids)=>{
  const filtered=filterTransactions(rows,part);expect(filtered.map(t=>t.id)).toEqual([...ids]);
  const monthly=aggregateMonthly(filtered,'2026-10',12);const expected=filtered.reduce((sum,t)=>sum+t.amount,0);
  expect(monthly.reduce((sum,p)=>sum+p.amount,0)).toBe(expected);
 });
 it('E 이외 거래와 추가 필드, 원본 테이블을 보존하고 최신 거래로 기준 월을 정한다',()=>{const b=parse();expect(b.latestMonth).toBe('2026-10');expect(b.transactions).toHaveLength(6);expect(b.raw.moneyTrackTable).toEqual(rows);expect(b.transactions[0].dateAt).toBe(0);});
 it.each(['{','{}','{"moneyTrackTable":[]}',JSON.stringify({moneyTrackTable:[{...rows[0],dateKey:'2026-02-30'}]}),JSON.stringify({moneyTrackTable:[{...rows[0],amount:'7200'}]}),JSON.stringify({moneyTrackTable:[{...rows[0],tags:null}]})])('잘못된 입력을 거부한다: %s',text=>expect(()=>parseBackup(text)).toThrow());
 it('BOM과 윤년을 처리한다',()=>{expect(parseBackup('\uFEFF'+JSON.stringify({moneyTrackTable:rows})).transactions).toHaveLength(6);expect(validDate('2024-02-29')).toBe(true);expect(validDate('2026-02-29')).toBe(false);});
});
describe('공유 소비 필터',()=>{
 it('E만 포함한다',()=>expect(filterTransactions(rows,'E',[],[]).map(t=>t.id)).toEqual([1,2,3]));
 it('카테고리 OR 및 상위·하위 경계를 적용한다',()=>{expect(filterTransactions(rows,'E',['식비','교통비'],[])).toHaveLength(3);expect(filterTransactions(rows,'E',['식비/편의점'],[]).map(t=>t.id)).toEqual([1]);expect(filterTransactions(rows,'E',['식'],[])).toEqual([]);});
 it('태그 OR, 그룹 AND를 적용하고 중복 합산하지 않는다',()=>{const found=filterTransactions(rows,'E',['식비'],['간식','식비']);expect(found.map(t=>t.id)).toEqual([1,2]);expect(found.reduce((s,t)=>s+t.amount,0)).toBe(20400);expect(filterTransactions(rows,'E',['교통비'],['간식'])).toEqual([]);});
 it('선택 해제 후 빈 배열이 전체 상태가 된다',()=>{expect(toggleSelection(['식비'],'식비')).toEqual([]);expect(toggleSelection(['식비'],'교통비')).toEqual(['식비','교통비']);});
 it('필터와 집계는 원본을 변경하지 않는다',()=>{const frozen=JSON.stringify(rows);aggregateMonthly(filterTransactions(rows,'E',['식비'],[]),'2026-10',12);expect(JSON.stringify(rows)).toBe(frozen);});
});
describe('빈 구간을 포함한 날짜 집계',()=>{
 it.each([12,6,3])('%i개월을 정확한 순서로 0원 포함 집계한다',n=>{const points=aggregateMonthly(filterTransactions(rows,'E',[],[]),'2026-10',n);expect(points).toHaveLength(n);expect(points.at(-1)).toEqual({key:'2026-10',label:'2026.10',amount:0});expect(points.find(p=>p.key==='2026-08')?.amount).toBe(21378);});
 it('연도를 넘어가고 31일·윤년·평년의 빈 날도 채운다',()=>{expect(aggregateMonthly([],'2026-01',3)[0].key).toBe('2025-11');expect(aggregateDaily([],'2024-02')).toHaveLength(29);expect(aggregateDaily([],'2026-02')).toHaveLength(28);const d=aggregateDaily(filterTransactions(rows,'E',[],[]),'2026-08');expect(d).toHaveLength(31);expect(d[0].amount).toBe(21378);expect(d[1].amount).toBe(0);});
 it('dateAt 대신 dateKey를 사용한다',()=>expect(aggregateDaily(filterTransactions(rows,'E',[],[]),'2026-08')[0].amount).toBe(21378));
});

describe('세부 내역의 날짜 페이지',()=>{
 it('필터 결과를 날짜별로 나누고 빈 날짜와 파일 순서를 유지한다',()=>{
  const input=[...rows,t(7,'E','식비/카페',['간식'],5000),t(8,'E','식비',['간식'],100,'2026-07-31')];
  const before=JSON.stringify(input),filtered=filterTransactions(input,'E',['식비'],['간식']);
  const pages=getDailyDetails(filtered,'2026-08');
  expect(pages).toHaveLength(31);
  expect(pages[0].dateKey).toBe('2026-08-01');
  expect(pages[0].transactions.map(t=>t.id)).toEqual([1,7]);
  expect(pages[1].transactions).toEqual([]);
  expect(pages.at(-1)?.dateKey).toBe('2026-08-31');
  expect(JSON.stringify(input)).toBe(before);
  expect(pages.map(p=>p.transactions.reduce((sum,t)=>sum+t.amount,0))).toEqual(aggregateDaily(filtered,'2026-08').map(p=>p.amount));
 });
 it('윤년과 평년의 월말을 포함하고 다른 월 거래는 제외한다',()=>{
  expect(getDailyDetails(rows,'2024-02')).toHaveLength(29);
  const pages=getDailyDetails(rows,'2026-02');
  expect(pages).toHaveLength(28);expect(pages.at(-1)?.dateKey).toBe('2026-02-28');
  expect(pages.every(p=>p.transactions.length===0)).toBe(true);
 });
});

describe('유형별 일별 캘린더 집계',()=>{
 it('네 유형의 합계를 분리하고 빈 날짜와 다른 월을 처리한다',()=>{
  const before=JSON.stringify(rows),days=getMonthlyCalendar(rows,'2026-08');
  expect(days).toHaveLength(31);
  expect(days[0]).toEqual({dateKey:'2026-08-01',totals:{R:0,E:21378,D:50000,O:1}});
  expect(days[1].totals).toEqual({R:0,E:0,D:0,O:0});
  expect(getMonthlyCalendar(rows,'2026-10')[19].totals.R).toBe(100000);
  expect(JSON.stringify(rows)).toBe(before);
 });
 it('유형 제한 없이 같은 OR/AND 필터를 적용하고 한 거래는 한 번만 합산한다',()=>{
  const matching=filterTransactions(rows,null,['식비'],['식비','간식']);
  expect(matching.map(t=>t.id)).toEqual([1,2,6]);
  expect(getMonthlyCalendar(matching,'2026-08')[0].totals).toEqual({R:0,E:20400,D:0,O:1});
  expect(getMonthlyCalendar(filterTransactions(rows,null,['교통비'],['간식']),'2026-08').every(day=>Object.values(day.totals).every(amount=>amount===0))).toBe(true);
 });
 it('윤년과 주 시작 위치를 시간대 변환 없이 처리한다',()=>{
  expect(getMonthlyCalendar([],'2024-02')).toHaveLength(29);
  expect(getMonthlyCalendar([],'2026-02')).toHaveLength(28);
  expect(getMonthStartWeekday('2026-08')).toBe(6);
  expect(getMonthStartWeekday('2024-02')).toBe(4);
  expect(getMonthStartWeekday('2026-02')).toBe(0);
  expect(getMonthStartWeekday('0001-01')).toBe(1);
 });
});
