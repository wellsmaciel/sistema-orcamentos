import { getUserInfo } from '../services/auth0.js';
import { provisionUser } from '../services/user.js';

async function getAuthenticatedUser(request, response, next) {
  try {
    const authorizationHeader = request.headers.authorization;
    const accessToken = authorizationHeader.split(' ')[1];

    const profile = await getUserInfo(accessToken);
    const user = await provisionUser(profile);

    return response.status(200).json({
      id: user.id,
      name: user.name,
      email: user.email,
    });
  } catch (error) {
    return next(error);
  }
}

export { getAuthenticatedUser };
