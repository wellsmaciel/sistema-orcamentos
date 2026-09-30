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
  test('PUT /api/v1/clients/:clientId deve responder 401 sem token', async () => {
    const response = await request(app).put('/api/v1/clients/550e8400-e29b-41d4-a716-446655440000').send({});

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      code: 'UNAUTHORIZED',
      message: 'É necessário apresentar um token de acesso válido.',
    });
  });
  test('DELETE /api/v1/clients/:clientId deve responder 401 sem token', async () => {
    const response = await request(app).delete('/api/v1/clients/550e8400-e29b-41d4-a716-446655440000');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      code: 'UNAUTHORIZED',
      message: 'É necessário apresentar um token de acesso válido.',
    });
  });

  test('POST /api/v1/clients/:clientId/deactivate deve responder 401 sem token', async () => {
    const response = await request(app).post('/api/v1/clients/550e8400-e29b-41d4-a716-446655440000/deactivate');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      code: 'UNAUTHORIZED',
      message: 'É necessário apresentar um token de acesso válido.',
    });
  });
  test('POST /api/v1/clients/:clientId/reactivate deve responder 401 sem token', async () => {
    const response = await request(app).post('/api/v1/clients/550e8400-e29b-41d4-a716-446655440000/reactivate');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      code: 'UNAUTHORIZED',
      message: 'É necessário apresentar um token de acesso válido.',
    });
  });
  test('GET /api/v1/clients/search deve responder 401 sem token', async () => {
    const response = await request(app).get('/api/v1/clients/search').query({
      active: 'false',
      search: 'Maria',
      page: '1',
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      code: 'UNAUTHORIZED',
      message: 'É necessário apresentar um token de acesso válido.',
    });
  });
});
