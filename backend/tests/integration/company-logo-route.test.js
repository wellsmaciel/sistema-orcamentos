import { jest } from '@jest/globals';
import request from 'supertest';

const USER_ID = '550e8400-e29b-41d4-a716-446655440003';
const PUBLIC_TOKEN = 'a'.repeat(64);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32, 1)]);

const services = Object.fromEntries(
  ['getCompanyLogo', 'getPublicQuoteLogo', 'hasCompanyLogo', 'removeCompanyLogo', 'saveCompanyLogo'].map((name) => [name, jest.fn()]),
);

// Autenticação e persistência simuladas: aqui se testam rotas, limites e respostas HTTP.
jest.unstable_mockModule('../../src/services/company-logo.js', () => services);
jest.unstable_mockModule('../../src/middlewares/auth.js', () => ({
  validateAccessToken: (_request, _response, next) => next(),
}));
jest.unstable_mockModule('../../src/middlewares/authenticated-user.js', () => ({
  loadAuthenticatedUser: (request, _response, next) => {
    request.authenticatedUser = { id: USER_ID };
    return next();
  },
}));

const { default: app } = await import('../../src/app.js');

describe('Rotas do logo da empresa', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('PUT envia a imagem e o tipo declarado ao serviço', async () => {
    services.saveCompanyLogo.mockResolvedValue({ outcome: 'SAVED' });

    const response = await request(app).put('/api/v1/company/logo').set('Content-Type', 'image/png').send(PNG);

    expect(response.status).toBe(204);
    expect(services.saveCompanyLogo).toHaveBeenCalledWith(USER_ID, { content: PNG, declaredType: 'image/png' });
  });

  test.each([
    ['SVG', 'image/svg+xml', '<svg xmlns="http://www.w3.org/2000/svg"></svg>'],
    ['JSON', 'application/json', JSON.stringify({ logo: 'x' })],
    ['texto', 'text/plain', 'logo'],
  ])('PUT recusa %s sem chamar o serviço', async (_name, contentType, body) => {
    const response = await request(app).put('/api/v1/company/logo').set('Content-Type', contentType).send(body);

    expect(response.status).toBe(415);
    expect(response.body.code).toBe('UNSUPPORTED_IMAGE');
    expect(services.saveCompanyLogo).not.toHaveBeenCalled();
  });

  test('PUT recusa corpo acima de 200 KB antes de chamar o serviço', async () => {
    const response = await request(app)
      .put('/api/v1/company/logo')
      .set('Content-Type', 'image/png')
      .send(Buffer.concat([PNG, Buffer.alloc(200 * 1024)]));

    expect(response.status).toBe(413);
    expect(response.body.code).toBe('PAYLOAD_TOO_LARGE');
    expect(services.saveCompanyLogo).not.toHaveBeenCalled();
  });

  test.each([
    ['INVALID_IMAGE', 415, 'UNSUPPORTED_IMAGE'],
    ['COMPANY_NOT_FOUND', 409, 'COMPANY_NOT_FOUND'],
  ])('PUT traduz %s do serviço', async (outcome, status, code) => {
    services.saveCompanyLogo.mockResolvedValue({ outcome });

    const response = await request(app).put('/api/v1/company/logo').set('Content-Type', 'image/png').send(PNG);

    expect(response.status).toBe(status);
    expect(response.body.code).toBe(code);
  });

  test('GET devolve a imagem do prestador sem cache compartilhado', async () => {
    services.getCompanyLogo.mockResolvedValue({ content: PNG, mimeType: 'image/png' });

    const response = await request(app).get('/api/v1/company/logo');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('image/png');
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(Buffer.compare(response.body, PNG)).toBe(0);
    expect(services.getCompanyLogo).toHaveBeenCalledWith(USER_ID);
  });

  test('GET e DELETE respondem 404 quando não há logo', async () => {
    services.getCompanyLogo.mockResolvedValue(null);
    services.removeCompanyLogo.mockResolvedValue({ outcome: 'NOT_FOUND' });

    expect((await request(app).get('/api/v1/company/logo')).status).toBe(404);
    expect((await request(app).delete('/api/v1/company/logo')).status).toBe(404);
  });

  test('DELETE remove o logo', async () => {
    services.removeCompanyLogo.mockResolvedValue({ outcome: 'REMOVED' });

    const response = await request(app).delete('/api/v1/company/logo');

    expect(response.status).toBe(204);
    expect(services.removeCompanyLogo).toHaveBeenCalledWith(USER_ID);
  });

  test('GET público devolve só a imagem, com cache curto', async () => {
    services.getPublicQuoteLogo.mockResolvedValue({ content: PNG, mimeType: 'image/png' });

    const response = await request(app).get(`/api/v1/public/quotes/${PUBLIC_TOKEN}/logo`);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('image/png');
    expect(response.headers['cache-control']).toBe('public, max-age=300');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(services.getPublicQuoteLogo).toHaveBeenCalledWith(PUBLIC_TOKEN);
  });

  test('GET público responde 404 sem logo ou com link inválido', async () => {
    services.getPublicQuoteLogo.mockResolvedValue(null);

    const response = await request(app).get('/api/v1/public/quotes/token-invalido/logo');

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('LOGO_NOT_FOUND');
  });
});
