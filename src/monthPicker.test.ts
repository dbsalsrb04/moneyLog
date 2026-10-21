import { describe, expect, it } from 'vitest';
import { canZoomOut, getYearChoices, pageView, stepMonth, viewEndYear, zoomOut, type PickerView } from './monthPicker';

describe('월 이동과 연도 선택 범위', () => {
  it.each([
    ['2026-12', 1, '2027-01'], ['2027-01', -1, '2026-12'],
    ['2024-02', 1, '2024-03'], ['2024-03', -1, '2024-02'],
    ['0001-01', -1, '0001-01'], ['9999-12', 1, '9999-12'],
  ] as const)('%s에서 %i개월 이동하면 %s', (month, direction, result) => {
    expect(stepMonth(month, direction)).toBe(result);
  });

  it('2027년은 2021~2032년의 12개 연도로 확대한다', () => {
    const view = zoomOut({ level: 0, start: 2027 });
    expect(view).toEqual({ level: 1, start: 2021 });
    expect(getYearChoices(view).map(choice => choice.start)).toEqual([2021,2022,2023,2024,2025,2026,2027,2028,2029,2030,2031,2032]);
    expect(getYearChoices(view).every(choice => choice.start === choice.end)).toBe(true);
  });

  it('상위 단계마다 12개 구간을 보여 주고 각 구간의 폭을 12배 넓힌다', () => {
    let view = zoomOut({ level: 0, start: 2027 });
    for (const span of [12, 144, 1728]) {
      view = zoomOut(view);
      const choices = getYearChoices(view).filter(choice => !choice.disabled);
      expect(getYearChoices(view)).toHaveLength(12);
      expect(choices[0].end - choices[0].start + 1).toBe(span);
      expect(choices.some(choice => choice.start <= 2027 && choice.end >= 2027)).toBe(true);
      expect(choices.every(choice => choice.start >= 1 && choice.end <= 9999)).toBe(true);
    }
    expect(view.start).toBe(1);
    expect(viewEndYear(view)).toBe(9999);
    expect(canZoomOut(view)).toBe(false);
    expect(zoomOut(view)).toEqual(view);
  });

  it('선택한 상위 구간은 하위 그리드의 12개 구간에 정확히 대응한다', () => {
    const parent = zoomOut(zoomOut(zoomOut({ level: 0, start: 2027 })));
    const selected = getYearChoices(parent).find(choice => choice.start <= 2027 && choice.end >= 2027)!;
    const children = getYearChoices({ level: parent.level - 1, start: selected.start });
    expect(children[0].start).toBe(selected.start);
    expect(children.at(-1)!.end).toBe(selected.end);
    expect(children.every((choice, index) => index === 0 || choice.start === children[index - 1].end + 1)).toBe(true);
  });

  it('앞뒤 탐색은 한 연도 또는 현재 그리드 전체 구간씩 이동하고 경계를 넘지 않는다', () => {
    expect(pageView({ level: 0, start: 2027 }, 1)).toEqual({ level: 0, start: 2028 });
    expect(pageView({ level: 1, start: 2021 }, -1)).toEqual({ level: 1, start: 2009 });
    expect(pageView({ level: 2, start: 1955 }, 1)).toEqual({ level: 2, start: 2099 });
    for (const level of [0, 1, 2, 3, 4]) {
      const lower = pageView({ level, start: 1 }, -1);
      const upper = pageView({ level, start: 9999 }, 1);
      expect(lower.start).toBe(1);
      expect(viewEndYear(upper)).toBe(9999);
      expect(getYearChoices(upper).filter(choice => !choice.disabled).every(choice => choice.start <= choice.end)).toBe(true);
    }
  });
});
