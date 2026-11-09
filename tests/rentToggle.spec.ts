import { expect, test } from '@playwright/test';

const backup = { moneyTrackTable: [
  { id: 1, part: 'E', category: '주거/월세', amount: 4000, memo: '임대료', tags: [], dateKey: '2026-10-01' },
  { id: 2, part: 'E', category: '주거/월세/관리비', amount: 1000, tags: [], dateKey: '2026-10-01' },
  { id: 3, part: 'E', category: '주거/월세관리', amount: 1500, tags: [], dateKey: '2026-10-01' },
  { id: 4, part: 'E', category: '식비', amount: 500, tags: [], dateKey: '2026-10-01' },
  { id: 5, part: 'R', category: '주거/월세', amount: 900, tags: [], dateKey: '2026-10-01' },
  { id: 6, part: 'R', category: '보너스', amount: 300, tags: [], dateKey: '2026-10-01' },
] };
const rentFile = {
  name: 'rent.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)),
};

test('월세 제외가 월별·일별·분석 그래프와 유형 비교에 적용되고 세부 거래는 유지한다', async ({ page }) => {
  await page.goto('/');
  const fileInput = page.getByLabel('JSON 파일 선택', { exact: true });
  await fileInput.setInputFiles(rentFile);
  const toggle = page.getByRole('button', { name: '월세 제외하기', exact: true });
  const monthlyTotal = page.getByTestId('monthly-total');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(toggle).toHaveText('월세 제외하기');
  await expect(monthlyTotal).toContainText('7,000원');

  await page.getByRole('button', { name: '월세 제외 도움말', exact: true }).hover();
  await expect(page.getByRole('tooltip')).toHaveText('주거/월세 제외');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(toggle).toHaveText('월세 제외하기');
  await expect(monthlyTotal).toContainText('2,000원');

  await page.getByRole('button', { name: '다른 유형과 비교하기', exact: true }).click();
  await page.getByRole('group', { name: '월별 비교 유형' }).getByRole('button', { name: '수입', exact: true }).click();
  await expect(page.getByTestId('comparison-total-E')).toContainText('2,000원');
  await expect(page.getByTestId('comparison-total-R')).toContainText('300원');

  await page.getByRole('tab', { name: '일별', exact: true }).click();
  await expect(page.getByTestId('daily-total')).toContainText('2,000원');
  await page.getByRole('tab', { name: '분석', exact: true }).click();
  await expect(page.getByTestId('analysis-total')).toContainText('2,000원');
  await page.getByRole('tab', { name: '세부', exact: true }).click();
  await expect(page.getByRole('group', { name: '2026-10-01 세부 내역' }).getByText('임대료', { exact: true })).toBeVisible();

  await page.getByRole('tab', { name: '월별', exact: true }).click();
  await toggle.press('Space');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('comparison-total-E')).toContainText('7,000원');
  await expect(page.getByTestId('comparison-total-R')).toContainText('1,200원');

  await toggle.click();
  await page.reload();
  await fileInput.setInputFiles(rentFile);
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(monthlyTotal).toContainText('2,000원');
  await toggle.click();
  await page.reload();
  await fileInput.setInputFiles(rentFile);
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(monthlyTotal).toContainText('7,000원');
});
