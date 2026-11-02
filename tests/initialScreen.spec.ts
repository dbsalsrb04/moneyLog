import { expect, test } from '@playwright/test';

const backup = { moneyTrackTable: [{ id: 1, part: 'E', category: '식비', amount: 300, tags: [], dateKey: '2026-10-01' }] };
const file = { name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) };

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`${viewport.width}px 초기 화면은 넓은 드롭 영역과 가운데 파일 선택 버튼만 표시한다`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    const area = page.getByRole('region', { name: 'JSON 파일 업로드' });
    const button = area.getByRole('button', { name: '파일 선택', exact: true });
    await expect(button).toBeVisible();
    await expect(page.getByRole('tablist')).toHaveCount(0);
    await expect(page.getByRole('group', { name: '거래 유형' })).toHaveCount(0);
    await expect(page.getByRole('region', { name: '카테고리 필터' })).toHaveCount(0);
    const bounds = (await area.boundingBox())!;
    const buttonBounds = (await button.boundingBox())!;
    expect(bounds.width).toBeGreaterThan(viewport.width * .8);
    expect(bounds.height).toBeGreaterThan(viewport.height * .7);
    expect(buttonBounds.x + buttonBounds.width / 2).toBeCloseTo(bounds.x + bounds.width / 2, 0);
    expect(buttonBounds.y).toBeGreaterThan(bounds.y + bounds.height / 2);
    expect(buttonBounds.y + buttonBounds.height).toBeLessThan(bounds.y + bounds.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight)).toBe(true);

    await page.getByLabel('JSON 파일 선택', { exact: true }).setInputFiles(file);
    await expect(page.getByTestId('monthly-total')).toContainText('300원');
    await expect(area).not.toHaveClass(/upload-card-expanded/);
    await expect(page.getByRole('tab', { name: '월별', exact: true })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('region', { name: '태그 필터' })).toBeVisible();
    await expect(area.getByRole('button', { name: '다른 파일 선택', exact: true })).toBeVisible();
  });
}

test('잘못된 첫 파일은 초기 화면에서 오류를 표시하고 올바른 파일로 복구한다', async ({ page }) => {
  await page.goto('/');
  const input = page.getByLabel('JSON 파일 선택', { exact: true });
  await input.setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{') });
  await expect(page.getByRole('alert')).toContainText('올바른 JSON');
  await expect(page.getByRole('button', { name: '파일 선택', exact: true })).toBeEnabled();
  await expect(page.getByRole('tablist')).toHaveCount(0);
  await input.setInputFiles(file);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByTestId('monthly-total')).toContainText('300원');
});
