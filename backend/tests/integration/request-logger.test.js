import { jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';

import app from '../../src/app.js';
import { createRequestLogger } from '../../src/middlewares/request-logger.js';

function buildApp(options) {
  const testApp = express();

  testApp.use(createRequestLogger(options));
  testApp.get('/api/v1/public/quotes/:publicToken', (_request, response) => response.status(200).json({ ok: true }));
  testApp.get('/api/v1/quotes', (request, response) => {
    request.authenticatedUser = { id: 'user-1', name: 'Nome do Prestador', email: 'prestador@example.com' };
    response.status(200).json({ items: [] });
  });

  return testApp;
}

function loggedEntries(log) {
  return log.mock.calls.map(([line]) => JSON.parse(line));
}

describe('requestLogger', () => {
  test('registra o formato da rota, sem o token do link público', async () => {
    const log = jest.fn();

    const response = await request(buildApp({ log, enabled: true })).get('/api/v1/public/quotes/token-secreto-123?origem=whatsapp');

    expect(response.status).toBe(200);
    const [entry] = loggedEntries(log);
    expect(entry).toMatchObject({
      event: 'http_request',
      method: 'GET',
      route: '/api/v1/public/quotes/:publicToken',
      status: 200,
      requestId: response.headers['x-request-id'],
    });
    expect(typeof entry.durationMs).toBe('number');
    expect(log.mock.calls[0][0]).not.toMatch(/token-secreto-123|whatsapp/);
  });

  test('inclui somente o identificador do usuário autenticado', async () => {
    const log = jest.fn();

    await request(buildApp({ log, enabled: true })).get('/api/v1/quotes?search=Maria');

    const [entry] = loggedEntries(log);
    expect(entry.userId).toBe('user-1');
    expect(log.mock.calls[0][0]).not.toMatch(/Nome do Prestador|prestador@example.com|Maria/);
  });

  test('não registra o endereço de rotas desconhecidas', async () => {
    const log = jest.fn();

    const response = await request(buildApp({ log, enabled: true })).get('/caminho/desconhecido/dado-pessoal');

    expect(response.status).toBe(404);
    const [entry] = loggedEntries(log);
    expect(entry).toMatchObject({ route: null, status: 404 });
    expect(log.mock.calls[0][0]).not.toMatch(/dado-pessoal/);
  });

  test('pode ser desligado, mantendo o identificador da requisição', async () => {
    const log = jest.fn();

    const response = await request(buildApp({ log, enabled: false })).get('/api/v1/quotes');

    expect(log).not.toHaveBeenCalled();
    expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  test('a API devolve um identificador diferente em cada requisição', async () => {
    const first = await request(app).get('/health');
    const second = await request(app).get('/health');

    expect(first.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(first.headers['x-request-id']).not.toBe(second.headers['x-request-id']);
  });
});
