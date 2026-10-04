import { expect, test } from '@playwright/test';

test('prestador consulta as atividades recentes da conta', async ({ page }) => {
  await page.route('**/api/v1/activities?page=1', (route) => route.fulfill({
    json: {
      items: [
        { id: 'a3', action: 'CLIENT_DELETED', entityType: 'CLIENT', entityId: 'c2', entityName: null, changedFields: [], createdAt: '2026-09-30T15:00:00.000Z' },
        { id: 'a2', action: 'CLIENT_UPDATED', entityType: 'CLIENT', entityId: 'c1', entityName: 'Maria', changedFields: ['phone'], createdAt: '2026-09-30T14:00:00.000Z' },
        { id: 'a1', action: 'COMPANY_CREATED', entityType: 'COMPANY', entityId: 'co1', entityName: null, changedFields: [], createdAt: '2026-09-30T13:00:00.000Z' },
      ],
      total: 3, page: 1, pageSize: 20, totalPages: 1,
    },
  }));

  await page.goto('/acceptance/fixture.html?mode=activities');

  const items = page.getByRole('region', { name: 'Atividades recentes' }).getByRole('listitem');
  await expect(items).toHaveCount(3);
  await expect(items.nth(0)).toContainText('Cliente excluído');
  await expect(items.nth(1)).toContainText('Dados do cliente alterados: Maria (telefone)');
  await expect(items.nth(2)).toContainText('Perfil profissional cadastrado');
});

test('falha ao carregar atividades permite tentar novamente', async ({ page }) => {
  let attempts = 0;
  await page.route('**/api/v1/activities?page=1', (route) => {
    attempts += 1;
    return attempts === 1
      ? route.fulfill({ status: 500, json: { code: 'INTERNAL_SERVER_ERROR', message: 'Ocorreu um erro inesperado. Tente novamente em alguns minutos.' } })
      : route.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 } });
  });

  await page.goto('/acceptance/fixture.html?mode=activities');
  await expect(page.getByRole('alert')).toHaveText('Ocorreu um erro inesperado. Tente novamente em alguns minutos.');
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByText('Nenhuma atividade registrada ainda.')).toBeVisible();
});
