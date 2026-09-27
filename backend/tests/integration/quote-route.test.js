import request from 'supertest';

import app from '../../src/app.js';

describe('Rotas de orçamentos', () => {
  test('POST /api/v1/quotes deve responder 401 sem token', async () => {
    const response = await request(app).post('/api/v1/quotes').send({});

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      code: 'UNAUTHORIZED',
      message: 'É necessário apresentar um token de acesso válido.',
    });
  });
  test('GET /api/v1/quotes deve responder 401 sem token', async () => {
    const response = await request(app).get('/api/v1/quotes');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      code: 'UNAUTHORIZED',
      message: 'É necessário apresentar um token de acesso válido.',
    });
  });
  test('PUT /api/v1/quotes/:quoteId deve responder 401 sem token', async () => {
    const response = await request(app).put('/api/v1/quotes/550e8400-e29b-41d4-a716-446655440000').send({});

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      code: 'UNAUTHORIZED',
      message: 'É necessário apresentar um token de acesso válido.',
    });
  });
});
