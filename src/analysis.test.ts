import { describe, expect, it } from 'vitest';
import { aggregateCategoryShares, groupCategoryLegend, toggleAnalysisMonth } from './analysis';
import type { Transaction } from './data';

const row = (id: number, category: string, amount: number): Transaction => ({ id, category, amount, part: 'E', memo: '', tags: [], dateKey: '2026-10-01' });

describe('카테고리 비중 분석', () => {
  const input = [row(1, '식비/편의점', 300), row(2, '식비/카페', 100), row(3, '식비', 100), row(4, '여가/PC방', 500)];
  it('상위 기준은 상위 자체와 모든 하위 거래를 한 번씩 합산한다', () => {
    expect(aggregateCategoryShares(input, 'parent')).toEqual([
      { category: '식비', amount: 500, percentage: 50 }, { category: '여가', amount: 500, percentage: 50 },
    ]);
  });
  it('하위 기준은 원래 전체 경로와 상위 자체 거래를 별개로 표시한다', () => {
    const before = JSON.stringify(input);
    const shares = aggregateCategoryShares(input, 'full');
    expect(shares.map(item => [item.category, item.amount])).toEqual([['여가/PC방', 500], ['식비/편의점', 300], ['식비', 100], ['식비/카페', 100]]);
    expect(shares.reduce((sum, item) => sum + item.percentage!, 0)).toBeCloseTo(100);
    expect(JSON.stringify(input)).toBe(before);
  });
  it('5%를 포함하고 그보다 작은 항목은 전체 합계를 기준으로 그 외로 합친다', () => {
    const rows = aggregateCategoryShares([row(1, 'A', 90), row(2, 'B', 5), row(3, 'C', 4.9), row(4, 'D', .1)], 'full');
    const legend = groupCategoryLegend(rows);
    expect(legend.map(item => [item.category, item.amount, item.isOther])).toEqual([['A', 90, false], ['B', 5, false], ['그 외', 5, true]]);
    expect(legend.map(item => item.percentage)).toEqual([90, 5, 5]);
  });
  it('5% 이상이어도 상위 10개까지만 표시하며 나머지 비중을 재계산하지 않는다', () => {
    const rows = aggregateCategoryShares(Array.from({ length: 20 }, (_, index) => row(index, `분류${String(index + 1).padStart(2, '0')}`, 5)), 'full');
    const before = JSON.stringify(rows), legend = groupCategoryLegend(rows);
    expect(legend).toHaveLength(11);
    expect(legend.slice(0, 10).every(item => !item.isOther && item.percentage === 5)).toBe(true);
    expect(legend.at(-1)).toEqual({ category: '그 외', amount: 50, percentage: 50, isOther: true });
    expect(JSON.stringify(rows)).toBe(before);
  });
  it('모든 항목이 5% 미만이면 그 외 100%만 표시하고 범례 합계를 보존한다', () => {
    const rows = aggregateCategoryShares(Array.from({ length: 25 }, (_, index) => row(index, `분류${index}`, 4)), 'parent');
    expect(groupCategoryLegend(rows)).toEqual([{ category: '그 외', amount: 100, percentage: 100, isOther: true }]);
  });
  it('부모 이름 경계와 빈 카테고리를 처리하고 환불을 금액에 반영한다', () => {
    const rows = aggregateCategoryShares([row(1, '식비/카페', 500), row(2, '식비/카페', -100), row(3, '식비2', 100), row(4, '', 0)], 'parent');
    expect(rows).toEqual([{ category: '식비', amount: 400, percentage: 80 }, { category: '식비2', amount: 100, percentage: 20 }, { category: '미분류', amount: 0, percentage: 0 }]);
  });
  it('빈 결과와 0 이하 합계에서 잘못된 백분율을 만들지 않는다', () => {
    expect(groupCategoryLegend(aggregateCategoryShares([], 'full'))).toEqual([]);
    expect(aggregateCategoryShares([row(1, '식비', 0)], 'parent')[0].percentage).toBeNull();
    expect(aggregateCategoryShares([row(1, '식비', -10)], 'parent')[0].percentage).toBeNull();
  });
});

describe('분석 월 선택', () => {
  it('비연속 월을 연도 경계와 관계없이 선택하며 원본을 바꾸지 않는다', () => {
    const months = ['2026-10'];
    expect(toggleAnalysisMonth(months, '2025-12')).toEqual(['2025-12', '2026-10']);
    expect(months).toEqual(['2026-10']);
    expect(toggleAnalysisMonth(['2025-12', '2026-10'], '2025-12')).toEqual(['2026-10']);
  });
  it('최소 1개월·최대 12개월을 유지하고 중복 월은 추가하지 않는다', () => {
    expect(toggleAnalysisMonth(['2026-10'], '2026-10')).toEqual(['2026-10']);
    const months = Array.from({ length: 12 }, (_, index) => `2026-${String(index + 1).padStart(2, '0')}`);
    expect(toggleAnalysisMonth(months, '2025-12')).toEqual(months);
    expect(toggleAnalysisMonth(months, '2026-12')).toHaveLength(11);
  });
});
