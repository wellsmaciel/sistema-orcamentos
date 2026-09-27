import { getUserInfo } from '../services/auth0.js';
import { provisionUser } from '../services/user.js';

async function loadAuthenticatedUser(request, _response, next) {
  try {
    const authorizationHeader = request.headers.authorization;
    const accessToken = authorizationHeader.split(' ')[1];

    const profile = await getUserInfo(accessToken);
    const user = await provisionUser(profile);

    request.authenticatedUser = user;

    return next();
  } catch (error) {
    return next(error);
  }
}

export { loadAuthenticatedUser };
