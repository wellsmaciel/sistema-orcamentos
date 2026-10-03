import { expect, test } from '@playwright/test';

for (const [pricingMode, field, typed, expected] of [
  ['ITEMIZED', 'Preço unitário (R$)', '1.200,50', { unitPrice: '1200.50' }],
  ['FIXED_TOTAL', 'Valor global do orçamento (R$)', 'R$ 2.350,00', { totalAmount: '2350.00' }],
]) {
  test(`aceita "${typed}" no modo ${pricingMode}`, async ({ page }) => {
    let submittedBody;
    await page.route('**/api/v1/quotes', (route) => {
      submittedBody = route.request().postDataJSON();
      return route.fulfill({
        status: 201,
        json: { ...submittedBody, id: 'quote-new', quoteNumber: 7, status: 'DRAFT', totalAmount: submittedBody.totalAmount ?? '1200.50', items: [] },
      });
    });

    await page.goto('/acceptance/fixture.html?mode=quote-form&client=client-1');
    await page.getByLabel('Forma de cobrança').selectOption(pricingMode);
    await page.getByLabel('Descrição geral do serviço').fill('Montagem de computador');
    await page.getByLabel('Descrição do item').fill('Placa-mãe 870X');
    await page.getByLabel(field).fill(typed);
    if (pricingMode === 'ITEMIZED') {
      await expect(page.getByText('R$ 1.200,50').first()).toBeVisible();
    }
    await page.getByLabel('Data do serviço').fill('2099-10-15');
    await page.getByRole('button', { name: 'Salvar rascunho' }).click();

    await expect(page.getByText('Orçamento criado com sucesso.')).toBeVisible();
    if (expected.unitPrice) {
      expect(submittedBody.items[0].unitPrice).toBe(expected.unitPrice);
    } else {
      expect(submittedBody.totalAmount).toBe(expected.totalAmount);
    }
  });
}
