export const MIN_YEAR = 1;
export const MAX_YEAR = 9999;
export type PickerView = { level: 0 | 1; start: number };
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function stepMonth(month: string, direction: -1 | 1): string {
  const [year, number] = month.split('-').map(Number);
  const index = clamp(year * 12 + number - 1 + direction, MIN_YEAR * 12, MAX_YEAR * 12 + 11);
  return `${String(Math.floor(index / 12)).padStart(4, '0')}-${String(index % 12 + 1).padStart(2, '0')}`;
}

export const viewEndYear = (view: PickerView) => Math.min(MAX_YEAR, view.start + (view.level === 0 ? 0 : 11));

export function yearView(year: number): PickerView {
  return { level: 1, start: clamp(year - 6, MIN_YEAR, MAX_YEAR - 11) };
}

export function pageView(view: PickerView, direction: -1 | 1): PickerView {
  const span = view.level === 0 ? 1 : 12;
  return { ...view, start: clamp(view.start + direction * span, MIN_YEAR, Math.max(MIN_YEAR, MAX_YEAR - span + 1)) };
}

export function getYearChoices(view: PickerView): number[] {
  return Array.from({ length: 12 }, (_, index) => view.start + index);
}
