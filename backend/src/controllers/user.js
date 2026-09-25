import { getUserInfo } from '../services/auth0.js';

async function getAuthenticatedUser(request, response, next) {
  try {
    const authorizationHeader = request.headers.authorization;
    const accessToken = authorizationHeader.split(' ')[1];

    const profile = await getUserInfo(accessToken);

    return response.status(200).json({
      id: profile.sub,
      name: profile.name,
      email: profile.email,
    });
  } catch (error) {
    return next(error);
  }
}

export { getAuthenticatedUser };
