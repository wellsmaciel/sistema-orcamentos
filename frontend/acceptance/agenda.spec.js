import { expect, test } from '@playwright/test';

function buildService(quoteId, quoteNumber, serviceDate, clientName) {
  return {
    quoteId,
    quoteNumber,
    clientName,
    description: 'Instalação de 2 câmeras na entrada',
    totalAmount: '1410.00',
    serviceDate,
    serviceAddress: { street: 'Rua A', number: '10', complement: null, district: 'Centro', city: 'São Paulo', state: 'SP', postalCode: '01001-000' },
  };
}

test('a tela inicial mostra os próximos serviços em ordem, com hoje em destaque e os atalhos', async ({ page }) => {
  await page.route('**/api/v1/agenda', (route) => route.fulfill({
    json: {
      today: '2026-10-15',
      total: 7,
      items: [
        buildService('q1', 41, '2026-10-15', 'Rafael Varjão'),
        buildService('q2', 42, '2026-10-16', 'Fernanda'),
        buildService('q3', 43, '2026-10-21', 'Maria'),
      ],
    },
  }));

  await page.goto('/acceptance/fixture.html?mode=agenda');

  const agenda = page.getByRole('region', { name: 'Próximos serviços' });
  const items = agenda.getByRole('listitem');
  await expect(items).toHaveCount(3);
  await expect(items.nth(0)).toContainText('Hoje — Rafael Varjão — Instalação de 2 câmeras na entrada — R$ 1.410,00');
  await expect(items.nth(1)).toContainText('Amanhã — Fernanda');
  await expect(items.nth(2)).toContainText('quarta-feira, 21/10 — Maria');
  await expect(agenda.getByText('E mais 4 serviços agendados.')).toBeVisible();

  const calendarLink = items.nth(0).getByRole('link', { name: /Adicionar ao Google Agenda: serviço de Rafael Varjão, Hoje/ });
  await expect(calendarLink).toHaveAttribute('target', '_blank');
  await expect(calendarLink).toHaveAttribute('href', /^https:\/\/calendar\.google\.com\/calendar\/render\?action=TEMPLATE&.*dates=20261015%2F20261016/);

  await items.nth(1).getByRole('button', { name: 'Abrir orçamento nº 000042' }).click();
  await expect(page.locator('body')).toHaveAttribute('data-opened-quote', 'q2:42');
});

test('sem serviços agendados, o quadro explica o que vai aparecer ali', async ({ page }) => {
  await page.route('**/api/v1/agenda', (route) => route.fulfill({ json: { today: '2026-10-15', total: 0, items: [] } }));

  await page.goto('/acceptance/fixture.html?mode=agenda');

  await expect(page.getByRole('region', { name: 'Próximos serviços' })).toContainText(
    'Nenhum serviço agendado. Quando um cliente aceitar um orçamento, o serviço aparece aqui pela data prevista.',
  );
});
