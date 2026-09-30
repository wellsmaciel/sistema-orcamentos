import request from 'supertest';
import app from '../../src/app.js';

describe('GET /health', () => {
  test('deve responder com status 200 e indicar que a API está disponível', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});

describe('Corpo da requisição inválido', () => {
  test('JSON malformado responde 400, e não erro interno', async () => {
    const response = await request(app)
      .post('/api/v1/public/quotes/token-qualquer/respond')
      .set('Content-Type', 'application/json')
      .send('{"decision":');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: 'INVALID_JSON',
      message: 'O corpo da requisição não é um JSON válido.',
    });
  });

  test('corpo acima do limite responde 413', async () => {
    const response = await request(app)
      .post('/api/v1/public/quotes/token-qualquer/respond')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ decision: 'REJECTED', reason: 'a'.repeat(200 * 1024) }));

    expect(response.status).toBe(413);
    expect(response.body.code).toBe('PAYLOAD_TOO_LARGE');
  });
});
