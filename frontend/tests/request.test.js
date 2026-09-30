import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fetchJsonWithTimeout, withTimeout } from '../src/services/request.js';

test('encerra uma consulta que nunca recebe resposta', async () => {
  const originalFetch = globalThis.fetch;
  let aborted = false;

  globalThis.fetch = (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => {
      aborted = true;
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });

  try {
    await assert.rejects(fetchJsonWithTimeout('/api/v1/quotes/search', {}, 10), /consulta demorou demais/);
    assert.equal(aborted, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('encerra uma resposta cuja leitura do JSON fica parada', async () => {
  const originalFetch = globalThis.fetch;
  let aborted = false;

  globalThis.fetch = async (_url, { signal }) => ({
    json: () => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => {
        aborted = true;
        reject(new DOMException('Aborted', 'AbortError'));
      });
    }),
  });

  try {
    await assert.rejects(fetchJsonWithTimeout('/api/v1/quotes/search', {}, 10), /consulta demorou demais/);
    assert.equal(aborted, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('encerra a espera pelo token antes de iniciar a consulta', async () => {
  await assert.rejects(withTimeout(new Promise(() => {}), 10), /consulta demorou demais/);
});

test('explica uma falha de rede e permite nova tentativa', async () => {
  const originalFetch = globalThis.fetch;
  let attempts = 0;

  globalThis.fetch = async () => {
    attempts += 1;
    if (attempts === 1) throw new TypeError('Failed to fetch');
    return { status: 200, json: async () => ({ items: [] }) };
  };

  try {
    await assert.rejects(fetchJsonWithTimeout('/api/v1/quotes/search'), /Não foi possível conectar ao servidor/);
    assert.deepEqual((await fetchJsonWithTimeout('/api/v1/quotes/search')).responseBody, { items: [] });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
