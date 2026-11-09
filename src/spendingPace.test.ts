import { describe, expect, it } from 'vitest';
import type { Transaction } from './data';
import { buildSpendingPace } from './spendingPace';

function transaction(dateKey: string, amount: number, part: Transaction['part'] = 'E'): Transaction {
  return { id: `${dateKey}-${amount}-${part}`, dateKey, amount, part, category: '식비', memo: '', tags: [] };
}

describe('지난달과 선택한 달의 누적 지출', () => {
  it('현재 달은 오늘까지의 지출만 누적하고 지난달 같은 날짜와 비교한다', () => {
    const comparison = buildSpendingPace([
      transaction('2025-12-02', 800),
      transaction('2025-12-09', 5000),
      transaction('2026-01-03', 1000),
      transaction('2026-01-03', 600),
      transaction('2026-01-04', 500, 'R'),
      transaction('2026-01-08', 3000),
    ], '2026-01', '2026-01-07');

    expect(comparison.previousMonth).toBe('2025-12');
    expect(comparison.throughDay).toBe(7);
    expect(comparison.difference).toBe(800);
    expect(comparison.points).toHaveLength(31);
    expect(comparison.points[0]).toEqual({ day: 1, current: 0, previous: 0 });
    expect(comparison.points[6]).toEqual({ day: 7, current: 1600, previous: 800 });
    expect(comparison.points[7]).toEqual({ day: 8, current: null, previous: 800 });
    expect(comparison.points[8]).toEqual({ day: 9, current: null, previous: 5800 });
  });

  it('과거 달은 끝까지 표시하고 더 짧은 지난달의 최종 합계와 비교한다', () => {
    const comparison = buildSpendingPace([
      transaction('2024-02-29', 1500),
      transaction('2024-03-31', 2000),
    ], '2024-03', '2024-04-02');

    expect(comparison.throughDay).toBe(31);
    expect(comparison.difference).toBe(500);
    expect(comparison.points[28]).toEqual({ day: 29, current: 0, previous: 1500 });
    expect(comparison.points[29]).toEqual({ day: 30, current: 0, previous: null });
    expect(comparison.points[30]).toEqual({ day: 31, current: 2000, previous: null });
  });

  it('미래 달의 날짜축을 유지하고 미래 지출과 차액은 표시하지 않는다', () => {
    const comparison = buildSpendingPace([
      transaction('2026-01-30', 1000),
      transaction('2026-02-01', 3000),
    ], '2026-02', '2026-01-31');

    expect(comparison.throughDay).toBe(0);
    expect(comparison.difference).toBeNull();
    expect(comparison.points).toHaveLength(28);
    expect(comparison.points.every(point => point.current === null)).toBe(true);
    expect(comparison.points[27]).toEqual({ day: 28, current: null, previous: 0 });
  });
});
