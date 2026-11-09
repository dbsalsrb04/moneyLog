import { expect, test, type Page } from '@playwright/test';
import { monthButton } from './viewHelpers';

const moneyTrackTable = [
  { id: 1, part: 'E', category: '식비/외식', amount: 7200, memo: '아침 식사', tags: ['식비', '출근'], dateKey: '2026-11-03' },
  { id: 2, part: 'E', category: '식비/카페', amount: 4800, memo: '카페', tags: ['휴식'], dateKey: '2026-11-03' },
  { id: 3, part: 'E', category: '주거/월세', amount: 40000, memo: '임대료', tags: [], dateKey: '2026-11-03' },
  { id: 4, part: 'E', category: '교통비', amount: 3450, memo: '버스', tags: ['이동'], dateKey: '2026-11-07' },
  { id: 5, part: 'E', category: '식비/외식', amount: 14000, memo: '저녁 식사', tags: ['식비'], dateKey: '2026-12-01' },
  { id: 6, part: 'R', category: '수입', amount: 45000, memo: '수입 정산', tags: [], dateKey: '2026-11-03' },
  { id: 7, part: 'R', category: '주거/월세', amount: 8000, memo: '월세 환급', tags: [], dateKey: '2026-11-03' },
];

async function upload(page: Page) {
  await page.goto('/');
  await page.getByLabel('JSON 파일 선택', { exact: true }).setInputFiles({
    name: 'spending.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ moneyTrackTable })),
  });
}

test('월별 막대는 날짜별 합계를 열고, 날짜를 누르면 오른쪽에 거래 상세가 열린다', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await upload(page);
  await expect(page.getByText('월별 금액 표', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '월세 제외하기', exact: true }).click();
  await page.locator('#panel-monthly .recharts-bar-rectangle path').first().click();

  const month = page.getByRole('dialog', { name: '2026-11', exact: true });
  const dates = month.locator('tbody tr');
  const dayButton = month.getByRole('button', { name: '2026-11-03', exact: true });
  const detail = page.getByRole('dialog', { name: '2026-11-03', exact: true });
  await expect(month.getByRole('columnheader')).toHaveCount(2);
  await expect(dates).toHaveText(['2026-11-0312,000원', '2026-11-073,450원']);
  await expect(dates.first()).toHaveCSS('animation-duration', '0.05s');
  await expect(dates.last()).toHaveCSS('animation-delay', '0.02s');
  await expect(detail).toHaveCount(0);
  await expect(monthButton(page, '2026-11')).toHaveAttribute('aria-pressed', 'true');

  await dayButton.click();
  const records = detail.getByRole('listitem');
  await expect(records).toHaveText(['7,200원아침 식사#식비 #출근', '4,800원카페#휴식']);
  await expect(detail.getByText('2026-11-03', { exact: true })).toHaveCount(1);
  await expect(records.first().locator('strong')).toHaveCSS('text-align', 'right');
  await expect(records.first().locator('.detail-tag')).toHaveText(['#식비', '#출근']);
  await expect(records.last()).toHaveCSS('animation-delay', '0.02s');
  const monthBounds = (await month.boundingBox())!;
  const detailBounds = (await detail.boundingBox())!;
  expect(detailBounds.x).toBeGreaterThanOrEqual(monthBounds.x + monthBounds.width);
  expect(detailBounds.x + detailBounds.width).toBeLessThanOrEqual(1280);

  await page.keyboard.press('Escape');
  await expect(detail).toHaveCount(0);
  await expect(dayButton).toBeFocused();
  await expect(month).toBeVisible();
  await page.mouse.click(0, 0);
  await expect(month).toHaveCount(0);
});

test('모바일 일별 막대는 필터에 맞는 거래 상세만 바로 연다', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await upload(page);
  await page.getByRole('tab', { name: '일별', exact: true }).click();
  await expect(page.getByText('일별 금액 표', { exact: true })).toHaveCount(0);
  await monthButton(page, '2026-11').click();
  await page.getByRole('region', { name: '태그 필터' }).getByRole('button', { name: '출근', exact: true }).click();
  await page.locator('#panel-daily .recharts-bar-rectangle path').first().click();

  const detail = page.getByRole('dialog', { name: '2026-11-03', exact: true });
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await expect(detail.getByRole('listitem')).toHaveText('7,200원아침 식사#식비 #출근');
  await expect(detail.getByText('2026-11-03', { exact: true })).toHaveCount(1);
  const bounds = (await detail.boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(844);

  await page.getByRole('tab', { name: '월별', exact: true }).click();
  await expect(detail).toHaveCount(0);
});

test('월별 유형 비교에서 누른 막대의 유형으로 날짜별 합계와 상세를 표시한다', async ({ page }) => {
  await upload(page);
  await page.getByRole('button', { name: '월세 제외하기', exact: true }).click();
  await page.getByRole('button', { name: '다른 유형과 비교하기', exact: true }).click();
  const types = page.getByRole('group', { name: '월별 비교 유형' });
  await types.getByRole('button', { name: '수입', exact: true }).click();
  const income = page.locator('#panel-monthly .recharts-bar-rectangles').nth(1);
  await income.locator('.recharts-bar-rectangle path').first().click();

  const month = page.getByRole('dialog', { name: '2026-11', exact: true });
  await expect(month.locator('tbody tr')).toHaveText(['2026-11-0345,000원']);
  await month.getByRole('button', { name: '2026-11-03', exact: true }).click();
  const detail = page.getByRole('dialog', { name: '2026-11-03', exact: true });
  await expect(detail.getByRole('listitem')).toHaveText('45,000원수입 정산—');
});
