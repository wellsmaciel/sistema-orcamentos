import request from 'supertest';
import app from '../../src/app.js';

describe('GET /health', () => {
  test('deve responder com status 200 e indicar que a API está disponível', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
