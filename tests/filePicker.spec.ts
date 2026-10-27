import { expect, test } from '@playwright/test';

const backup = { moneyTrackTable: [{ id: 1, part: 'E', category: '식비', amount: 300, tags: [], dateKey: '2026-10-01' }] };
const file = { name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) };

test('사이트 전용 고정 ID로 JSON 선택창을 열고 새로고침 후에도 같은 ID를 사용한다', async ({ page }) => {
  await page.addInitScript(data => {
    const requests: unknown[] = [];
    Object.defineProperty(window, 'moneyLogPickerRequests', { value: requests });
    Object.defineProperty(window, 'showOpenFilePicker', { configurable: true, value: async (options: unknown) => {
      requests.push(options);
      return [{ getFile: async () => new File([JSON.stringify(data)], 'native-backup.json', { type: 'application/json' }) }];
    } });
  }, backup);
  await page.goto('/');
  await page.getByRole('button', { name: 'JSON 파일 선택', exact: true }).click();
  await expect(page.getByTestId('monthly-total')).toContainText('300원');
  await expect(page.getByRole('heading', { name: 'native-backup.json', exact: true })).toBeVisible();
  const [first] = await page.evaluate(() => Reflect.get(window, 'moneyLogPickerRequests'));
  expect(first).toEqual({
    id: 'moneylog-json-backup', multiple: false, excludeAcceptAllOption: true,
    types: [{ description: 'MoneyLog JSON 백업', accept: { 'application/json': ['.json'] } }],
  });
  await page.getByRole('button', { name: '다른 파일 선택', exact: true }).click();
  await expect.poll(() => page.evaluate(() => Reflect.get(window, 'moneyLogPickerRequests').length)).toBe(2);
  await page.reload();
  await page.getByRole('button', { name: 'JSON 파일 선택', exact: true }).click();
  await expect(page.getByTestId('monthly-total')).toContainText('300원');
  const [afterReload] = await page.evaluate(() => Reflect.get(window, 'moneyLogPickerRequests'));
  expect(afterReload.id).toBe(first.id);
});

for (const mode of ['unsupported', 'blocked']) {
  test(`${mode}: 기본 파일 선택창으로 업로드할 수 있다`, async ({ page }) => {
    await page.addInitScript(mode => {
      Object.defineProperty(window, 'showOpenFilePicker', { configurable: true, value: mode === 'unsupported' ? undefined : async () => { throw new DOMException('blocked', 'SecurityError'); } });
    }, mode);
    await page.goto('/');
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: 'JSON 파일 선택', exact: true }).click(),
    ]);
    await chooser.setFiles(file);
    await expect(page.getByTestId('monthly-total')).toContainText('300원');
  });
}

test('선택 취소는 다른 선택창을 열거나 기존 데이터를 지우지 않으며 읽기 오류에서 복구한다', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('JSON 파일 선택', { exact: true }).setInputFiles(file);
  let fallbackOpened = false;
  page.on('filechooser', () => { fallbackOpened = true; });
  await page.evaluate(() => Object.defineProperty(window, 'showOpenFilePicker', { configurable: true, value: async () => { throw new DOMException('cancelled', 'AbortError'); } }));
  const button = page.getByRole('button', { name: '다른 파일 선택', exact: true });
  await button.click(); await expect(button).toBeEnabled();
  await expect(page.getByTestId('monthly-total')).toContainText('300원');
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(fallbackOpened).toBe(false);
  await page.evaluate(() => Object.defineProperty(window, 'showOpenFilePicker', { configurable: true, value: async () => [{ getFile: async () => { throw new DOMException('missing', 'NotReadableError'); } }] }));
  await button.click();
  await expect(page.getByRole('alert')).toContainText('파일을 열 수 없습니다.');
  await expect(page.getByTestId('monthly-total')).toContainText('300원');
  await page.evaluate(data => Object.defineProperty(window, 'showOpenFilePicker', { configurable: true, value: async () => [{ getFile: async () => new File([JSON.stringify(data)], 'recovered.json', { type: 'application/json' }) }] }), backup);
  await button.click();
  await expect(page.getByRole('heading', { name: 'recovered.json', exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});
