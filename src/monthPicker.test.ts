import { describe, expect, it } from 'vitest';
import { getYearChoices, pageView, stepMonth, viewEndYear, yearView } from './monthPicker';

describe('월 이동과 연도 선택 범위', () => {
  it.each([
    ['2026-12', 1, '2027-01'], ['2027-01', -1, '2026-12'],
    ['2024-02', 1, '2024-03'], ['2024-03', -1, '2024-02'],
    ['0001-01', -1, '0001-01'], ['9999-12', 1, '9999-12'],
  ] as const)('%s에서 %i개월 이동하면 %s', (month, direction, result) => {
    expect(stepMonth(month, direction)).toBe(result);
  });

  it('2027년은 2021~2032년의 12개 연도를 표시한다', () => {
    const view = yearView(2027);
    expect(view).toEqual({ level: 1, start: 2021 });
    expect(getYearChoices(view)).toEqual([2021,2022,2023,2024,2025,2026,2027,2028,2029,2030,2031,2032]);
  });

  it('지원하는 양 끝 연도에서도 12개 연도만 경계 안에서 표시한다', () => {
    expect(getYearChoices(yearView(1))).toEqual(Array.from({ length: 12 }, (_, index) => index + 1));
    expect(getYearChoices(yearView(9999))).toEqual(Array.from({ length: 12 }, (_, index) => index + 9988));
  });

  it('앞뒤 탐색은 한 연도 또는 현재 그리드 전체 구간씩 이동하고 경계를 넘지 않는다', () => {
    expect(pageView({ level: 0, start: 2027 }, 1)).toEqual({ level: 0, start: 2028 });
    expect(pageView({ level: 1, start: 2021 }, -1)).toEqual({ level: 1, start: 2009 });
    expect(pageView({ level: 1, start: 2021 }, 1)).toEqual({ level: 1, start: 2033 });
    for (const level of [0, 1] as const) {
      const lower = pageView({ level, start: 1 }, -1);
      const upper = pageView({ level, start: 9999 }, 1);
      expect(lower.start).toBe(1);
      expect(viewEndYear(upper)).toBe(9999);
      if (level === 1) expect(getYearChoices(upper)).toHaveLength(12);
    }
  });
});
