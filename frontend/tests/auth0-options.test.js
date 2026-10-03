import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildAuth0Options } from '../src/auth0-options.js';

const env = { VITE_AUTH0_DOMAIN: 'exemplo.us.auth0.com', VITE_AUTH0_CLIENT_ID: 'client-id', VITE_AUTH0_AUDIENCE: 'https://api.exemplo' };

test('mantém a sessão ao recarregar no Safari: refresh tokens guardados no navegador', () => {
  const options = buildAuth0Options(env, 'https://app.exemplo');

  assert.equal(options.useRefreshTokens, true);
  assert.equal(options.cacheLocation, 'localstorage');
});

test('mantém domínio, API, escopos e idioma do login', () => {
  assert.deepEqual(buildAuth0Options(env, 'https://app.exemplo'), {
    domain: 'exemplo.us.auth0.com',
    clientId: 'client-id',
    useRefreshTokens: true,
    cacheLocation: 'localstorage',
    authorizationParams: {
      redirect_uri: 'https://app.exemplo',
      audience: 'https://api.exemplo',
      scope: 'openid profile email',
      ui_locales: 'pt-BR',
    },
  });
});
