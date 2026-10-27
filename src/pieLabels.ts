import { formatPercentage, type CategoryShare } from './analysis';

export const PIE_LABEL_FONT_SIZE = 11;
export const PIE_LABEL_LINE_HEIGHT = 13;
const PADDING = 8;
const GAP = 5;
type Point = { x: number; y: number };
export type PieCategoryLabel = Point & {
  category: string;
  lines: string[];
  width: number;
  height: number;
  inside: boolean;
  anchor: 'start' | 'middle' | 'end';
  connector: Point[];
  percentage: Point & { text: string };
};
type MeasureText = (text: string) => number;
const radians = (angle: number) => -angle * Math.PI / 180;

function wrapName(name: string, width: number, measure: MeasureText): string[] {
  const lines: string[] = [];
  let line = '';
  for (const character of name) {
    if (line && measure(line + character) > width) { lines.push(line); line = ''; }
    line += character;
  }
  if (line) lines.push(line);
  return lines;
}

export function layoutPieLabels(rows: CategoryShare[], width: number, viewportHeight: number, measure: MeasureText) {
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  if (width <= 0 || viewportHeight <= 0 || total <= 0) return { cx: 0, cy: 0, radius: 0, height: viewportHeight, labels: [] as PieCategoryLabel[] };
  let angle = 0;
  const slices = rows.map(row => {
    const start = angle;
    angle += row.amount / total * 360;
    return { ...row, start, end: angle, mid: (start + angle) / 2 };
  });
  const cx = width / 2;
  const baseRadius = Math.min(width, viewportHeight) * .39;
  function insidePosition(slice: typeof slices[number], radius: number): Point | null {
    const textWidth = Math.max(measure(slice.category), measure(formatPercentage(slice.percentage)));
    const halfWidth = textWidth / 2 + 4;
    const halfHeight = PIE_LABEL_LINE_HEIGHT + 4;
    for (const ratio of slice.end - slice.start >= 359.99 ? [0] : [.56, .66, .46, .76]) {
      const x = radius * ratio * Math.cos(radians(slice.mid));
      const y = radius * ratio * Math.sin(radians(slice.mid));
      const fits = [-halfWidth, halfWidth].every(dx => [-halfHeight, halfHeight].every(dy => {
        const px = x + dx, py = y + dy;
        const pointAngle = (Math.atan2(-py, px) * 180 / Math.PI + 360) % 360;
        return Math.hypot(px, py) <= radius - PADDING && (slice.end - slice.start >= 359.99 || pointAngle >= slice.start + 1 && pointAngle <= slice.end - 1);
      }));
      if (fits) return { x, y };
    }
    return null;
  }

  // Reserve side gutters only when the complete name and percentage cannot fit inside.
  const needsOutside = slices.some(slice => !insidePosition(slice, baseRadius));
  const gutter = Math.min(Math.max(44, Math.min(76, width * .2)), Math.max(...rows.map(row => measure(row.category)), measure('100%'), 44));
  const radius = needsOutside ? Math.max(16, Math.min(baseRadius, width / 2 - gutter - 18)) : baseRadius;
  const outsideWidth = Math.max(12, width / 2 - radius - 18);
  const labels = slices.map<PieCategoryLabel>(slice => {
    const position = insidePosition(slice, radius);
    const lines = position ? [slice.category] : wrapName(slice.category, outsideWidth, measure);
    const side = Math.cos(radians(slice.mid)) >= 0 ? 1 : -1;
    const percentageRadius = slice.end - slice.start >= 359.99 ? 0 : radius * .65;
    return {
      category: slice.category, lines, width: Math.max(...lines.map(measure)), height: lines.length * PIE_LABEL_LINE_HEIGHT,
      x: position ? cx + position.x : cx + side * (radius + 12), y: position ? position.y - PIE_LABEL_LINE_HEIGHT / 2 : Math.sin(radians(slice.mid)) * radius,
      inside: Boolean(position), anchor: position ? 'middle' : side > 0 ? 'start' : 'end', connector: [],
      percentage: {
        text: formatPercentage(slice.percentage),
        x: cx + (position ? position.x : Math.cos(radians(slice.mid)) * percentageRadius),
        y: position ? position.y + PIE_LABEL_LINE_HEIGHT / 2 : Math.sin(radians(slice.mid)) * percentageRadius,
      },
    };
  });
  const sides = [-1, 1].map(side => labels.filter(label => !label.inside && (label.x >= cx ? 1 : -1) === side).sort((a, b) => a.y - b.y));
  const height = Math.max(viewportHeight, ...sides.map(side => side.reduce((sum, label) => sum + label.height, PADDING * 2) + Math.max(0, side.length - 1) * GAP));
  const cy = height / 2;
  labels.forEach(label => { label.y += cy; label.percentage.y += cy; });
  for (const side of sides) {
    let bottom = PADDING;
    for (const label of side) {
      label.y = Math.max(label.y, bottom + label.height / 2);
      bottom = label.y + label.height / 2 + GAP;
    }
    let top = height - PADDING;
    for (const label of [...side].reverse()) {
      label.y = Math.min(label.y, top - label.height / 2);
      top = label.y - label.height / 2 - GAP;
    }
  }
  labels.forEach((label, index) => {
    if (label.inside) return;
    const side = label.x >= cx ? 1 : -1;
    const start = { x: cx + Math.cos(radians(slices[index].mid)) * radius, y: cy + Math.sin(radians(slices[index].mid)) * radius };
    const elbowX = cx + side * (radius + 6);
    label.connector = [start, { x: elbowX, y: start.y }, { x: elbowX, y: label.y }, { x: label.x - side * 3, y: label.y }];
  });
  return { cx, cy, radius, height, labels };
}
