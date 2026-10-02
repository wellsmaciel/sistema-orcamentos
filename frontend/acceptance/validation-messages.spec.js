import { expect, test } from '@playwright/test';

test('perfil mostra o motivo quando o CPF ou CNPJ é recusado', async ({ page }) => {
  await page.route('**/api/v1/company', (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ status: 404, json: { code: 'COMPANY_NOT_FOUND' } });
    }
    return route.fulfill({
      status: 400,
      json: {
        code: 'VALIDATION_ERROR',
        message: 'Os dados informados são inválidos.',
        details: [{ field: 'taxId', message: 'Informe um CPF ou CNPJ com 11 ou 14 dígitos.' }],
      },
    });
  });

  await page.goto('/acceptance/fixture.html?mode=company');
  await expect(page.getByText('CPF com 11 dígitos ou CNPJ com 14')).toBeVisible();

  await page.getByLabel('Nome profissional ou da empresa').fill('Wells Monitoramento e Segurança');
  await page.getByLabel('E-mail comercial').fill('empresa@example.com');
  await page.getByLabel('Telefone comercial').fill('(11) 99999-8888');
  await page.getByLabel('CPF ou CNPJ').fill('11112222333-0001-00');
  await page.getByRole('button', { name: 'Salvar dados profissionais' }).click();

  await expect(page.getByRole('alert')).toHaveText('CPF ou CNPJ: Informe um CPF ou CNPJ com 11 ou 14 dígitos.');
});
