import { expect, test, type Page } from '@playwright/test';

test.use({ timezoneId: 'Asia/Seoul' });

async function openBackup(page: Page) {
  await page.clock.setFixedTime(new Date('2026-11-16T12:00:00+09:00'));
  await page.goto('/');
  const rows = [
    ['2026-10-07', 2000], ['2026-10-16', 1000], ['2026-10-25', 9000],
    ['2026-11-03', 4000], ['2026-11-07', 2000], ['2026-11-16', 1000],
    ['2026-11-20', 100000],
  ] as const;
  const moneyTrackTable = [
    ...rows.map(([dateKey, amount], id) => ({ id, dateKey, amount, part: 'E', category: '식비', tags: [] })),
    { id: 7, dateKey: '2026-11-10', amount: 2000, part: 'E', category: '주거/월세', tags: [] },
  ];
  await page.getByLabel('JSON 파일 선택', { exact: true }).setInputFiles({
    name: 'comparison.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ moneyTrackTable })),
  });
  return page.getByRole('region', { name: '지난달 대비 누적 지출' });
}

test('파일 영역을 오른쪽 열에 맞추고 선택 월의 오늘까지 누적 지출을 비교한다', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 950 });
  const pace = await openBackup(page);
  const upload = page.getByRole('region', { name: 'JSON 파일 업로드' });
  const plot = await pace.boundingBox();
  const fileCard = await upload.boundingBox();
  const lowerChart = await page.getByRole('region', { name: '거래 조회' }).boundingBox();
  const lowerFilter = await page.getByRole('region', { name: '카테고리 필터' }).boundingBox();
  expect(plot!.x).toBeCloseTo(lowerChart!.x, 0);
  expect(plot!.width).toBeCloseTo(lowerChart!.width, 0);
  expect(fileCard!.x).toBeCloseTo(lowerFilter!.x, 0);
  expect(fileCard!.width).toBeCloseTo(lowerFilter!.width, 0);
  const name = (await upload.getByRole('heading', { name: 'comparison.json' }).boundingBox())!;
  const replace = (await upload.getByRole('button', { name: '다른 파일 선택' }).boundingBox())!;
  expect(replace.y).toBeGreaterThan(name.y + name.height);

  const ticks = pace.locator('.recharts-xAxis-tick-labels text');
  await expect(ticks).toHaveText(Array.from({ length: 30 }, (_, i) => String(i + 1)));
  await expect(pace.getByRole('heading')).toHaveCount(0);
  await expect(pace.locator('.spending-pace-legend > span')).toHaveText(['2026.10', '2026.11']);
  const endpoint = pace.getByTestId('spending-pace-endpoint');
  await expect(endpoint).toHaveAttribute('data-day', '16');
  await expect(pace.getByText('지난달 같은 시점보다 6,000원 더 썼어요.')).toBeVisible();
  await page.getByRole('button', { name: '월세 제외하기' }).click();
  await expect(pace.getByText('지난달 같은 시점보다 4,000원 더 썼어요.')).toBeVisible();

  const area = pace.locator('.spending-pace-fill .recharts-area-area');
  const areaEnd = await area.evaluate((path: SVGGraphicsElement) => path.getBBox().x + path.getBBox().width);
  const pointX = await endpoint.evaluate((point: SVGGraphicsElement) => point.transform.baseVal.getItem(0).matrix.e);
  expect(areaEnd).toBeCloseTo(pointX, 1);
  await expect(pace.locator('linearGradient')).toHaveAttribute('y2', '100%');
  await expect(pace.locator('linearGradient stop').last()).toHaveAttribute('offset', '100%');
  await expect(pace.locator('linearGradient stop').last()).toHaveAttribute('stop-opacity', '0');
  const pulse = endpoint.locator('.spending-pace-pulse');
  const glow = pace.locator('radialGradient');
  await expect(pulse).toHaveAttribute('fill', `url(#${await glow.getAttribute('id')})`);
  await expect(glow.locator('stop').last()).toHaveAttribute('stop-opacity', '0');
  await expect(area).toHaveCSS('animation-name', 'none');
  await expect(endpoint.locator('circle').last()).not.toHaveAttribute('stroke');
  await expect(pulse).toHaveCSS('animation-duration', '2s');
  await expect(pulse).toHaveCSS('animation-iteration-count', 'infinite');
  const animations = await pace.evaluate(element => element.getAnimations({ subtree: true })
    .map(animation => (animation as CSSAnimation).animationName));
  expect(animations).toEqual(['spending-pace-pulse']);

  const daySeven = (await ticks.nth(6).boundingBox())!;
  const grid = (await pace.locator('.recharts-cartesian-grid').boundingBox())!;
  await page.mouse.move(daySeven.x + daySeven.width / 2, grid.y + 12);
  const tooltip = pace.locator('.chart-tooltip');
  await expect(tooltip).toContainText('7일까지 누적 지출');
  await expect(tooltip.getByText('2,000원', { exact: true })).toHaveCSS('color', 'rgb(75, 85, 99)');
  await expect(tooltip.getByText('6,000원', { exact: true })).toHaveCSS('color', 'rgb(77, 108, 231)');
  await page.getByRole('tab', { name: '일별', exact: true }).click();
  await page.getByRole('button', { name: '2026년 10월 일별' }).click();
  await expect(endpoint).toHaveAttribute('data-day', '31');
  await expect(ticks).toHaveCount(31);
});

test('누적 지출 그래프는 마우스로 클릭할 때 테두리가 없고 키보드 초점은 표시한다', async ({ page }) => {
  const pace = await openBackup(page);
  const surface = pace.locator('.recharts-surface');
  await surface.click({ position: { x: 80, y: 24 } });
  const focused = pace.locator(':focus');
  await expect(focused).toHaveCSS('outline-style', 'none');

  const point = await pace.locator('.recharts-line-curve').last().evaluate((line: SVGPathElement) => {
    const pointOnLine = line.getPointAtLength(line.getTotalLength() / 2).matrixTransform(line.getScreenCTM()!);
    return { x: pointOnLine.x, y: pointOnLine.y };
  });
  await page.mouse.click(point.x, point.y);
  await expect(focused).toHaveCSS('outline-style', 'none');

  await page.getByRole('button', { name: '설정', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(surface).toBeFocused();
  await expect(surface).toHaveCSS('outline-color', 'rgb(139, 159, 247)');
  await expect(surface).toHaveCSS('outline-style', 'solid');
});

test('모바일에서 모든 날짜를 유지하며 상단 영역이 화면 너비를 넘지 않는다', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const pace = await openBackup(page);
  await expect(pace.locator('.recharts-xAxis-tick-labels text')).toHaveCount(30);
  const upload = page.getByRole('region', { name: 'JSON 파일 업로드' });
  const chart = (await pace.boundingBox())!;
  expect((await upload.boundingBox())!.y).toBeGreaterThan(chart.y + chart.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const scroll = pace.locator('.spending-pace-scroll');
  expect(await scroll.evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true);
});
