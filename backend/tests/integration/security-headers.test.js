import request from 'supertest';
import app from '../../src/app.js';

describe('Cabeçalhos de segurança da API', () => {
  test('protegem as respostas e não revelam a tecnologia do servidor', async () => {
    const response = await request(app).get('/health');

    expect(response.headers['strict-transport-security']).toMatch(/max-age=\d+/);
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(response.headers['referrer-policy']).toBe('no-referrer');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  test('o logo da API pode ser exibido pelo site, que fica em outro domínio', async () => {
    const response = await request(app).get('/health');

    expect(response.headers['cross-origin-resource-policy']).toBe('cross-origin');
  });

  test('o CORS continua liberado para o endereço do site', async () => {
    const response = await request(app)
      .options('/api/v1/company')
      .set('Origin', process.env.CLIENT_ORIGIN_URL ?? 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'PUT');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(process.env.CLIENT_ORIGIN_URL ?? '*');
  });
});
