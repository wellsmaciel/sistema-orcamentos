import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('não envia a URL do orçamento público no cabeçalho Referer', async () => {
  const serveConfig = JSON.parse(await readFile(new URL('../public/serve.json', import.meta.url), 'utf8'));
  const globalHeaders = serveConfig.headers.find(({ source }) => source === '**')?.headers ?? [];
  const referrerPolicy = globalHeaders.find(({ key }) => key === 'Referrer-Policy');

  assert.equal(referrerPolicy?.value, 'no-referrer');
});
