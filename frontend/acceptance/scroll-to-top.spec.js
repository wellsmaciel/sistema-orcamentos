import { expect, test } from '@playwright/test';

test('ao trocar de tela, a página volta para o topo', async ({ page }) => {
  await page.goto('/acceptance/fixture.html?mode=scroll');

  const button = page.getByRole('button', { name: 'Trocar de tela' });
  await button.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(1000);

  await button.click();

  await expect(page.getByRole('heading', { name: 'Tela: edição' })).toBeInViewport();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});
