import { describe, expect, it } from 'vitest';
import { getFilterOptions, type Transaction } from './data';
import { formatSearchDate, getSearchTotals, searchTransactions } from './search';

const rows: Transaction[] = [
  { id: 1, part: 'E', category: '식비/편의점', amount: 1000, memo: '라면', tags: ['식비', '간식'], dateKey: '2026-07-07' },
  { id: 2, part: 'R', category: '수입/환급', amount: 500, memo: '라면 환급', tags: ['식비', '환급'], dateKey: '2026-08-01' },
  { id: 3, part: 'D', category: '저축/적금', amount: 3000, memo: '라면 저축', tags: ['식비'], dateKey: '2026-08-02' },
  { id: 4, part: 'O', category: '식비', amount: 10, memo: '라면 기록', tags: [], dateKey: '2026-08-02' },
  { id: 5, part: 'E', category: '라면', amount: 999, memo: '택시', tags: ['라면'], dateKey: '2026-08-03' },
  { id: 6, part: 'E', category: '식비/배달', amount: 2000, memo: 'RAMEN\nDinner', tags: ['식비'], dateKey: '2026-08-03' },
];

describe('메모 검색', () => {
  it('메모의 부분 문자열만 검색하고 네 유형을 최신 날짜순으로 반환한다', () => {
    expect(searchTransactions(rows, '라면').map(row => row.id)).toEqual([3, 4, 2, 1]);
    expect(getSearchTotals(searchTransactions(rows, '라면'))).toEqual({ R: 500, E: 1000, D: 3000, O: 10 });
  });

  it('앞뒤 공백, 영문 대소문자, 한글 유니코드 정규화를 처리한다', () => {
    expect(searchTransactions(rows, ' ramen ').map(row => row.id)).toEqual([6]);
    expect(searchTransactions(rows, '라면'.normalize('NFD'))).toEqual(searchTransactions(rows, '라면'));
    expect(searchTransactions(rows, 'dinner')).toHaveLength(1);
  });

  it('빈 검색어는 전체 거래이며 일치하지 않으면 네 합계 모두 0이다', () => {
    expect(searchTransactions(rows, '  ')).toHaveLength(rows.length);
    expect(getSearchTotals(searchTransactions(rows, '없는 검색어'))).toEqual({ R: 0, E: 0, D: 0, O: 0 });
  });

  it('상위 카테고리·그룹 내 OR·그룹 간 AND를 적용하고 중복 집계나 원본 변경이 없다', () => {
    const before = JSON.stringify(rows);
    const found = searchTransactions(rows, '라면', ['식비', '식비/편의점', '수입'], ['간식', '식비']);
    expect(found.map(row => row.id)).toEqual([2, 1]);
    expect(getSearchTotals(found)).toEqual({ R: 500, E: 1000, D: 0, O: 0 });
    expect(searchTransactions(rows, '라면', ['식'], [])).toEqual([]);
    expect(JSON.stringify(rows)).toBe(before);
  });

  it('검색 필터 항목은 모든 유형의 실제 기록에서만 추출한다', () => {
    const options = getFilterOptions(rows, null);
    expect(options.categories).toEqual(['라면', '수입', '수입/환급', '식비', '식비/배달', '식비/편의점', '저축', '저축/적금']);
    expect(options.tags).toEqual(['간식', '라면', '식비', '환급']);
  });

  it.each([
    ['2026-07-07', '2026-07-07(화)'],
    ['2024-02-29', '2024-02-29(목)'],
    ['2026-01-01', '2026-01-01(목)'],
    ['0001-01-01', '0001-01-01(월)'],
  ])('dateKey %s의 날짜와 요일은 시간대 변환 없이 %s로 표시한다', (dateKey, expected) => {
    expect(formatSearchDate(dateKey)).toBe(expected);
  });
});
