import { expect, test } from '@playwright/test';

const profile = { id: 'user-1', name: 'Prestador de Teste', email: 'prestador@example.com' };

async function mockAccountApis(page) {
  await page.route('**/api/v1/me', (route) => route.fulfill({ json: profile }));
  await page.route('**/api/v1/activities?page=1', (route) => route.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 } }));
}

test('conta de e-mail e senha mostra os dados e pede a troca de senha ao Auth0', async ({ page }) => {
  let resetBody;
  await mockAccountApis(page);
  await page.route('**/dbconnections/change_password', (route) => {
    resetBody = route.request().postDataJSON();
    return route.fulfill({ status: 200, contentType: 'text/plain', body: "We've just sent you an email to reset your password." });
  });

  await page.goto('/acceptance/fixture.html?mode=account');

  const details = page.locator('.account-details');
  await expect(details).toContainText('Prestador de Teste');
  await expect(details).toContainText('prestador@example.com');
  await expect(details).toContainText('E-mail e senha');
  await expect(page.locator('pre')).toHaveCount(0);

  await page.getByRole('button', { name: 'Alterar senha' }).click();

  await expect(page.getByRole('status').filter({ hasText: 'Enviamos um link para prestador@example.com' })).toBeVisible();
  expect(resetBody).toMatchObject({ email: 'prestador@example.com', connection: 'Username-Password-Authentication' });

  await page.getByRole('button', { name: 'Sair da conta' }).click();
  await expect(page.locator('body')).toHaveAttribute('data-logged-out', 'true');
});

test('falha ao pedir a troca de senha é informada', async ({ page }) => {
  await mockAccountApis(page);
  await page.route('**/dbconnections/change_password', (route) => route.fulfill({ status: 429, body: 'Too many requests' }));

  await page.goto('/acceptance/fixture.html?mode=account');
  await page.getByRole('button', { name: 'Alterar senha' }).click();

  await expect(page.getByRole('alert')).toHaveText('Não foi possível enviar o e-mail para alterar a senha. Tente novamente em alguns minutos.');
});

test('conta Google não oferece troca de senha no app', async ({ page }) => {
  await mockAccountApis(page);

  await page.goto('/acceptance/fixture.html?mode=account&login=google');

  await expect(page.locator('.account-details')).toContainText('Conta Google');
  await expect(page.getByRole('button', { name: 'Alterar senha' })).toHaveCount(0);
  await expect(page.getByText('A senha é gerenciada por esse provedor')).toBeVisible();
});
