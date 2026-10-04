import { expect, test } from '@playwright/test';

function buildQuote(overrides) {
  return {
    id: 'quote-sent', quoteNumber: 42, status: 'SENT', publicToken: 'token-123',
    client: { id: 'client-1', name: 'Maria', email: 'maria@example.com', phone: '(11) 99999-8888' },
    provider: { name: 'Oficina do Rafael', email: 'oficina@example.com', phone: '1133334444' },
    clientName: 'Maria', description: 'Troca de escapamento', pricingMode: 'FIXED_TOTAL',
    items: [{ id: 'item-1', position: 1, description: 'Escapamento', quantity: '1', unitPrice: null, subtotal: null }],
    totalAmount: '750.00', serviceDate: '2099-10-15',
    serviceAddress: { street: 'Rua Principal', number: '10', district: 'Centro', city: 'São Paulo', state: 'SP', postalCode: '01001-000' },
    ...overrides,
  };
}

test('orçamento enviado pode ser compartilhado pelo WhatsApp ou por e-mail', async ({ page }) => {
  const quotes = [
    buildQuote(),
    buildQuote({ id: 'quote-accepted', quoteNumber: 41, status: 'ACCEPTED', publicToken: 'token-accepted' }),
    buildQuote({ id: 'quote-no-phone', quoteNumber: 40, publicToken: 'token-no-phone', client: { id: 'client-2', name: 'João', email: 'joao@example.com', phone: '123' } }),
    buildQuote({ id: 'quote-landline', quoteNumber: 39, publicToken: 'token-landline', client: { id: 'client-3', name: 'Ana', email: 'ana@example.com', phone: '(11) 3333-4444' } }),
  ];
  await page.route('**/api/v1/quotes/search?*', (route) => route.fulfill({ json: { items: quotes, total: 4, page: 1, pageSize: 20, totalPages: 1 } }));

  await page.goto('/acceptance/fixture.html');

  const sentCard = page.locator('article').filter({ hasText: 'Orçamento nº 000042' });
  const whatsApp = new URL(await sentCard.getByRole('link', { name: 'Enviar pelo WhatsApp' }).getAttribute('href'));
  expect(whatsApp.origin + whatsApp.pathname).toBe('https://wa.me/5511999998888');
  expect(whatsApp.searchParams.get('text')).toContain('Olá, Maria!');
  expect(whatsApp.searchParams.get('text')).toContain('Segue o orçamento nº 000042 de Oficina do Rafael.');
  expect(whatsApp.searchParams.get('text')).toContain('Serviço: Troca de escapamento');
  expect(whatsApp.searchParams.get('text')).toContain('?quote=token-123');

  const email = await sentCard.getByRole('link', { name: 'Enviar por e-mail' }).getAttribute('href');
  expect(email).toMatch(/^mailto:maria@example\.com\?subject=/);

  const acceptedCard = page.locator('article').filter({ hasText: 'Orçamento nº 000041' });
  await expect(acceptedCard.getByRole('button', { name: 'Copiar link' })).toBeVisible();
  await expect(acceptedCard.getByRole('link', { name: /Enviar/ })).toHaveCount(0);

  const noPhoneCard = page.locator('article').filter({ hasText: 'Orçamento nº 000040' });
  await expect(noPhoneCard.getByRole('link', { name: 'Enviar pelo WhatsApp' })).toHaveCount(0);
  await expect(noPhoneCard.getByRole('link', { name: 'Enviar por e-mail' })).toBeVisible();
  await expect(noPhoneCard.getByText(/só fica disponível quando o telefone do cliente é celular/)).toBeVisible();
  await expect(sentCard.getByText(/só fica disponível quando o telefone do cliente é celular/)).toHaveCount(0);

  // Telefone fixo é válido no cadastro, mas não tem WhatsApp: o botão não aparece e a dica explica o motivo.
  const landlineCard = page.locator('article').filter({ hasText: 'Orçamento nº 000039' });
  await expect(landlineCard.getByRole('link', { name: 'Enviar pelo WhatsApp' })).toHaveCount(0);
  await expect(landlineCard.getByRole('link', { name: 'Enviar por e-mail' })).toBeVisible();
  await expect(landlineCard.getByText(/só fica disponível quando o telefone do cliente é celular/)).toBeVisible();
});
