import { describe, expect, it } from 'vitest';
import { layoutPieLabels } from './pieLabels';

const measure = (text: string) => [...text].length * 11;
const shares = (names: string[], amounts: number[]) => {
  const total = amounts.reduce((sum, amount) => sum + amount, 0);
  return names.map((category, index) => ({ category, amount: amounts[index], percentage: amounts[index] / total * 100 }));
};

describe('파이 카테고리 라벨 배치', () => {
  it('충분히 넓은 조각 안에는 이름과 비중을 함께 넣는다', () => {
    const layout = layoutPieLabels(shares(['식비', '여가'], [50, 50]), 500, 300, measure);
    expect(layout.labels.map(label => label.lines)).toEqual([['식비'], ['여가']]);
    expect(layout.labels.map(label => label.percentage.text)).toEqual(['50%', '50%']);
    expect(layout.labels.every(label => label.inside && label.connector.length === 0)).toBe(true);
    const single = layoutPieLabels(shares(['식비'], [100]), 300, 260, measure);
    expect(single.labels[0]).toMatchObject({ x: single.cx, inside: true });
    expect(single.labels[0].percentage.x).toBe(single.cx);
    expect((single.labels[0].y + single.labels[0].percentage.y) / 2).toBe(single.cy);
  });

  it('좁은 조각과 긴 이름만 외부로 옮기고 백분율은 원 안에 유지한다', () => {
    const rows = shares(['식비', '의료비/병원에서 사용한 금액', '그 외'], [90, 5, 5]);
    const layout = layoutPieLabels(rows, 300, 260, measure);
    expect(layout.labels).toHaveLength(3);
    const small = layout.labels[1];
    expect(small.inside).toBe(false);
    expect(small.lines.join('')).toBe(rows[1].category);
    expect(small.percentage.text).toBe('5%');
    expect(Math.hypot(small.percentage.x - layout.cx, small.percentage.y - layout.cy)).toBeLessThan(layout.radius);
    expect(Math.hypot(small.connector[0].x - layout.cx, small.connector[0].y - layout.cy)).toBeCloseTo(layout.radius);
    expect(small.connector.at(-1)?.y).toBe(small.y);
  });

  it('밀집한 외부 라벨의 전체 이름을 보존하고 겹침과 화면 잘림을 피한다', () => {
    const rows = shares(Array.from({ length: 11 }, (_, index) => `긴 상위 분류/하위 항목${index}`), Array(11).fill(1));
    for (const width of [240, 320, 500]) {
      const layout = layoutPieLabels(rows, width, 260, measure);
      for (const label of layout.labels) {
        expect(label.lines.join('')).toBe(label.category);
        expect(Math.hypot(label.percentage.x - layout.cx, label.percentage.y - layout.cy)).toBeLessThan(layout.radius);
        expect(label.y - label.height / 2).toBeGreaterThanOrEqual(0);
        expect(label.y + label.height / 2).toBeLessThanOrEqual(layout.height);
        const left = label.anchor === 'end' ? label.x - label.width : label.x;
        expect(left).toBeGreaterThanOrEqual(0);
        expect(left + label.width).toBeLessThanOrEqual(width);
      }
      for (const anchor of ['start', 'end']) {
        const side = layout.labels.filter(label => !label.inside && label.anchor === anchor).sort((a, b) => a.y - b.y);
        side.slice(1).forEach((label, index) => expect(label.y - label.height / 2).toBeGreaterThan(side[index].y + side[index].height / 2));
      }
    }
  });

  it('비어 있거나 아직 측정되지 않은 차트에는 라벨을 만들지 않는다', () => {
    expect(layoutPieLabels([], 300, 260, measure).labels).toEqual([]);
    expect(layoutPieLabels(shares(['식비'], [100]), 0, 0, measure).labels).toEqual([]);
  });
});
