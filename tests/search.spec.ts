import { expect, test, type Page } from '@playwright/test';

const backup = {
  moneyTrackTable: [
    { id: 1, part: 'E', category: '식비/편의점', amount: 1000, memo: '라면', tags: ['식비', '간식'], dateKey: '2026-07-07' },
    { id: 2, part: 'E', category: '식비/배달', amount: 2000, memo: '매운 라면', tags: ['식비', '밤'], dateKey: '2026-07-08' },
    { id: 3, part: 'R', category: '수입/환급', amount: 500, memo: '라면 환급', tags: ['식비', '환급'], dateKey: '2026-08-02' },
    { id: 4, part: 'D', category: '저축/적금', amount: 3000, memo: '라면 저축', tags: ['식비'], dateKey: '2026-08-03' },
    { id: 5, part: 'O', category: '기록', amount: 10, memo: '라면 기록', tags: ['식비'], dateKey: '2026-08-04' },
    { id: 6, part: 'E', category: '교통비', amount: 700, memo: '택시', tags: ['이동'], dateKey: '2026-08-04' },
    { id: 7, part: 'E', category: '생활', amount: 400, memo: '하루', tags: ['라면'], dateKey: '2026-08-04' },
    { id: 8, part: 'E', category: '식비/편의점', amount: 1500, memo: '컵라면', tags: ['식비', '간식'], dateKey: '2026-07-08' },
    { id: 9, part: 'E', category: '식비', amount: 100, memo: 'RAMEN\nDinner', tags: [], dateKey: '2026-08-04' },
  ],
  categoryInfoTable: [{ categoryName: '미사용 분류' }],
  tagInfoTable: [{ tagName: '미사용 태그' }],
};

async function upload(page: Page, data: unknown = backup) {
  await page.getByLabel('JSON 파일 선택', { exact: true }).setInputFiles({
    name: 'search-test.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)),
  });
}

