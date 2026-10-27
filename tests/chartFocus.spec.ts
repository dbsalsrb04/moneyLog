import { expect, test, type Locator } from '@playwright/test';

const backup = { moneyTrackTable: [
  { id: 1, part: 'E', category: '식비', amount: 60000, memo: '식사', tags: [], dateKey: '2026-10-01' },
  { id: 2, part: 'E', category: '교통비', amount: 20000, memo: '교통', tags: [], dateKey: '2026-10-02' },
  { id: 3, part: 'E', category: '식비', amount: 10000, memo: '식사', tags: [], dateKey: '2026-09-01' },
  { id: 4, part: 'R', category: '수입', amount: 90000, memo: '급여', tags: [], dateKey: '2026-10-01' },
] };

async function expectNoClickOutline(chart: Locator) {
  // Click a real bar: the focus target is an internal SVG group, not the root SVG.
  const focused = chart.locator(':focus');
  await expect(focused).toHaveCount(1);
  await expect(focused).not.toHaveClass(/recharts-surface/);
  await expect(focused).toHaveCSS('outline-style', 'none');
  expect(await chart.evaluate(root => [...root.querySelectorAll('*')].some(element => {
    const style = getComputedStyle(element);
    return style.outlineStyle !== 'none' && style.outlineWidth !== '0px';
  }))).toBe(false);
}

test('월별·일별·비교·분석 막대를 클릭해도 내부 SVG 그룹에 테두리가 생기지 않는다', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('JSON 파일 선택', { exact: true }).setInputFiles({
    name: 'focus.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)),
  });
  const chart = page.getByRole('tabpanel').locator('.chart');
  const bars = chart.locator('.recharts-bar-rectangle path');
  await bars.first().click();
  await expectNoClickOutline(chart);
  await page.getByRole('tab', { name: '일별', exact: true }).click();
  await expect(page.getByLabel('일별 조회 월')).toHaveValue('2026-09');
  await bars.first().click();
  await expectNoClickOutline(chart);
  await expect(chart.locator('.chart-tooltip')).toContainText('10,000원');

  await page.getByRole('tab', { name: '월별', exact: true }).click();
  await page.getByRole('button', { name: '다른 유형과 비교하기' }).click();
  await page.getByRole('group', { name: '월별 비교 유형' }).getByRole('button', { name: '수입', exact: true }).click();
  await bars.last().click();
  await expectNoClickOutline(chart);

  await page.getByRole('tab', { name: '분석', exact: true }).click();
  await page.getByRole('switch', { name: '그래프 모양' }).click();
  await bars.first().click();
  await expectNoClickOutline(chart);
  await expect(chart.locator('.chart-tooltip')).toContainText('60,000원');

  // Keyboard users still get a visible chart focus indicator and arrow-key tooltips.
  await page.getByRole('button', { name: '분석 다음 연도', exact: true }).focus();
  await page.keyboard.press('Tab');
  const surface = chart.locator('.recharts-surface');
  await expect(surface).toBeFocused();
  await expect(surface).toHaveCSS('outline-style', 'solid');
  await expect(surface).toHaveCSS('outline-color', 'rgb(139, 159, 247)');
  await page.keyboard.press('ArrowRight');
  await expect(chart.locator('.chart-tooltip')).toBeVisible();
  await bars.first().click();
  await expectNoClickOutline(chart);
});
