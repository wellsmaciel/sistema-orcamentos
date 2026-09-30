import { jest } from '@jest/globals';

const getUserInfo = jest.fn();
const findUserByAuth0Subject = jest.fn();
const provisionUser = jest.fn();

jest.unstable_mockModule('../../src/services/auth0.js', () => ({ getUserInfo }));
jest.unstable_mockModule('../../src/services/user.js', () => ({ findUserByAuth0Subject, provisionUser }));

const { loadAuthenticatedUser } = await import('../../src/middlewares/authenticated-user.js');

describe('loadAuthenticatedUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('reutiliza o usuário local do token validado sem consultar o Auth0', async () => {
    const user = { id: 'local-user-id' };
    findUserByAuth0Subject.mockResolvedValue(user);
    const request = {
      auth: { payload: { sub: 'auth0|owner' } },
      headers: { authorization: 'Bearer validated-token' },
    };
    const next = jest.fn();

    await loadAuthenticatedUser(request, {}, next);

    expect(findUserByAuth0Subject).toHaveBeenCalledWith('auth0|owner');
    expect(getUserInfo).not.toHaveBeenCalled();
    expect(request.authenticatedUser).toBe(user);
    expect(next).toHaveBeenCalledWith();
  });

  test('consulta e cadastra o perfil no primeiro acesso', async () => {
    findUserByAuth0Subject.mockResolvedValue(null);
    const profile = { sub: 'auth0|new', name: 'Novo usuário', email: 'new@example.com' };
    const user = { id: 'new-user-id' };
    getUserInfo.mockResolvedValue(profile);
    provisionUser.mockResolvedValue(user);
    const request = {
      auth: { payload: { sub: profile.sub } },
      headers: { authorization: 'Bearer validated-token' },
    };
    const next = jest.fn();

    await loadAuthenticatedUser(request, {}, next);

    expect(getUserInfo).toHaveBeenCalledWith('validated-token');
    expect(provisionUser).toHaveBeenCalledWith(profile);
    expect(request.authenticatedUser).toBe(user);
    expect(next).toHaveBeenCalledWith();
  });

  test('sincroniza o perfil existente ao consultar Minha conta', async () => {
    findUserByAuth0Subject.mockResolvedValue({ id: 'local-user-id' });
    const profile = { sub: 'auth0|owner', name: 'Nome atualizado', email: 'owner@example.com' };
    const user = { id: 'local-user-id', name: profile.name };
    getUserInfo.mockResolvedValue(profile);
    provisionUser.mockResolvedValue(user);
    const request = {
      path: '/api/v1/me',
      auth: { payload: { sub: profile.sub } },
      headers: { authorization: 'Bearer validated-token' },
    };
    const next = jest.fn();

    await loadAuthenticatedUser(request, {}, next);

    expect(provisionUser).toHaveBeenCalledWith(profile);
    expect(request.authenticatedUser).toBe(user);
    expect(next).toHaveBeenCalledWith();
  });

  test('rejeita um perfil que não corresponde ao sujeito do token', async () => {
    findUserByAuth0Subject.mockResolvedValue(null);
    getUserInfo.mockResolvedValue({ sub: 'auth0|other', name: 'Outro', email: 'other@example.com' });
    const next = jest.fn();

    await loadAuthenticatedUser({
      auth: { payload: { sub: 'auth0|owner' } },
      headers: { authorization: 'Bearer validated-token' },
    }, {}, next);

    expect(provisionUser).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
