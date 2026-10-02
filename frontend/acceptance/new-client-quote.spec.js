import { expect, test } from '@playwright/test';

test('depois de cadastrar um cliente, a lista oferece criar um orçamento para ele', async ({ page }) => {
  await page.route('**/api/v1/clients/search?*', (route) => route.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 } }));

  await page.goto('/acceptance/fixture.html?mode=clients-created');

  await expect(page.getByRole('status').filter({ hasText: 'Cliente Cliente Exemplo cadastrado.' })).toBeVisible();
  await page.getByRole('button', { name: 'Criar orçamento para Cliente Exemplo' }).click();
  await expect(page.locator('body')).toHaveAttribute('data-quote-for-client', 'client-1');
});

test('o orçamento aberto pelo atalho já vem com o cliente e o endereço preenchidos', async ({ page }) => {
  await page.goto('/acceptance/fixture.html?mode=quote-form&client=client-1');

  await expect(page.getByLabel('Cliente', { exact: true })).toHaveValue('client-1');
  await expect(page.getByLabel('Rua')).toHaveValue('Rua Principal');
  await expect(page.getByLabel('CEP')).toHaveValue('01001-000');
});

test('sem atalho, o orçamento novo começa sem cliente escolhido', async ({ page }) => {
  await page.goto('/acceptance/fixture.html?mode=quote-form');

  await expect(page.getByLabel('Cliente', { exact: true })).toHaveValue('');
});
