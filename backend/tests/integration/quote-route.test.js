import request from 'supertest';

import app from '../../src/app.js';

describe('Rotas de orçamentos', () => {
  test('POST /api/v1/quotes deve responder 401 sem token', async () => {
    const response = await request(app).post('/api/v1/quotes').send({});

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      code: 'UNAUTHORIZED',
      message: 'Não foi possível confirmar seu acesso. Entre novamente.',
    });
  });
  test('GET /api/v1/quotes/search deve responder 401 sem token', async () => {
    const response = await request(app).get('/api/v1/quotes/search');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      code: 'UNAUTHORIZED',
      message: 'Não foi possível confirmar seu acesso. Entre novamente.',
    });
  });
  test('PUT /api/v1/quotes/:quoteId deve responder 401 sem token', async () => {
    const response = await request(app).put('/api/v1/quotes/550e8400-e29b-41d4-a716-446655440000').send({});

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      code: 'UNAUTHORIZED',
      message: 'Não foi possível confirmar seu acesso. Entre novamente.',
    });
  });
  test('POST /api/v1/quotes/:quoteId/confirm deve responder 401 sem token', async () => {
    const quoteId = '550e8400-e29b-41d4-a716-446655440000';

    const response = await request(app).post(`/api/v1/quotes/${quoteId}/confirm`);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      code: 'UNAUTHORIZED',
      message: 'Não foi possível confirmar seu acesso. Entre novamente.',
    });
  });
  test('GET /api/v1/public/quotes/:publicToken deve ser público', async () => {
    const response = await request(app).get('/api/v1/public/quotes/token-invalido');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      code: 'QUOTE_NOT_FOUND',
      message: 'Orçamento não encontrado ou link inválido.',
    });
  });
  test('POST /api/v1/public/quotes/:publicToken/respond deve validar a decisão', async () => {
    const response = await request(app).post('/api/v1/public/quotes/token-invalido/respond').send({
      decision: 'PENDING',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Os dados informados são inválidos.',
      details: [
        {
          field: 'decision',
          message: 'Informe ACCEPTED ou REJECTED.',
        },
      ],
    });
  });

  test('POST /api/v1/public/quotes/:publicToken/respond deve ser público', async () => {
    const response = await request(app).post('/api/v1/public/quotes/token-invalido/respond').send({
      decision: 'ACCEPTED',
    });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      code: 'QUOTE_NOT_FOUND',
      message: 'Orçamento não encontrado ou link inválido.',
    });
  });
  test('POST /api/v1/quotes/:quoteId/corrections deve responder 401 sem token', async () => {
    const quoteId = '550e8400-e29b-41d4-a716-446655440000';

    const response = await request(app).post(`/api/v1/quotes/${quoteId}/corrections`);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      code: 'UNAUTHORIZED',
      message: 'Não foi possível confirmar seu acesso. Entre novamente.',
    });
  });
  test('GET /api/v1/quotes/search deve responder 401 sem token', async () => {
    const response = await request(app).get('/api/v1/quotes/search').query({
      search: 'Maria',
      status: 'ACCEPTED',
      serviceDateFrom: '2026-10-01',
      serviceDateTo: '2026-10-31',
      page: '1',
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      code: 'UNAUTHORIZED',
      message: 'Não foi possível confirmar seu acesso. Entre novamente.',
    });
  });
  test('GET /api/v1/quotes/:quoteId/history deve responder 401 sem token', async () => {
    const response = await request(app).get('/api/v1/quotes/550e8400-e29b-41d4-a716-446655440000/history');

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('UNAUTHORIZED');
  });
  test('POST /api/v1/quotes/description-review deve responder 401 sem token', async () => {
    const response = await request(app).post('/api/v1/quotes/description-review').send({ description: 'Instalação de câmeras' });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('UNAUTHORIZED');
  });
});
