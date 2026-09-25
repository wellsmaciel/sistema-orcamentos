import request from 'supertest';
import app from '../../src/app.js';

describe('GET /api/v1/me', () => {
  test('deve responder 401 quando o token não for informado', async () => {
    const response = await request(app).get('/api/v1/me');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      code: 'UNAUTHORIZED',
      message: 'É necessário apresentar um token de acesso válido.',
    });
  });
});
