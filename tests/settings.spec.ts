import { selectDailyMonth, setMonthlyPeriod } from './viewHelpers';
import { expect, test, type Page } from '@playwright/test';

const backup = {
  moneyTrackTable: [
    { id: 1, part: 'E', category: '식비/식사1', amount: 1000, memo: '식사 1', tags: ['간식', '식비'], dateKey: '2026-08-01' },
    { id: 2, part: 'E', category: '식비/식사2', amount: 2000, memo: '식사 2', tags: ['식비'], dateKey: '2026-08-02' },
    { id: 3, part: 'E', category: '식비/식사3', amount: 3000, memo: '식사 3', tags: ['간식', '식비'], dateKey: '2026-08-03' },
    { id: 4, part: 'E', category: '쇼핑/쇼핑몰1', amount: 4000, memo: '쇼핑 1', tags: ['쇼핑'], dateKey: '2026-08-04' },
    { id: 5, part: 'E', category: '쇼핑/쇼핑몰2', amount: 5000, memo: '쇼핑 2', tags: ['쇼핑'], dateKey: '2026-08-05' },
    { id: 6, part: 'R', category: '수입/월급', amount: 9000, memo: '월급', tags: ['월급'], dateKey: '2026-08-06' },
  ],
  categoryInfoTable: [{ categoryName: '미사용/항목' }],
};

async function upload(page: Page, data: unknown = backup) {
  await page.getByLabel('JSON 파일 선택', { exact: true }).setInputFiles({
    name: 'settings-test.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)),
  });
}

async function setMode(page: Page, label: '트리' | '개별 버튼') {
  await page.getByRole('button', { name: '설정', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '설정', exact: true });
  await dialog.getByText(label, { exact: true }).click();
  await expect(dialog.getByRole('radio', { name: label, exact: true })).toBeChecked();
  await dialog.getByRole('button', { name: '설정 닫기', exact: true }).click();
}

