export const VIEWS = [
  { value: 'monthly', label: '월별' },
  { value: 'daily', label: '일별' },
  { value: 'details', label: '세부' },
  { value: 'analysis', label: '분석' },
] as const;
export type DashboardView = typeof VIEWS[number]['value'];

export default function ViewTabs({ value, onChange }: { value: DashboardView; onChange: (value: DashboardView) => void }) {
  return <div className="view-tabs" role="tablist" aria-label="조회 방식">{VIEWS.map((view, index) => <button
    key={view.value}
    id={`tab-${view.value}`}
    role="tab"
    aria-selected={value === view.value}
    aria-controls={`panel-${view.value}`}
    tabIndex={value === view.value ? 0 : -1}
    onClick={() => onChange(view.value)}
    onKeyDown={event => {
      const target = event.key === 'Home' ? 0 : event.key === 'End' ? VIEWS.length - 1 : event.key === 'ArrowRight' ? (index + 1) % VIEWS.length : event.key === 'ArrowLeft' ? (index + VIEWS.length - 1) % VIEWS.length : null;
      if (target === null) return;
      event.preventDefault();
      onChange(VIEWS[target].value);
      document.getElementById(`tab-${VIEWS[target].value}`)?.focus();
    }}
  >{view.label}</button>)}</div>;
}
