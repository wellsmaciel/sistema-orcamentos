import { expect, test } from '@playwright/test';

test('depois de salvar o rascunho, mostra o resumo em vez de campos vazios e vermelhos', async ({ page }) => {
  await page.route('**/api/v1/quotes', (route) => {
    const body = route.request().postDataJSON();
    return route.fulfill({
      status: 201,
      json: {
        ...body,
        id: 'quote-new',
        quoteNumber: 7,
        status: 'DRAFT',
        client: { id: 'client-1', name: 'Maria' },
        items: [{ id: 'item-1', position: 1, description: 'Placa-mãe 870X', quantity: '1', unitPrice: null, subtotal: null }],
      },
    });
  });

  await page.goto('/acceptance/fixture.html?mode=quote-form&client=client-1');
  await page.getByLabel('Forma de cobrança').selectOption('FIXED_TOTAL');
  await page.getByLabel('Descrição geral do serviço').fill('Montagem de computador');
  await page.getByLabel('Descrição do item').fill('Placa-mãe 870X');
  await page.getByLabel('Valor global do orçamento (R$)').fill('2.350,00');
  await page.getByLabel('Data do serviço').fill('2099-10-15');
  await page.getByRole('button', { name: 'Salvar rascunho' }).click();

  const heading = page.getByRole('heading', { name: 'Rascunho salvo' });
  await expect(heading).toBeFocused();
  await expect(page.getByRole('status')).toContainText('Orçamento nº 000007 criado com sucesso.');
  await expect(page.getByText('Situação: Rascunho')).toBeVisible();
  await expect(page.getByText('DRAFT')).toHaveCount(0);
  await expect(page.getByRole('textbox')).toHaveCount(0);

  await page.getByRole('button', { name: 'Criar outro orçamento' }).click();
  await expect(page.getByRole('heading', { name: 'Novo orçamento' })).toBeVisible();
  await expect(page.getByLabel('Descrição geral do serviço')).toHaveValue('');
  await expect(page.locator(':is([aria-invalid="true"], :user-invalid)')).toHaveCount(0);
});
