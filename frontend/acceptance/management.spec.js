import { expect, test } from '@playwright/test';

const monthSummary = {
  period: 'month', periodStart: '2026-10-01T03:00:00.000Z', totalQuotes: 6,
  statusCounts: { DRAFT: 1, SENT: 2, ACCEPTED: 2, REJECTED: 1 },
  acceptanceRate: 0.6667, acceptedAmount: '1500.50', openAmount: '500.00', averageResponseHours: 12,
  awaitingResponse: [
    { quoteId: 'q1', quoteNumber: 41, clientName: 'Maria', totalAmount: '300.00', sentAt: '2026-10-03T13:00:00.000Z', daysWaiting: 12 },
  ],
  topClients: [
    { clientId: 'c1', clientName: 'Maria', acceptedCount: 1, acceptedAmount: '1000.00' },
    { clientId: 'c2', clientName: 'João', acceptedCount: 2, acceptedAmount: '500.50' },
  ],
};

const emptySummary = {
  period: 'all', periodStart: null, totalQuotes: 0,
  statusCounts: { DRAFT: 0, SENT: 0, ACCEPTED: 0, REJECTED: 0 },
  acceptanceRate: null, acceptedAmount: '0.00', openAmount: '0.00', averageResponseHours: null,
  awaitingResponse: [], topClients: [],
};

test('prestador acompanha os indicadores do período e troca o período', async ({ page }) => {
  const requestedPeriods = [];
  await page.route('**/api/v1/management/summary?*', (route) => {
    const period = new URL(route.request().url()).searchParams.get('period');
    requestedPeriods.push(period);
    return route.fulfill({ json: period === 'all' ? emptySummary : monthSummary });
  });

  await page.goto('/acceptance/fixture.html?mode=management');

  const cards = page.getByRole('list', { name: 'Indicadores do período' });
  await expect(cards).toContainText('Orçamentos criados6');
  await expect(cards).toContainText('Taxa de aceite67%');
  await expect(cards).toContainText('Valor aceitoR$ 1.500,50');
  await expect(cards).toContainText('Valor em abertoR$ 500,00');
  await expect(cards).toContainText('Tempo médio de resposta do cliente12 horas');
  await expect(page.getByText('Aguardando resposta: 2')).toBeVisible();
  await expect(page.getByText('Orçamento nº 000041 — Maria — R$ 300,00 — há 12 dias')).toBeVisible();
  await expect(page.getByText('João — R$ 500,50 (2 orçamentos aceitos)')).toBeVisible();

  await page.getByLabel('Período', { exact: true }).selectOption('all');

  await expect(cards).toContainText('Taxa de aceiteSem respostas');
  await expect(page.getByText('Nenhum orçamento aguardando resposta.')).toBeVisible();
  await expect(page.getByText('Nenhum orçamento aceito no período.')).toBeVisible();
  expect(requestedPeriods).toEqual(['month', 'all']);
});

test('falha ao carregar os indicadores permite tentar novamente', async ({ page }) => {
  let attempts = 0;
  await page.route('**/api/v1/management/summary?*', (route) => {
    attempts += 1;
    return attempts === 1
      ? route.fulfill({ status: 500, json: { code: 'INTERNAL_SERVER_ERROR', message: 'Ocorreu um erro interno inesperado.' } })
      : route.fulfill({ json: monthSummary });
  });

  await page.goto('/acceptance/fixture.html?mode=management');
  await expect(page.getByRole('alert')).toHaveText('Ocorreu um erro interno inesperado.');
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByRole('list', { name: 'Indicadores do período' })).toContainText('Orçamentos criados6');
});
