// O identificador do Auth0 começa pelo provedor: "google-oauth2|..." para o Google e "auth0|..." para e-mail e senha.
function getLoginMethod(auth0Subject) {
  if (typeof auth0Subject !== 'string') {
    return 'other';
  }

  if (auth0Subject.startsWith('google-oauth2|')) {
    return 'google';
  }

  if (auth0Subject.startsWith('auth0|')) {
    return 'password';
  }

  return 'other';
}

const LOGIN_METHOD_LABELS = {
  google: 'Conta Google',
  password: 'E-mail e senha',
  other: 'Outro provedor',
};

export { LOGIN_METHOD_LABELS, getLoginMethod };
