import express from 'express';
import { InsufficientScopeError, InvalidTokenError, UnauthorizedError } from 'express-oauth2-jwt-bearer';
import { getAuthenticatedUser } from './controllers/user.js';
import { validateAccessToken } from './middlewares/auth.js';

const app = express();

app.use(express.json());

app.get('/health', (_request, response) => {
  response.status(200).json({ status: 'ok' });
});

app.get('/api/v1/me', validateAccessToken, getAuthenticatedUser);

app.use((error, _request, response, _next) => {
  if (error instanceof InsufficientScopeError) {
    return response.status(403).json({
      code: 'FORBIDDEN',
      message: 'Você não possui permissão para esta operação.',
    });
  }

  if (error instanceof UnauthorizedError || error instanceof InvalidTokenError) {
    return response.status(401).json({
      code: 'UNAUTHORIZED',
      message: 'É necessário apresentar um token de acesso válido.',
    });
  }

  console.error(error);

  return response.status(500).json({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Ocorreu um erro interno inesperado.',
  });
});

export default app;
