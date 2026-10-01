import { expect, test } from '@playwright/test';

const unreadNotifications = {
  unreadCount: 2,
  items: [
    { quoteId: 'q2', quoteNumber: 43, clientName: 'Maria', decision: 'REJECTED', rejectionReason: 'Valor acima do esperado', respondedAt: '2026-09-30T15:00:00.000Z', unread: true },
    { quoteId: 'q1', quoteNumber: 42, clientName: 'João', decision: 'ACCEPTED', rejectionReason: null, respondedAt: '2026-09-30T14:00:00.000Z', unread: true },
  ],
};

test('prestador vê as respostas novas e as marca como vistas', async ({ page }) => {
  let marked = false;
  await page.route('**/api/v1/notifications/responses', (route) => route.fulfill({
    json: marked
      ? { unreadCount: 0, items: unreadNotifications.items.map((item) => ({ ...item, unread: false })) }
      : unreadNotifications,
  }));
  await page.route('**/api/v1/notifications/responses/read', (route) => {
    marked = true;
    return route.fulfill({ status: 204 });
  });

  await page.goto('/acceptance/fixture.html?mode=notifications');

  const panel = page.getByRole('region', { name: /Respostas dos clientes/ });
  await expect(panel).toContainText('2 novas');
  await expect(panel.getByRole('listitem').nth(0)).toContainText('Maria recusou o orçamento nº 000043');
  await expect(panel.getByRole('listitem').nth(0)).toContainText('Motivo: Valor acima do esperado');
  await expect(panel.getByRole('listitem').nth(1)).toContainText('João aceitou o orçamento nº 000042');
  await expect(panel.getByText('Nova', { exact: true })).toHaveCount(2);

  await panel.getByRole('button', { name: 'Marcar como vistas' }).click();

  await expect(panel.getByText('Nova', { exact: true })).toHaveCount(0);
  await expect(panel).not.toContainText('novas');
  await expect(panel.getByRole('button', { name: 'Marcar como vistas' })).toHaveCount(0);

  await panel.getByRole('button', { name: 'Ver orçamentos' }).click();
  await expect(page.locator('body')).toHaveAttribute('data-opened-quotes', 'true');
});

test('sem respostas, o quadro não aparece', async ({ page }) => {
  await page.route('**/api/v1/notifications/responses', (route) => route.fulfill({ json: { unreadCount: 0, items: [] } }));

  await page.goto('/acceptance/fixture.html?mode=notifications');

  await expect(page.getByRole('heading', { name: /Respostas dos clientes/ })).toHaveCount(0);
});
