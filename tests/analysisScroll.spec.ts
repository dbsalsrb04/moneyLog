import { expect, test, type Locator, type Page } from '@playwright/test';

async function showAnalysis(page: Page, crowded = false) {
  await page.goto('/');
  await page.getByLabel('JSON 파일 선택', { exact: true }).setInputFiles({
    name: 'analysis-scroll.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({
      moneyTrackTable: Array.from({ length: crowded ? 20 : 4 }, (_, index) => ({
        id: index, part: 'E', category: `분류${String(index + 1).padStart(2, '0')}`,
        amount: crowded ? 5 : [60, 25, 14, 1][index], memo: '', tags: [], dateKey: '2026-10-01',
      })),
    })),
  });
  await page.getByRole('tab', { name: '분석', exact: true }).click();
  await expect(page.locator('.analysis-category-shape').first()).toBeVisible();
}

async function positionOver(page: Page, target: Locator, top = 120) {
  await target.evaluate((element, y) => {
    window.scrollTo(0, window.scrollY + element.getBoundingClientRect().top - y);
  }, top);
  const bounds = (await target.boundingBox())!;
  const point = { x: bounds.x + bounds.width / 2, y: Math.max(30, bounds.y) + Math.min(50, bounds.height / 2) };
  expect(point.y).toBeLessThan((await page.viewportSize())!.height - 170);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(50);
  expect(await target.evaluate((element, point) => element.contains(document.elementFromPoint(point.x, point.y)), point)).toBe(true);
  return point;
}

async function swipe(page: Page, point: { x: number; y: number }, delta: number) {
  const session = await page.context().newCDPSession(page);
  try {
    // Native input exercises browser scrolling; dispatchEvent('touchmove') cannot.
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
    for (let step = 1; step <= 8; step++) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: point.x, y: point.y + step * delta / 8 }] });
      await page.waitForTimeout(16);
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } finally {
    await session.detach();
  }
}

test('파이·막대와 짧은 범례 위에서도 휠 스크롤이 페이지로 이어진다', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 600 });
  await showAnalysis(page);
  for (const bar of [false, true]) {
    if (bar) await page.getByRole('switch', { name: '그래프 모양' }).click();
    for (const target of [page.locator('.analysis-category-shape').first(), page.locator('.analysis-table tbody tr').first()]) {
      const point = await positionOver(page, target);
      const before = await page.evaluate(() => window.scrollY);
      await page.mouse.move(point.x, point.y);
      await page.mouse.wheel(0, -140);
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(before - 50);
    }
  }
});

test('긴 범례는 내부에서 스크롤하고 양 끝에서는 페이지로 이어진다', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 600 });
  await showAnalysis(page, true);
  const legend = page.locator('.analysis-table-scroll');
  expect(await legend.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);
  for (const boundary of ['top', 'bottom'] as const) {
    const point = await positionOver(page, legend);
    await legend.evaluate((element, end) => { element.scrollTop = end === 'top' ? 0 : element.scrollHeight; }, boundary);
    const before = await page.evaluate(() => window.scrollY);
    const innerBefore = await legend.evaluate(element => element.scrollTop);
    await page.mouse.move(point.x, point.y);
    await page.mouse.wheel(0, boundary === 'top' ? 100 : -100);
    await expect.poll(() => legend.evaluate(element => element.scrollTop)).not.toBe(innerBefore);
    expect(await page.evaluate(() => window.scrollY)).toBe(before);
    await legend.evaluate((element, end) => { element.scrollTop = end === 'top' ? 0 : element.scrollHeight; }, boundary);
    await page.mouse.wheel(0, boundary === 'top' ? -140 : 140);
    await expect.poll(() => page.evaluate(() => window.scrollY)).not.toBe(before);
  }
});

test.describe('모바일 터치', () => {
  test.use({ viewport: { width: 390, height: 720 }, isMobile: true, hasTouch: true });

  test('파이·막대와 범례에서 시작한 드래그가 스크롤되고 그 외 탭도 유지된다', async ({ page }) => {
    await showAnalysis(page);
    for (const bar of [false, true]) {
      if (bar) await page.getByRole('switch', { name: '그래프 모양' }).tap();
      for (const target of [page.locator('.analysis-category-shape').first(), page.locator('.analysis-table tbody tr').first()]) {
        const point = await positionOver(page, target);
        const before = await page.evaluate(() => window.scrollY);
        await swipe(page, point, 144);
        await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(before - 50);
        await expect(page.getByRole('dialog', { name: '그 외 카테고리', exact: true })).toHaveCount(0);
      }
      for (const target of [page.locator('.analysis-category-shape[data-category-key="other"]'), page.locator('.analysis-table tr[data-other="true"]')]) {
        await target.tap();
        const popup = page.getByRole('dialog', { name: '그 외 카테고리', exact: true });
        await expect(popup).toBeVisible();
        await popup.getByRole('button', { name: '그 외 닫기' }).tap();
        await expect(popup).toHaveCount(0);
      }
    }
  });

  test('긴 범례의 위·아래 끝에서도 터치 스크롤이 페이지로 이어진다', async ({ page }) => {
    await showAnalysis(page, true);
    const legend = page.locator('.analysis-table-scroll');
    for (const boundary of ['top', 'bottom'] as const) {
      const point = await positionOver(page, legend, 240);
      await legend.evaluate((element, end) => { element.scrollTop = end === 'top' ? 0 : element.scrollHeight; }, boundary);
      const before = await page.evaluate(() => window.scrollY);
      await swipe(page, point, boundary === 'top' ? 144 : -144);
      if (boundary === 'top') await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(before - 50);
      else await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before + 50);
    }
  });
});
