import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('AC5/AC10: home is well formed, script-free and accessible', async ({
  page,
}) => {
  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('script')).toHaveCount(0);
  await expect(page.getByText('DevOps em um mundo com IA')).toBeVisible();

  const { violations } = await new AxeBuilder({ page }).analyze();
  const blocking = violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  expect(blocking).toEqual([]);
});

test('AC11: a trailing slash does not serve a duplicate page', async ({
  request,
}) => {
  const response = await request.get('/?x=1', { maxRedirects: 0 });
  expect(response.status()).toBe(200);
  const slashed = await request.get('/blog/', { maxRedirects: 0 });
  expect(slashed.status()).not.toBe(200);
});
