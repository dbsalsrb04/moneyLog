export const MIN_YEAR = 1;
export const MAX_YEAR = 9999;
export type PickerView = { level: number; start: number };
export type YearChoice = { start: number; end: number; disabled: boolean };
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function stepMonth(month: string, direction: -1 | 1): string {
  const [year, number] = month.split('-').map(Number);
  const index = clamp(year * 12 + number - 1 + direction, MIN_YEAR * 12, MAX_YEAR * 12 + 11);
  return `${String(Math.floor(index / 12)).padStart(4, '0')}-${String(index % 12 + 1).padStart(2, '0')}`;
}

export const choiceYearSpan = (view: PickerView) => 12 ** Math.max(0, view.level - 1);
export const viewEndYear = (view: PickerView) => Math.min(MAX_YEAR, view.start + (view.level === 0 ? 1 : choiceYearSpan(view) * 12) - 1);
export const canZoomOut = (view: PickerView) => view.start > MIN_YEAR || viewEndYear(view) < MAX_YEAR;

export function zoomOut(view: PickerView): PickerView {
  if (!canZoomOut(view)) return view;
  const center = view.level === 0 ? view.start : view.start + choiceYearSpan(view) * 6;
  const level = view.level + 1;
  const span = 12 ** (level - 1);
  return { level, start: clamp(center - span * 6, MIN_YEAR, Math.max(MIN_YEAR, MAX_YEAR - span * 12 + 1)) };
}

export function pageView(view: PickerView, direction: -1 | 1): PickerView {
  const span = view.level === 0 ? 1 : choiceYearSpan(view) * 12;
  return { ...view, start: clamp(view.start + direction * span, MIN_YEAR, Math.max(MIN_YEAR, MAX_YEAR - span + 1)) };
}

export function getYearChoices(view: PickerView): YearChoice[] {
  const span = choiceYearSpan(view);
  return Array.from({ length: 12 }, (_, index) => {
    const start = view.start + span * index;
    return { start, end: Math.min(MAX_YEAR, start + span - 1), disabled: start > MAX_YEAR };
  });
}
