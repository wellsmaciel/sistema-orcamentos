import cors from 'cors';
import express from 'express';
import { InsufficientScopeError, InvalidTokenError, UnauthorizedError } from 'express-oauth2-jwt-bearer';
import { getAuthenticatedUser } from './controllers/user.js';
import { validateAccessToken } from './middlewares/auth.js';
import { loadAuthenticatedUser } from './middlewares/authenticated-user.js';
import { createClient, listClients } from './controllers/client.js';
import { validateClient } from './middlewares/validate-client.js';
import { confirmQuote, createQuote, listQuotes, updateQuote, getPublicQuote, respondToPublicQuote, createQuoteCorrection } from './controllers/quote.js';
import { validateQuote, validateQuoteIdParameter, validateQuoteUpdate, validateQuoteResponse } from './middlewares/validate-quote.js';

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN_URL,
  }),
);

app.use(express.json());

app.get('/health', (_request, response) => {
  response.status(200).json({ status: 'ok' });
});

app.get('/api/v1/public/quotes/:publicToken', getPublicQuote);
app.post('/api/v1/public/quotes/:publicToken/respond', validateQuoteResponse, respondToPublicQuote);
app.get('/api/v1/me', validateAccessToken, loadAuthenticatedUser, getAuthenticatedUser);
app.post('/api/v1/clients', validateAccessToken, loadAuthenticatedUser, validateClient, createClient);
app.get('/api/v1/clients', validateAccessToken, loadAuthenticatedUser, listClients);
app.post('/api/v1/quotes', validateAccessToken, loadAuthenticatedUser, validateQuote, createQuote);
app.get('/api/v1/quotes', validateAccessToken, loadAuthenticatedUser, listQuotes);
app.put('/api/v1/quotes/:quoteId', validateAccessToken, loadAuthenticatedUser, validateQuoteIdParameter, validateQuoteUpdate, updateQuote);
app.post('/api/v1/quotes/:quoteId/confirm', validateAccessToken, loadAuthenticatedUser, validateQuoteIdParameter, confirmQuote);
app.post('/api/v1/quotes/:quoteId/corrections', validateAccessToken, loadAuthenticatedUser, validateQuoteIdParameter, createQuoteCorrection);

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
