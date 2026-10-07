import { expect, test } from '@playwright/test';

test.describe('no celular', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('a dica de ditado começa recolhida e abre ao tocar', async ({ page }) => {
    await page.goto('/acceptance/fixture.html?mode=quote-form&client=client-1');

    const summary = page.getByText('Dica: ditar a descrição pelo celular');
    const steps = page.getByText('Ajustes > Geral > Teclado > Ditado');
    await expect(summary).toBeVisible();
    await expect(steps).toBeHidden();

    await summary.tap();
    await expect(steps).toBeVisible();
    await expect(page.getByText('Android:')).toBeVisible();

    await summary.tap();
    await expect(steps).toBeHidden();
  });
});

test('no computador a dica de ditado não aparece', async ({ page }) => {
  await page.goto('/acceptance/fixture.html?mode=quote-form&client=client-1');

  await expect(page.getByLabel('Descrição geral do serviço')).toBeVisible();
  await expect(page.getByText('Dica: ditar a descrição pelo celular')).toBeHidden();
});
