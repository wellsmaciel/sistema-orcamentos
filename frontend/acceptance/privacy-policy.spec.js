import { expect, test } from '@playwright/test';

test('a política de privacidade é pública e o rodapé leva até ela', async ({ page }) => {
  let auth0Requests = 0;
  page.on('request', (request) => {
    if (request.url().includes('auth0.com')) {
      auth0Requests += 1;
    }
  });

  await page.goto('/privacidade');

  await expect(page.getByRole('heading', { level: 1, name: 'Política de privacidade' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Com quem os dados são compartilhados' })).toBeVisible();
  await expect(page.getByText('apenas a descrição e os itens do orçamento são enviados')).toBeVisible();
  await expect(page.getByRole('link', { name: 'wellsvelasquezmaciel@gmail.com' }).first()).toHaveAttribute('href', 'mailto:wellsvelasquezmaciel@gmail.com');
  await expect(page.getByRole('button', { name: 'Entrar no sistema' })).toHaveCount(0);

  const footer = page.getByRole('contentinfo');
  await expect(footer).toContainText('© 2026 Wells Velasquez Maciel · Projeto acadêmico (TCC – PUC Minas)');
  await expect(footer.getByRole('link', { name: 'Política de privacidade' })).toHaveAttribute('href', '/privacidade');
  expect(auth0Requests).toBe(0);
});
