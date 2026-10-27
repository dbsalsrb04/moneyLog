import { expect, test, type Page } from '@playwright/test';

async function showPie(page: Page, categories: string[], amounts: number[]) {
  await page.goto('/');
  await page.getByLabel('JSON 파일 선택', { exact: true }).setInputFiles({
    name: 'pie-labels.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({
      moneyTrackTable: categories.map((category, index) => ({ id: index, part: 'E', category, amount: amounts[index], memo: '', tags: [], dateKey: '2026-10-01' })),
    })),
  });
  await page.getByRole('tab', { name: '분석', exact: true }).click();
}

test('넓은 파이 조각 안에 카테고리 이름과 백분율을 함께 표시하고 필터 변경을 반영한다', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await showPie(page, ['식비', '여가'], [50, 50]);
  const labels = page.locator('.pie-category-label');
  await expect(labels).toHaveCount(2);
  await expect(labels.filter({ hasText: '식비' })).toHaveAttribute('data-placement', 'inside');
  await expect(labels.locator('.pie-category-name')).toHaveText(['식비', '여가']);
  await expect(labels.locator('.pie-percentage-label')).toHaveText(['50%', '50%']);
  await expect(page.locator('.pie-label-connector')).toHaveCount(0);
  await page.getByRole('region', { name: '카테고리 필터', exact: true }).getByRole('button', { name: '식비', exact: true }).click();
  await expect(labels).toHaveCount(1);
  await expect(labels.locator('.pie-category-name')).toHaveText('식비');
  await expect(labels.locator('.pie-percentage-label')).toHaveText('100%');
});

test('좁은 조각은 카테고리 이름만 외부에 표시하고 백분율은 차트 내부에 유지한다', async ({ page }) => {
  const categories = ['식비/편의점', '교통비/대중교통', '생활/세탁용품', '기타/행정발급비', '구독/동영상서비스', '여가/게임'];
  await showPie(page, categories, [65, 15, 5, 5, 5, 5]);
  await page.getByRole('switch', { name: '하위 카테고리 기준' }).click();
  for (const width of [1440, 1001, 800, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    const labels = page.locator('.pie-category-label');
    await expect(labels).toHaveCount(6);
    expect(new Set(await labels.evaluateAll(elements => elements.map(element => element.getAttribute('data-category'))))).toEqual(new Set(categories));
    expect(new Set(await labels.locator('.pie-category-name').allTextContents())).toEqual(new Set(categories));
    await expect(labels.locator('.pie-percentage-label')).toHaveText(['65%', '15%', '5%', '5%', '5%', '5%']);
    await expect(page.locator('.pie-category-label[data-placement="outside"]').first()).toBeVisible();
    await expect.poll(() => page.locator('.analysis-pie').evaluate(root => {
      const svg = root.querySelector('svg')!.getBoundingClientRect();
      const labels = [...root.querySelectorAll('.pie-category-label')].map(element => ({
        placement: element.getAttribute('data-placement'),
        anchor: element.querySelector('.pie-category-name')!.getAttribute('text-anchor'),
        box: element.querySelector('.pie-category-name')!.getBoundingClientRect(),
        connector: element.querySelector('polyline'),
      }));
      const within = labels.every(({ box, placement, connector }) => box.left >= svg.left - 1 && box.right <= svg.right + 1 && box.top >= svg.top - 1 && box.bottom <= svg.bottom + 1 && (placement === 'inside' || connector !== null));
      const separate = ['start', 'end'].every(anchor => {
        const side = labels.filter(label => label.placement === 'outside' && label.anchor === anchor).sort((a, b) => a.box.top - b.box.top);
        return side.slice(1).every((label, index) => label.box.top > side[index].box.bottom);
      });
      const shapes = [...root.querySelectorAll('.analysis-category-shape')].map(element => element.getBoundingClientRect());
      const left = Math.min(...shapes.map(box => box.left)), right = Math.max(...shapes.map(box => box.right));
      const top = Math.min(...shapes.map(box => box.top)), bottom = Math.max(...shapes.map(box => box.bottom));
      const percentagesInside = [...root.querySelectorAll('.pie-percentage-label')].every(element => {
        const box = element.getBoundingClientRect();
        return box.left >= left && box.right <= right && box.top >= top && box.bottom <= bottom;
      });
      return within && separate && percentagesInside && document.documentElement.scrollWidth <= innerWidth;
    })).toBe(true);
  }
});

test('아주 작은 그 외 조각도 이름과 비중을 생략하지 않으며 기존 팝업을 열 수 있다', async ({ page }) => {
  await showPie(page, ['식비', '기타'], [99, 1]);
  const other = page.locator('.pie-category-label[data-category="그 외"]');
  await expect(other).toHaveText('그 외1%');
  await expect(other).toHaveAttribute('data-placement', 'outside');
  await expect(other.locator('.pie-label-connector')).toHaveCSS('stroke', 'rgb(154, 162, 175)');
  expect(await other.locator('polyline').evaluate(element => (element as SVGPolylineElement).getTotalLength())).toBeGreaterThan(0);
  await page.locator('.analysis-category-shape[data-category-key="other"]').click();
  await expect(page.getByRole('dialog', { name: '그 외 카테고리', exact: true })).toBeVisible();
});