test('검색 버튼 위치, 실시간 메모 검색과 유형별 합계·색상·결과 형식', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  const trigger = page.getByRole('button', { name: '검색', exact: true });
  await expect(trigger).toBeDisabled();
  await upload(page);
  const searchBounds = (await trigger.boundingBox())!;
  const partsBounds = (await page.getByRole('group', { name: '거래 유형' }).boundingBox())!;
  expect(searchBounds.x + searchBounds.width).toBeLessThan(partsBounds.x);
  await page.getByRole('group', { name: '거래 유형' }).getByRole('button', { name: '저축', exact: true }).click();
  await page.getByRole('region', { name: '카테고리 필터' }).getByRole('button', { name: '저축', exact: true }).click();
  await page.getByRole('button', { name: '3개월', exact: true }).click();
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: '검색', exact: true });
  const input = dialog.getByRole('searchbox', { name: '메모 검색' });
  await expect(input).toBeFocused();
  const viewport = page.viewportSize()!;
  const dialogBounds = (await dialog.boundingBox())!;
  expect(dialogBounds.width).toBeCloseTo(Math.min(1360, viewport.width - 48) * .7, 0);
  expect(dialogBounds.height).toBeCloseTo(Math.min(820, viewport.height - 48) * .7, 0);
  await expect(dialog.getByRole('listitem')).toHaveCount(9);
  await input.fill('라면');
  await expect(dialog.getByRole('listitem')).toHaveCount(6);
  for (const [part, amount, color] of [
    ['R', '500원', 'rgb(37, 99, 206)'], ['E', '4,500원', 'rgb(200, 63, 72)'],
    ['D', '3,000원', 'rgb(35, 134, 74)'], ['O', '10원', 'rgb(126, 132, 144)'],
  ]) {
    await expect(dialog.getByTestId(`search-total-${part}`)).toHaveText(amount);
    await expect(dialog.getByTestId(`search-total-${part}`)).toHaveCSS('color', color);
  }
  await expect(dialog.locator('.search-totals>div>span')).toHaveText(['수입', '지출', '저축', '기록']);
  const example = dialog.getByRole('listitem').filter({ has: page.locator('time[datetime="2026-07-07"]') });
  await expect(example.locator('dd')).toHaveText(['2026-07-07(화)', '1,000원', '라면', '식비/편의점', '식비간식']);
  await expect(dialog.locator('.search-result time').first()).toHaveText('2026-08-04(화)');
  await input.fill('RAMen');
  await expect(dialog.getByRole('listitem')).toHaveCount(1);
  await expect(dialog.locator('.search-result-memo')).toHaveText('RAMEN\nDinner');
  await input.fill('없는 검색어');
  await expect(dialog.getByText('검색 결과가 없습니다.', { exact: true })).toBeVisible();
  await expect(dialog.locator('.search-totals strong')).toHaveText(['0원', '0원', '0원', '0원']);
  await input.fill('');
  await expect(dialog.getByRole('listitem')).toHaveCount(9);
  await dialog.getByRole('button', { name: '검색 닫기' }).click();
  await expect(page.getByTestId('monthly-total')).toContainText('3,000원');
  await expect(page.getByRole('button', { name: '3개월', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(errors).toEqual([]);
});

test('접는 검색 필터의 계층·OR/AND·전체 선택과 접은 후 선택 유지', async ({ page }) => {
  await page.goto('/'); await upload(page);
  await page.getByRole('button', { name: '검색', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '검색', exact: true });
  await dialog.getByRole('searchbox').fill('라면');
  const categoryToggle = dialog.getByRole('button', { name: /^카테고리별/ });
  const tagToggle = dialog.getByRole('button', { name: /^태그별/ });
  const categories = dialog.getByRole('region', { name: '카테고리 필터' });
  const tags = dialog.getByRole('region', { name: '태그 필터' });
  await expect(categoryToggle).toHaveAttribute('aria-expanded', 'false');
  await expect(tagToggle).toHaveAttribute('aria-expanded', 'false');
  await categoryToggle.click(); await tagToggle.click();
  await expect(categories.getByRole('button', { name: '미사용 분류', exact: true })).toHaveCount(0);
  await expect(tags.getByRole('button', { name: '미사용 태그', exact: true })).toHaveCount(0);
  await categories.getByRole('button', { name: '식비', exact: true }).click();
  await categories.getByRole('button', { name: '수입', exact: true }).click();
  await expect(dialog.getByRole('listitem')).toHaveCount(4);
  await tags.getByRole('button', { name: '간식', exact: true }).click();
  await tags.getByRole('button', { name: '환급', exact: true }).click();
  await expect(dialog.getByRole('listitem')).toHaveCount(3);
  await expect(dialog.getByTestId('search-total-E')).toHaveText('2,500원');
  await expect(dialog.getByTestId('search-total-R')).toHaveText('500원');
  await tags.getByRole('button', { name: '식비', exact: true }).click();
  await expect(dialog.getByTestId('search-total-E')).toHaveText('4,500원');
  await categoryToggle.click(); await tagToggle.click();
  await expect(categoryToggle).toHaveAttribute('aria-expanded', 'false');
  await expect(dialog.getByRole('listitem')).toHaveCount(4);
  await categoryToggle.click(); await tagToggle.click();
  await categories.getByRole('button', { name: '식비 펼치기', exact: true }).click();
  await categories.getByRole('button', { name: '전체', exact: true }).click();
  await categories.getByRole('button', { name: '식비/편의점', exact: true }).click();
  await expect(dialog.getByRole('listitem')).toHaveCount(2);
  await categories.getByRole('button', { name: '식비/편의점', exact: true }).click();
  await expect(categories.getByRole('button', { name: '전체', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await tags.getByRole('button', { name: '전체', exact: true }).click();
  await expect(dialog.getByRole('listitem')).toHaveCount(6);
});

test('키보드 포커스·Escape·바깥 클릭과 파일 교체 후 검색 초기화', async ({ page }) => {
  await page.goto('/'); await upload(page);
  const trigger = page.getByRole('button', { name: '검색', exact: true });
  const dialog = page.getByRole('dialog', { name: '검색', exact: true });
  await trigger.click();
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0); await expect(trigger).toBeFocused();
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  await trigger.click(); await page.mouse.click(1, 1);
  await expect(dialog).toHaveCount(0); await expect(trigger).toBeFocused();
  await upload(page, { moneyTrackTable: [{ id: 90, part: 'R', category: '새분류', amount: 77, memo: '새파일', tags: ['새태그'], dateKey: '2024-02-29' }] });
  await trigger.click();
  await expect(dialog.getByRole('searchbox')).toHaveValue('');
  await expect(dialog.getByRole('listitem')).toHaveCount(1);
  await expect(dialog.getByTestId('search-total-R')).toHaveText('77원');
  await dialog.getByRole('searchbox').fill('라면');
  await expect(dialog.getByRole('listitem')).toHaveCount(0);
});

test('모바일에서 긴 검색 결과와 많은 항목은 팝업 안에서 스크롤한다', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await upload(page, { moneyTrackTable: Array.from({ length: 100 }, (_, index) => ({
    id: index, part: 'E', category: '식비/' + '긴분류'.repeat(20), amount: 1000,
    memo: index === 0 ? '유일한메모' : '라면\n' + '긴메모'.repeat(30), tags: ['긴태그'.repeat(30)], dateKey: '2026-07-07',
  })) });
  await page.getByRole('button', { name: '검색', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '검색', exact: true });
  const results = dialog.getByRole('list', { name: '검색 결과', exact: true });
  await expect(dialog.getByRole('listitem')).toHaveCount(100);
  expect(await results.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);
  await results.evaluate(element => { element.scrollTop = element.scrollHeight; });
  await expect.poll(() => results.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  await dialog.getByRole('button', { name: /^카테고리별/ }).click();
  await dialog.getByRole('button', { name: /^태그별/ }).click();
  await dialog.getByRole('region', { name: '카테고리 필터' }).getByRole('button', { name: '식비 펼치기', exact: true }).click();
  expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const bounds = (await dialog.boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  await dialog.getByRole('searchbox').fill('유일한메모');
  await expect(dialog.getByRole('listitem')).toHaveCount(1);
  await expect.poll(() => results.evaluate(element => element.scrollTop)).toBe(0);
});

test('안에서 시작한 선택·드래그는 바깥에서 끝내도 검색 팝업을 닫지 않는다', async ({ page }) => {
  await page.goto('/'); await upload(page);
  await page.getByRole('button', { name: '검색', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '검색', exact: true });
  const input = dialog.getByRole('searchbox');
  await input.fill('라면');
  const inputBounds = (await input.boundingBox())!;
  await page.mouse.move(inputBounds.x + 20, inputBounds.y + inputBounds.height / 2);
  await page.mouse.down(); await page.mouse.move(1, 1, { steps: 10 }); await page.mouse.up();
  await expect(dialog).toBeVisible();
  await expect(input).toHaveValue('라면');
  const memo = dialog.locator('.memo-preview').first();
  const memoBounds = (await memo.boundingBox())!;
  await page.mouse.move(memoBounds.x + 8, memoBounds.y + memoBounds.height / 2);
  await page.mouse.down(); await page.mouse.move(1, 1, { steps: 10 }); await page.mouse.up();
  await expect(dialog).toBeVisible();
  await page.mouse.move(1, 1); await page.mouse.down();
  await page.mouse.move(inputBounds.x + 30, inputBounds.y + inputBounds.height / 2, { steps: 10 }); await page.mouse.up();
  await expect(dialog).toBeVisible();
  await page.mouse.click(1, 1);
  await expect(dialog).toHaveCount(0);
});

test('합계와 결과 블록은 좁게 가운데 배치하고 금액·메모 너비를 통일한다', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/'); await upload(page);
  await page.getByRole('button', { name: '검색', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '검색', exact: true });
  expect((await dialog.boundingBox())!.width).toBeCloseTo(952, 0);
  expect((await dialog.boundingBox())!.height).toBeCloseTo(574, 0);
  const totals = dialog.locator('.search-totals');
  const amounts = dialog.locator('.search-totals strong');
  const width = (await amounts.first().boundingBox())!.width;
  expect(width).toBeLessThan(110);
  for (const amount of await amounts.all()) expect((await amount.boundingBox())!.width).toBeCloseTo(width, 0);
  for (const amount of await dialog.locator('.search-result-amount dd').all()) expect((await amount.boundingBox())!.width).toBeCloseTo(width, 0);
  expect(await totals.evaluate(element => {
    const children = [...element.children].map(child => child.getBoundingClientRect());
    const bounds = element.getBoundingClientRect();
    return Math.abs((children[0].left + children.at(-1)!.right) / 2 - (bounds.left + bounds.right) / 2) < 1;
  })).toBe(true);
  const listBounds = (await dialog.getByRole('list', { name: '검색 결과', exact: true }).boundingBox())!;
  const rowBounds = (await dialog.locator('.search-result').first().boundingBox())!;
  expect(rowBounds.width).toBeLessThan(listBounds.width - 80);
  expect(rowBounds.x + rowBounds.width / 2).toBeCloseTo(listBounds.x + listBounds.width / 2, 0);
  const memoWidths = await dialog.locator('.memo-preview').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().width));
  expect(memoWidths.every(value => Math.abs(value - memoWidths[0]) < 1)).toBe(true);
});

test('긴 메모는 말줄임·음영·오른쪽 위 전체 내용 팝업과 독립적인 닫기를 지원한다', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  const memo = '아주 긴 메모 '.repeat(15) + '\n두 번째 줄\n마지막 내용';
  await upload(page, { moneyTrackTable: [
    { ...backup.moneyTrackTable[0], memo, dateKey: '2026-08-04' },
    { ...backup.moneyTrackTable[1], memo: '짧은 메모', dateKey: '2026-08-03' },
  ] });
  await page.getByRole('button', { name: '검색', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '검색', exact: true });
  const trigger = dialog.locator('.memo-preview').first();
  await expect(trigger).toHaveCSS('text-overflow', 'ellipsis');
  expect(await trigger.evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true);
  const background = await trigger.evaluate(element => getComputedStyle(element).backgroundColor);
  await trigger.hover();
  await expect(trigger).not.toHaveCSS('background-color', background);
  await trigger.click();
  const popup = page.getByRole('dialog', { name: '메모 전체 내용', exact: true });
  await expect(popup.locator('.memo-full-text')).toHaveText(memo);
  const triggerBounds = (await trigger.boundingBox())!, popupBounds = (await popup.boundingBox())!;
  expect(popupBounds.x).toBeGreaterThan(triggerBounds.x + triggerBounds.width);
  expect(popupBounds.y + popupBounds.height).toBeLessThan(triggerBounds.y);
  const text = (await popup.locator('.memo-full-text').boundingBox())!;
  await page.mouse.move(text.x + 8, text.y + 8); await page.mouse.down();
  await page.mouse.move(1, 1, { steps: 10 }); await page.mouse.up();
  await expect(dialog).toBeVisible();
  await page.evaluate(() => getSelection()?.removeAllRanges());
  if (!await popup.count()) await trigger.click();
  await page.keyboard.press('Escape');
  await expect(popup).toHaveCount(0); await expect(dialog).toBeVisible();
  await trigger.focus(); await page.keyboard.press('Enter');
  await expect(popup).toBeVisible();
  await popup.getByRole('button', { name: '메모 닫기', exact: true }).click();
  await expect(popup).toHaveCount(0); await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.locator('.memo-preview').nth(1).click();
  await expect(popup).toHaveCount(1);
  await expect(popup.locator('.memo-full-text')).toHaveText('짧은 메모');
  await dialog.getByRole('searchbox').fill('없는 검색어');
  await expect(popup).toHaveCount(0); await expect(dialog.getByRole('listitem')).toHaveCount(0);
});

test('모바일의 메모 팝업은 화면 안에 표시하고 결과 스크롤 시 닫는다', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await upload(page, { moneyTrackTable: Array.from({ length: 50 }, (_, index) => ({
    ...backup.moneyTrackTable[0], id: index, memo: '긴 메모 '.repeat(30) + '\n마지막 줄',
  })) });
  await page.getByRole('button', { name: '검색', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '검색', exact: true });
  await dialog.locator('.memo-preview').first().click();
  const popup = page.getByRole('dialog', { name: '메모 전체 내용', exact: true });
  await expect(popup).toBeVisible();
  const bounds = (await popup.boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  expect(bounds.y).toBeGreaterThanOrEqual(0); expect(bounds.y + bounds.height).toBeLessThanOrEqual(844);
  expect(await popup.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await dialog.getByRole('list', { name: '검색 결과', exact: true }).evaluate(element => { element.scrollTop = element.scrollHeight; });
  await expect(popup).toHaveCount(0); await expect(dialog).toBeVisible();
});
