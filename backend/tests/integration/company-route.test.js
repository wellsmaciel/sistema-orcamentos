import request from 'supertest';

import app from '../../src/app.js';

describe('Rotas de dados profissionais', () => {
  test('GET /api/v1/company deve responder 401 sem token', async () => {
    const response = await request(app).get('/api/v1/company');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      code: 'UNAUTHORIZED',
      message: 'É necessário apresentar um token de acesso válido.',
    });
  });

  test('PUT /api/v1/company deve responder 401 sem token', async () => {
    const response = await request(app).put('/api/v1/company').send({});

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      code: 'UNAUTHORIZED',
      message: 'É necessário apresentar um token de acesso válido.',
    });
  });
});
