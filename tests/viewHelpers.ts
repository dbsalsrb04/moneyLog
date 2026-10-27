import type { Page } from '@playwright/test';

export async function selectDailyMonth(page: Page, month: string) {
  const previous = await page.getByRole('tab', { selected: true }).textContent();
  await page.getByRole('tab', { name: '일별', exact: true }).click();
  await page.getByLabel('일별 조회 월').selectOption(month);
  await page.getByRole('tab', { name: previous!, exact: true }).click();
}

export async function setMonthlyPeriod(page: Page, months: number) {
  const previous = await page.getByRole('tab', { selected: true }).textContent();
  await page.getByRole('tab', { name: '월별', exact: true }).click();
  await page.getByRole('button', { name: `${months}개월`, exact: true }).click();
  await page.getByRole('tab', { name: previous!, exact: true }).click();
}
