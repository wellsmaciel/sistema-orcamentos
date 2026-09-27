import request from 'supertest';

import app from '../../src/app.js';

describe('Rotas de clientes', () => {
  test('GET /api/v1/clients deve responder 401 sem token', async () => {
    const response = await request(app).get('/api/v1/clients');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      code: 'UNAUTHORIZED',
      message: 'É necessário apresentar um token de acesso válido.',
    });
  });

  test('POST /api/v1/clients deve responder 401 sem token', async () => {
    const response = await request(app).post('/api/v1/clients').send({});

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      code: 'UNAUTHORIZED',
      message: 'É necessário apresentar um token de acesso válido.',
    });
  });
});
