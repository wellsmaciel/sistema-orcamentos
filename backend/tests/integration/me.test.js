import request from 'supertest';
import app from '../../src/app.js';

describe('GET /api/v1/activities', () => {
  test('deve responder 401 quando o token não for informado', async () => {
    const response = await request(app).get('/api/v1/activities');

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('UNAUTHORIZED');
  });
});

describe('Avisos de resposta', () => {
  test('GET /api/v1/notifications/responses deve responder 401 sem token', async () => {
    const response = await request(app).get('/api/v1/notifications/responses');

    expect(response.status).toBe(401);
  });

  test('POST /api/v1/notifications/responses/read deve responder 401 sem token', async () => {
    const response = await request(app).post('/api/v1/notifications/responses/read');

    expect(response.status).toBe(401);
  });
});

describe('GET /api/v1/management/summary', () => {
  test('deve responder 401 sem token', async () => {
    const response = await request(app).get('/api/v1/management/summary');

    expect(response.status).toBe(401);
  });
});

describe('GET /api/v1/me', () => {
  test('deve responder 401 quando o token não for informado', async () => {
    const response = await request(app).get('/api/v1/me');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      code: 'UNAUTHORIZED',
      message: 'Não foi possível confirmar seu acesso. Entre novamente.',
    });
  });
});
