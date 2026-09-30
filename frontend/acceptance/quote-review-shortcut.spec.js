import { expect, test } from '@playwright/test';

const draft = {
  id: 'quote-new', quoteNumber: 7, status: 'DRAFT',
  client: { id: 'client-1', name: 'Cliente Exemplo', email: 'cliente@example.com', phone: '11999999999' },
  clientName: 'Cliente Exemplo', description: 'Troca de escapamento', pricingMode: 'FIXED_TOTAL',
  items: [{ id: 'item-1', position: 1, description: 'Escapamento', quantity: '1', unitPrice: null, subtotal: null }],
  totalAmount: '750.00', serviceDate: '2099-10-15',
  serviceAddress: { street: 'Rua Principal', number: '10', district: 'Centro', city: 'São Paulo', state: 'SP', postalCode: '01001-000' },
};

test('depois de salvar o rascunho, o prestador pode ir direto para a revisão', async ({ page }) => {
  await page.route('**/api/v1/quotes', (route) => route.fulfill({ status: 201, json: draft }));

  await page.goto('/acceptance/fixture.html?mode=quote-form');
  await expect(page.getByRole('button', { name: 'Revisar e confirmar orçamento' })).toHaveCount(0);
  await page.getByLabel('Cliente', { exact: true }).selectOption('client-1');
  await page.getByLabel('Descrição geral do serviço').fill('Troca de escapamento');
  await page.getByLabel('Descrição do item').fill('Escapamento');
  await page.getByLabel('Valor global do orçamento (R$)').fill('750');
  await page.getByLabel('Data do serviço').fill('2099-10-15');
  await page.getByRole('button', { name: 'Salvar rascunho' }).click();

  await page.getByRole('button', { name: 'Revisar e confirmar orçamento' }).click();
  await expect(page.locator('body')).toHaveAttribute('data-review-requested', 'quote-new');
});

test('a lista abre e destaca a revisão do rascunho recém-criado', async ({ page }) => {
  const olderDraft = { ...draft, id: 'quote-old', quoteNumber: 6 };
  await page.route('**/api/v1/quotes/search?*', (route) => route.fulfill({
    json: { items: [draft, olderDraft], total: 2, page: 1, pageSize: 20, totalPages: 1 },
  }));
  await page.route('**/api/v1/company', (route) => route.fulfill({
    json: { name: 'Empresa Exemplo', email: 'empresa@example.com', phone: '1133334444' },
  }));

  await page.goto('/acceptance/fixture.html?review=quote-new');

  const reviewedCard = page.locator('#quote-quote-new');
  await expect(reviewedCard).toHaveClass('quote-card-reviewing');
  await expect(reviewedCard.getByText('Em revisão')).toBeVisible();
  await expect(reviewedCard.getByRole('button', { name: 'Confirmar e gerar link' })).toBeVisible();
  await expect(page.locator('#quote-quote-old')).not.toHaveClass('quote-card-reviewing');
  await expect(page.getByText('Em revisão')).toHaveCount(1);
});
