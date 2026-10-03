// Opções do login com o Auth0.
// O Safari bloqueia cookies de outros domínios, então a renovação silenciosa do login (feita com o cookie do Auth0)
// falhava e a pessoa era deslogada ao recarregar a página. Com refresh tokens guardados no navegador, a sessão
// continua após recarregar. A rotação de refresh tokens fica ligada no Auth0: cada token só pode ser usado uma vez.
function buildAuth0Options(env, origin) {
  return {
    domain: env.VITE_AUTH0_DOMAIN,
    clientId: env.VITE_AUTH0_CLIENT_ID,
    useRefreshTokens: true,
    cacheLocation: 'localstorage',
    authorizationParams: {
      redirect_uri: origin,
      audience: env.VITE_AUTH0_AUDIENCE,
      scope: 'openid profile email',
      // A tela de login do Auth0 aparece sempre em português do Brasil, independentemente do navegador.
      ui_locales: 'pt-BR',
    },
  };
}

export { buildAuth0Options };