test('업로드 전 우측 상단 설정·키보드 선택·닫기와 새로고침 후 설정 보존', async ({ page }) => {
  await page.goto('/');
  const trigger = page.getByRole('button', { name: '설정', exact: true });
  const bounds = (await trigger.boundingBox())!;
  const header = (await page.locator('.site-header').boundingBox())!;
  expect(bounds.x + bounds.width).toBeCloseTo(header.x + header.width, 0);
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: '설정', exact: true });
  await expect(dialog.getByRole('radio', { name: '트리', exact: true })).toBeChecked();
  await expect(dialog.getByRole('radio', { name: '트리', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(dialog.getByRole('radio', { name: '개별 버튼', exact: true })).toBeChecked();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: '설정 닫기', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('radio', { name: '개별 버튼', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0); await expect(trigger).toBeFocused();
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  await page.reload(); await trigger.click();
  await expect(dialog.getByRole('radio', { name: '개별 버튼', exact: true })).toBeChecked();
  const legend = (await dialog.getByText('카테고리 선택 방식', { exact: true }).boundingBox())!;
  await page.mouse.move(legend.x + 5, legend.y + 5); await page.mouse.down();
  await page.mouse.move(1, 1, { steps: 10 }); await page.mouse.up();
  await expect(dialog).toBeVisible();
  await page.mouse.click(1, 1); await expect(dialog).toHaveCount(0);
});

test('개별 버튼의 전체 경로·그룹 구분선·다중 필터를 대시보드와 검색에 적용한다', async ({ page }) => {
  await page.goto('/'); await setMode(page, '개별 버튼'); await upload(page);
  const categories = page.getByRole('region', { name: '카테고리 필터', exact: true });
  const paths = backup.moneyTrackTable.filter(row => row.part === 'E').map(row => row.category);
  expect(new Set(await categories.locator('.category-buttons button').allTextContents())).toEqual(new Set(paths));
  await expect(categories.getByRole('button', { name: '식비', exact: true })).toHaveCount(0);
  await expect(categories.getByRole('button', { name: '미사용/항목', exact: true })).toHaveCount(0);
  await expect(categories.getByRole('separator')).toHaveCount(1);
  const groupStart = categories.locator('.category-group-start');
  await expect(groupStart.getByRole('separator')).toHaveAttribute('aria-orientation', 'vertical');
  await expect(groupStart.getByRole('button')).toHaveText('식비/식사1');
  await categories.getByRole('button', { name: '식비/식사1', exact: true }).click();
  await categories.getByRole('button', { name: '식비/식사3', exact: true }).click();
  await expect(categories.locator('.lucide-check')).toHaveCount(0);
  await expect(page.getByTestId('monthly-total')).toContainText('4,000원');
  await page.getByRole('region', { name: '태그 필터', exact: true }).getByRole('button', { name: '간식', exact: true }).click();
  await expect(page.getByTestId('daily-total')).toContainText('4,000원');
  await page.getByRole('button', { name: '검색', exact: true }).click();
  const search = page.getByRole('dialog', { name: '검색', exact: true });
  const searchCategories = search.getByRole('region', { name: '카테고리 필터', exact: true });
  await expect(searchCategories.locator('.category-buttons button')).toHaveCount(6);
  await expect(searchCategories.getByRole('button', { name: '수입/월급', exact: true })).toBeVisible();
  await searchCategories.getByRole('button', { name: '식비/식사2', exact: true }).click();
  await expect(searchCategories.locator('.lucide-check')).toHaveCount(0);
  await expect(search.getByRole('region', { name: '태그 필터' }).locator('.lucide-check')).toHaveCount(0);
  await expect(search.getByTestId('search-total-E')).toHaveText('2,000원');
  await search.getByRole('button', { name: '검색 닫기', exact: true }).click();
  await setMode(page, '트리');
  await expect(page.getByTestId('monthly-total')).toContainText('4,000원');
  await categories.getByRole('button', { name: '식비 펼치기', exact: true }).click();
  await expect(categories.getByRole('button', { name: '식비/식사1', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(categories.getByRole('button', { name: '식비/식사3', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '검색', exact: true }).click();
  await expect(searchCategories.getByRole('button', { name: '식비 펼치기', exact: true })).toBeVisible();
});

test('트리에서 선택한 상위 분류와 기간·월은 방식 전환 시 유지한다', async ({ page }) => {
  await page.goto('/'); await upload(page);
  const categories = page.getByRole('region', { name: '카테고리 필터', exact: true });
  await categories.getByRole('button', { name: '식비', exact: true }).click();
  await expect(categories.locator('.lucide-check')).toHaveCount(0);
  await setMonthlyPeriod(page,3);
  await selectDailyMonth(page,'2026-07');
  await setMode(page, '개별 버튼');
  await expect(categories.getByRole('button', { name: '식비', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('monthly-total')).toContainText('6,000원');
  await expect(page.getByRole('button', { name: '3개월', exact: true,includeHidden:true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('일별 조회 월')).toHaveValue('2026-07');
  await categories.getByRole('button', { name: '식비/식사1', exact: true }).click();
  await expect(page.getByTestId('monthly-total')).toContainText('6,000원');
  await categories.getByRole('button', { name: '식비', exact: true }).click();
  await expect(page.getByTestId('monthly-total')).toContainText('1,000원');
  await expect(categories.getByRole('button', { name: '식비', exact: true })).toHaveCount(0);
  await categories.getByRole('button', { name: '식비/식사1', exact: true }).click();
  await expect(categories.getByRole('button', { name: '전체', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('monthly-total')).toContainText('15,000원');
});

test('모바일의 긴 개별 버튼은 줄바꿈하고 설정은 파일 교체 후에도 유지한다', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/'); await setMode(page, '개별 버튼');
  const dialog = page.getByRole('dialog', { name: '설정', exact: true });
  await page.getByRole('button', { name: '설정', exact: true }).click();
  const bounds = (await dialog.boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  await page.keyboard.press('Escape');
  await upload(page, { moneyTrackTable: [
    ...backup.moneyTrackTable,
    { ...backup.moneyTrackTable[0], id: 90, category: '긴분류/' + '아주긴하위분류'.repeat(20) },
  ] });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const categories = page.getByRole('region', { name: '카테고리 필터', exact: true });
  expect(await categories.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await upload(page, { moneyTrackTable: [{ ...backup.moneyTrackTable[0], category: '새분류/새항목' }] });
  await expect(categories.locator('.category-buttons button')).toHaveText(['새분류/새항목']);
  await categories.getByRole('button', { name: '새분류/새항목', exact: true }).click();
  await expect(categories.locator('.lucide-check')).toHaveCount(0);
  await expect(page.getByRole('region', { name: '태그 필터' }).locator('.lucide-check')).toHaveCount(0);
  await page.getByRole('button', { name: '검색', exact: true }).click();
  const search = page.getByRole('dialog', { name: '검색', exact: true });
  await search.getByRole('button', { name: '카테고리별', exact: true }).click();
  await expect(search.locator('.category-buttons button')).toHaveText(['새분류/새항목']);
});

test('브라우저 저장소가 막혀도 기본 트리와 현재 페이지의 설정 변경은 동작한다', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('Storage unavailable'); };
    Storage.prototype.setItem = () => { throw new Error('Storage unavailable'); };
  });
  await page.goto('/'); await upload(page);
  const categories = page.getByRole('region', { name: '카테고리 필터', exact: true });
  await expect(categories.getByRole('button', { name: '식비 펼치기', exact: true })).toBeVisible();
  await setMode(page, '개별 버튼');
  await expect(categories.locator('.category-buttons button')).toHaveCount(5);
  expect(errors).toEqual([]);
});
