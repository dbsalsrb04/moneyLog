import { expect, test, type Page } from '@playwright/test';
import { selectDailyMonth } from './viewHelpers';

const backup = { moneyTrackTable: [
  { id: 1, part: 'E', category: '식비/편의점', amount: 300, memo: '간식', tags: ['식비', '간식'], dateKey: '2026-10-01' },
  { id: 2, part: 'E', category: '식비/카페', amount: 100, memo: '커피', tags: ['음료'], dateKey: '2026-10-02' },
  { id: 3, part: 'E', category: '식비', amount: 100, memo: '식사', tags: ['식비'], dateKey: '2026-10-02' },
  { id: 4, part: 'E', category: '여가/PC방', amount: 500, memo: '충전', tags: ['여가'], dateKey: '2026-10-03' },
  { id: 5, part: 'E', category: '여행', amount: 1000, memo: '여행', tags: ['여행'], dateKey: '2026-09-01' },
  { id: 6, part: 'R', category: '수입/월급', amount: 10000, memo: '월급', tags: [], dateKey: '2026-10-05' },
] };

async function upload(page: Page, data: unknown = backup) {
  await page.getByLabel('JSON 파일 선택', { exact: true }).setInputFiles({ name: 'analysis.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)) });
}
const tab = (page: Page, name: string) => page.getByRole('tab', { name, exact: true });

test('한 영역의 네 탭·키보드 전환·필터와 기간·세부 날짜 상태를 유지한다', async ({ page }) => {
  await page.goto('/'); await upload(page);
  await expect(page.getByText('거래 대시보드', { exact: true })).toHaveCount(0);
  await expect(page.locator('.charts-column>.card')).toHaveCount(1);
  await expect(page.getByRole('tablist').getByRole('tab')).toHaveText(['월별', '일별', '세부', '분석']);
  await expect(page.getByRole('tabpanel')).toHaveCount(1);
  await expect(page.getByRole('region', { name: '월별 지출', exact: true })).toBeVisible();
  await tab(page, '월별').focus(); await page.keyboard.press('ArrowRight');
  await expect(tab(page, '일별')).toBeFocused(); await expect(tab(page, '일별')).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('End'); await expect(tab(page, '분석')).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Home'); await expect(tab(page, '월별')).toHaveAttribute('aria-selected', 'true');
  await tab(page, '세부').click();
  await page.getByRole('button', { name: '2026-10-03 선택', exact: true }).click();
  await tab(page, '월별').click(); await page.getByRole('button', { name: '3개월', exact: true }).click();
  await page.getByRole('region', { name: '카테고리 필터' }).getByRole('button', { name: '식비', exact: true }).click();
  await tab(page, '분석').click(); await expect(page.getByTestId('analysis-total')).toContainText('500원');
  await tab(page, '세부').click();
  await expect(page.getByRole('region', { name: '세부 지출' }).locator('time')).toHaveText('2026-10-03');
  await tab(page, '일별').click(); await expect(page.getByLabel('일별 조회 월')).toHaveValue('2026-10');
  await tab(page, '월별').click(); await expect(page.getByRole('button', { name: '3개월', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('tabpanel')).toHaveCount(1);
});

test('상위·전체 경로 분석과 필터·유형 연동, 도움말 및 두 설정의 저장', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/'); await upload(page); await tab(page, '분석').click();
  const table = page.locator('.analysis-table');
  await expect(page.getByTestId('analysis-total')).toContainText('1,000원');
  await expect(table.locator('tbody tr')).toHaveText(['식비500원50%', '여가500원50%']);
  await expect(page.getByRole('img', { name: '카테고리별 지출 비중 파이차트' })).toBeVisible();
  await page.getByRole('button', { name: '그래프 설정 도움말' }).hover();
  await expect(page.getByRole('tooltip')).toHaveText('그래프 모양');
  await page.mouse.move(0, 0);
  await page.getByRole('button', { name: '카테고리 기준 도움말' }).focus();
  await expect(page.getByRole('tooltip')).toContainText('상위 기준 예시: 식비, 쇼핑, 교통비, ...');
  await expect(page.getByRole('tooltip')).toContainText('하위 기준 예시: 식비/편의점, 식비/카페, ..., 쇼핑/옷, 쇼핑/생활용품, ...');
  await page.keyboard.press('Escape'); await page.mouse.move(0, 0); await page.getByRole('switch', { name: '하위 카테고리 기준' }).click();
  await expect(table.locator('tbody tr')).toHaveText(['여가/PC방500원50%', '식비/편의점300원30%', '식비100원10%', '식비/카페100원10%']);
  await page.getByRole('switch', { name: '그래프 모양' }).click();
  await expect(page.getByRole('img', { name: '카테고리별 지출 비중 막대그래프' })).toBeVisible();
  await page.getByRole('region', { name: '태그 필터' }).getByRole('button', { name: '식비', exact: true }).click();
  await page.getByRole('region', { name: '태그 필터' }).getByRole('button', { name: '간식', exact: true }).click();
  await expect(page.getByTestId('analysis-total')).toContainText('400원');
  await expect(table.locator('tbody tr')).toHaveText(['식비/편의점300원75%', '식비100원25%']);
  await page.getByRole('group', { name: '거래 유형' }).getByRole('button', { name: '수입', exact: true }).click();
  await expect(page.getByTestId('analysis-total')).toContainText('10,000원');
  await expect(table.locator('tbody tr')).toHaveText(['수입/월급10,000원100%']);
  await page.reload(); await upload(page); await tab(page, '분석').click();
  await expect(page.getByRole('switch', { name: '그래프 모양' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('switch', { name: '하위 카테고리 기준' })).toHaveAttribute('aria-checked', 'true');
  expect(errors).toEqual([]);
});

test('5% 이상 상위 10개와 회색 그 외를 두 차트와 범례에 동일하게 표시하고 호버를 연동한다', async ({ page }) => {
  await page.goto('/');
  await upload(page, { moneyTrackTable: Array.from({ length: 20 }, (_, index) => ({ ...backup.moneyTrackTable[0], id: index, category: `분류${String(index + 1).padStart(2, '0')}`, amount: 5 })) });
  await tab(page, '분석').click();
  await expect(page.locator('.analysis-table tbody tr')).toHaveCount(11);
  const other = page.locator('.analysis-table tbody tr[data-other="true"]');
  await expect(other).toHaveText('그 외50원50%');
  await expect(other.locator('i')).toHaveCSS('background-color', 'rgb(154, 162, 175)');
  const shape = page.locator('.analysis-category-shape[data-category-key="other"]');
  await expect(shape).toHaveCount(1); await expect(shape).toHaveAttribute('fill', '#9aa2af');
  await other.hover();
  await expect.poll(() => shape.evaluate(element => Number(getComputedStyle(element).transform.split('(')[1]?.split(',')[0]))).toBeCloseTo(1.05, 2);
  await expect(shape).toHaveCSS('filter', /drop-shadow/);
  await page.getByRole('switch', { name: '그래프 모양' }).click();
  await expect(shape).toHaveCount(1); await other.hover();
  await expect(shape).toHaveCSS('transform', /1\.05/);
  await page.mouse.move(0, 0); await shape.hover();
  await expect(other).toHaveClass('analysis-legend-hovered');
  await expect(page.locator('.analysis-table tbody tr').first()).toContainText('5%');
});

test('분석 월은 한 달만 선택해 교체하며 탭 간 유지하고 공유 월 변경 시 초기화한다', async ({ page }) => {
  await page.goto('/'); await upload(page, { moneyTrackTable: [...backup.moneyTrackTable,
    { ...backup.moneyTrackTable[0], id: 7, amount: 700, dateKey: '2025-12-31' },
  ] }); await tab(page, '분석').click();
  const trigger = page.getByRole('button', { name: '분석 조회 월' });
  await expect(trigger).toHaveText('조회 월 2026년 10월');
  await trigger.click();
  const picker = page.getByRole('group', { name: '분석 월 선택' });
  await expect(picker.getByRole('button', { pressed: true })).toHaveCount(1);
  await expect(picker.getByRole('button', { name: '2026년 10월 분석', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await picker.getByRole('button', { name: '2026년 9월 분석', exact: true }).click();
  await expect(picker).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveText('조회 월 2026년 9월');
  await expect(page.getByTestId('analysis-total')).toContainText('1,000원');
  await expect(page.locator('.analysis-table tbody tr')).toHaveText(['여행1,000원100%']);
  await trigger.click();
  await expect(picker.getByRole('button', { pressed: true })).toHaveCount(1);
  await expect(picker.getByRole('button', { name: '2026년 10월 분석', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await picker.getByRole('button', { name: '분석 이전 연도' }).click();
  await picker.getByRole('button', { name: '2025년 12월 분석', exact: true }).click();
  await expect(picker).toHaveCount(0);
  await expect(page.getByTestId('analysis-total')).toHaveText('700원2025년 12월 지출');
  await tab(page, '월별').click(); await tab(page, '분석').click();
  await expect(trigger).toHaveText('조회 월 2025년 12월');
  await trigger.click();
  await picker.getByRole('button', { name: '분석 연도 선택', exact: true }).click();
  await picker.getByRole('button', { name: '2026년 분석 월 선택', exact: true }).click();
  await picker.getByRole('button', { name: '2026년 10월 분석', exact: true }).click();
  await expect(page.getByTestId('analysis-total')).toHaveText('1,000원2026년 10월 지출');
  await trigger.click();
  await picker.getByRole('button', { name: '2026년 10월 분석', exact: true }).click();
  await expect(picker).toHaveCount(0);
  await expect(page.getByTestId('analysis-total')).toContainText('1,000원');
  await selectDailyMonth(page, '2026-09');
  await expect(trigger).toHaveText('조회 월 2026년 9월');
  await expect(page.locator('.analysis-table tbody tr')).toHaveText(['여행1,000원100%']);
});

test('빈 결과·새 파일·저장소 제한과 모바일의 탭·도움말·월 선택이 동작한다', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new Error('storage unavailable'); }; });
  await page.goto('/'); await upload(page); await tab(page, '분석').click();
  await page.getByRole('button', { name: '카테고리 기준 도움말' }).focus();
  const tip = (await page.getByRole('tooltip').boundingBox())!;
  expect(tip.x).toBeGreaterThanOrEqual(0); expect(tip.x + tip.width).toBeLessThanOrEqual(390);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '분석 조회 월' }).click();
  const picker = page.getByRole('group', { name: '분석 월 선택' });
  await picker.getByRole('button', { name: '2026년 1월 분석', exact: true }).click();
  await expect(picker).toHaveCount(0);
  await expect(page.getByRole('button', { name: '분석 조회 월' })).toHaveText('조회 월 2026년 1월');
  await expect(page.getByTestId('analysis-total')).toHaveText('0원2026년 1월 지출');
  await expect(page.getByText('선택한 월과 필터에 해당하는 내역이 없습니다.', { exact: true })).toBeVisible();
  await upload(page, { moneyTrackTable: [{ ...backup.moneyTrackTable[0], amount: 400, dateKey: '2024-02-29' }] });
  await expect(page.getByTestId('analysis-total')).toContainText('400원');
  await expect(page.getByRole('button', { name: '분석 조회 월' })).toContainText('2024년 2월');
  await page.getByRole('switch', { name: '그래프 모양' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const name of ['일별', '세부', '월별', '분석']) {
    await tab(page, name).click();
    await expect(page.getByRole('tabpanel')).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('그 외는 범례·파이·막대에서 클릭해 전체 내역을 열고 50ms/20ms 순차 애니메이션으로 표시한다', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1300 });
  await page.goto('/');
  await upload(page, { moneyTrackTable: Array.from({ length: 20 }, (_, index) => ({ ...backup.moneyTrackTable[0], id: index, category: `분류${String(index + 1).padStart(2, '0')}`, amount: 5 })) });
  await tab(page, '분석').click();
  const other = page.locator('.analysis-table tr[data-other="true"]');
  await other.hover(); const bounds = (await other.boundingBox())!;
  await other.click();
  const popup = page.getByRole('dialog', { name: '그 외 카테고리', exact: true });
  await expect(popup).toBeVisible();
  const popupBounds = (await popup.boundingBox())!;
  expect(popupBounds.x).toBeGreaterThan(bounds.x + bounds.width / 2);
  expect(popupBounds.y).toBeGreaterThan(bounds.y + bounds.height / 2);
  await expect(popup.locator('tbody tr')).toHaveCount(10);
  await expect(popup.locator('tbody tr').first()).toHaveText('분류115%5원');
  await expect(popup.locator('tbody tr').last()).toHaveText('분류205%5원');
  await expect(popup.locator('tbody tr').first()).toHaveCSS('animation-duration', '0.05s');
  await expect(popup.locator('tbody tr').nth(1)).toHaveCSS('animation-delay', '0.02s');
  await expect(popup.locator('tbody tr').nth(2)).toHaveCSS('animation-delay', '0.04s');
  await page.keyboard.press('Escape'); await expect(popup).toHaveCount(0);
  const shape = page.locator('.analysis-category-shape[data-category-key="other"]');
  await shape.click(); await expect(popup).toBeVisible();
  await popup.getByRole('button', { name: '그 외 닫기' }).click(); await expect(other).toBeFocused();
  await page.getByRole('switch', { name: '그래프 모양' }).click();
  await shape.click(); await expect(popup).toBeVisible();
  await page.mouse.click(0, 0); await expect(popup).toHaveCount(0);
  await other.focus(); await page.keyboard.press('Enter'); await expect(popup).toBeVisible();
  await tab(page, '월별').click(); await expect(popup).toHaveCount(0);
});

test('모바일에서도 그 외 팝업은 화면 안에 표시된다', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/');
  await upload(page, { moneyTrackTable: Array.from({ length: 25 }, (_, index) => ({ ...backup.moneyTrackTable[0], id: index, category: `긴 카테고리/항목${index}`, amount: 4 })) });
  await tab(page, '분석').click();
  await page.getByRole('switch', { name: '하위 카테고리 기준' }).click();
  await page.locator('.analysis-table tr[data-other="true"]').click();
  const popup = page.getByRole('dialog', { name: '그 외 카테고리', exact: true });
  await expect(popup.locator('tbody tr')).toHaveCount(25);
  const bounds = (await popup.boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  expect(bounds.y).toBeGreaterThanOrEqual(0); expect(bounds.y + bounds.height).toBeLessThanOrEqual(844);
  expect(await popup.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await expect(popup.locator('tbody tr').first()).toContainText('4%');
});
