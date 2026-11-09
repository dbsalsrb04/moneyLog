import type { Page } from '@playwright/test';

export function monthButton(page: Page, month: string, label: '일별' | '세부' = '일별') {
  const [year, number] = month.split('-').map(Number);
  const panel = label === '일별' ? '#panel-daily' : '#panel-details';
  return page.locator(panel).getByRole('button', { name: `${year}년 ${number}월 ${label}`, exact: true, includeHidden: true });
}

export async function selectDailyMonth(page: Page, month: string) {
  const previous = await page.getByRole('tab', { selected: true }).textContent();
  await page.getByRole('tab', { name: '일별', exact: true }).click();
  await monthButton(page, month).click();
  await page.getByRole('tab', { name: previous!, exact: true }).click();
}

export async function setMonthlyPeriod(page: Page, months: number) {
  const previous = await page.getByRole('tab', { selected: true }).textContent();
  await page.getByRole('tab', { name: '월별', exact: true }).click();
  await page.getByRole('button', { name: `${months}개월`, exact: true }).click();
  await page.getByRole('tab', { name: previous!, exact: true }).click();
}
