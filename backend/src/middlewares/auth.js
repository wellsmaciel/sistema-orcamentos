import { auth } from 'express-oauth2-jwt-bearer';

const auth0Domain = process.env.AUTH0_DOMAIN;
const auth0Audience = process.env.AUTH0_AUDIENCE;

if (!auth0Domain || !auth0Audience) {
  throw new Error('AUTH0_DOMAIN e AUTH0_AUDIENCE devem estar definidas.');
}

const validateAccessToken = auth({
  issuerBaseURL: `https://${auth0Domain}`,
  audience: auth0Audience,
});

export { validateAccessToken };
