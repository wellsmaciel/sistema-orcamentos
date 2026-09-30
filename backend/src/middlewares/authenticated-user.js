import { getUserInfo } from '../services/auth0.js';
import { findUserByAuth0Subject, provisionUser } from '../services/user.js';

async function loadAuthenticatedUser(request, _response, next) {
  try {
    // validateAccessToken has already verified the JWT issuer, audience and signature.
    const auth0Subject = request.auth?.payload?.sub;
    const existingUser = auth0Subject && await findUserByAuth0Subject(auth0Subject);

    // Atualizações de nome/e-mail são sincronizadas sob demanda na tela Minha conta.
    if (existingUser && request.path !== '/api/v1/me') {
      request.authenticatedUser = existingUser;
      return next();
    }

    const accessToken = request.headers.authorization.split(' ')[1];
    const profile = await getUserInfo(accessToken);

    if (auth0Subject && profile.sub !== auth0Subject) {
      throw new Error('O perfil do Auth0 não corresponde ao token validado.');
    }

    const user = await provisionUser(profile);

    request.authenticatedUser = user;

    return next();
  } catch (error) {
    return next(error);
  }
}

export { loadAuthenticatedUser };
