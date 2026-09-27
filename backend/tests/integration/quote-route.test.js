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
});
