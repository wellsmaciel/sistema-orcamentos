import { expect, test } from '@playwright/test';

test('o guia de ajuda é público e o rodapé leva até ele', async ({ page }) => {
  let auth0Requests = 0;
  page.on('request', (request) => {
    if (request.url().includes('auth0.com')) {
      auth0Requests += 1;
    }
  });

  await page.goto('/ajuda');

  await expect(page.getByRole('heading', { level: 1, name: 'Como usar o Sistema de Orçamentos' })).toBeVisible();
  for (const topic of ['Primeiros passos', 'Clientes', 'Criar um orçamento', 'Revisar, confirmar e enviar', 'Acompanhar as respostas', 'Gestão', 'Perguntas frequentes']) {
    await expect(page.getByRole('heading', { level: 2, name: topic })).toBeVisible();
  }
  await expect(page.getByRole('button', { name: 'Entrar no sistema' })).toHaveCount(0);
  await expect(page.getByText('Usar a descrição geral como item')).toBeVisible();

  // O índice leva até a seção.
  await page.getByRole('navigation', { name: 'Tópicos da ajuda' }).getByRole('link', { name: 'Perguntas frequentes' }).click();
  await expect(page).toHaveURL(/#duvidas$/);
  await expect(page.getByRole('heading', { name: 'O cliente precisa criar conta?' })).toBeInViewport();

  const footer = page.getByRole('contentinfo');
  await expect(footer.getByRole('link', { name: 'Como usar' })).toHaveAttribute('href', '/ajuda');
  await expect(footer.getByRole('link', { name: 'Política de privacidade' })).toHaveAttribute('href', '/privacidade');
  expect(auth0Requests).toBe(0);
});
