import cors from 'cors';
import express from 'express';
import { InsufficientScopeError, InvalidTokenError, UnauthorizedError } from 'express-oauth2-jwt-bearer';
import { getAuthenticatedUser } from './controllers/user.js';
import { validateAccessToken } from './middlewares/auth.js';
import { loadAuthenticatedUser } from './middlewares/authenticated-user.js';
import { createClient, listClients, listClientsPage, updateClient, deleteClient, deactivateClient, reactivateClient } from './controllers/client.js';
import { validateClient, validateClientIdParameter, validateClientListQuery } from './middlewares/validate-client.js';
import { confirmQuote, createQuote, listQuotes, updateQuote, getPublicQuote, respondToPublicQuote, createQuoteCorrection, listQuotesPage, getQuoteHistory } from './controllers/quote.js';
import { validateQuote, validateQuoteIdParameter, validateQuoteUpdate, validateQuoteResponse, validateQuoteListQuery, validateQuoteDescriptionReview } from './middlewares/validate-quote.js';
import { reviewQuoteDescription } from './controllers/quote-description-review.js';
import { getCompany, saveCompany } from './controllers/company.js';
import { validateCompany } from './middlewares/validate-company.js';
import { requestLogger } from './middlewares/request-logger.js';
import { listActivities } from './controllers/activity.js';

const app = express();

app.use(requestLogger);

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
app.get('/api/v1/company', validateAccessToken, loadAuthenticatedUser, getCompany);
app.put('/api/v1/company', validateAccessToken, loadAuthenticatedUser, validateCompany, saveCompany);
app.get('/api/v1/activities', validateAccessToken, loadAuthenticatedUser, listActivities);
app.post('/api/v1/clients', validateAccessToken, loadAuthenticatedUser, validateClient, createClient);
app.get('/api/v1/clients', validateAccessToken, loadAuthenticatedUser, listClients);
app.get('/api/v1/clients/search', validateAccessToken, loadAuthenticatedUser, validateClientListQuery, listClientsPage);
app.put('/api/v1/clients/:clientId', validateAccessToken, loadAuthenticatedUser, validateClientIdParameter, validateClient, updateClient);
app.delete('/api/v1/clients/:clientId', validateAccessToken, loadAuthenticatedUser, validateClientIdParameter, deleteClient);
app.post('/api/v1/clients/:clientId/deactivate', validateAccessToken, loadAuthenticatedUser, validateClientIdParameter, deactivateClient);
app.post('/api/v1/clients/:clientId/reactivate', validateAccessToken, loadAuthenticatedUser, validateClientIdParameter, reactivateClient);
app.post('/api/v1/quotes', validateAccessToken, loadAuthenticatedUser, validateQuote, createQuote);
app.get('/api/v1/quotes', validateAccessToken, loadAuthenticatedUser, listQuotes);
app.get('/api/v1/quotes/search', validateAccessToken, loadAuthenticatedUser, validateQuoteListQuery, listQuotesPage);
app.post('/api/v1/quotes/description-review', validateAccessToken, loadAuthenticatedUser, validateQuoteDescriptionReview, reviewQuoteDescription);
app.get('/api/v1/quotes/:quoteId/history', validateAccessToken, loadAuthenticatedUser, validateQuoteIdParameter, getQuoteHistory);

app.put('/api/v1/quotes/:quoteId', validateAccessToken, loadAuthenticatedUser, validateQuoteIdParameter, validateQuoteUpdate, updateQuote);
app.post('/api/v1/quotes/:quoteId/confirm', validateAccessToken, loadAuthenticatedUser, validateQuoteIdParameter, confirmQuote);
app.post('/api/v1/quotes/:quoteId/corrections', validateAccessToken, loadAuthenticatedUser, validateQuoteIdParameter, createQuoteCorrection);

app.use((error, request, response, _next) => {
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

  // Erros do express.json(): o problema está no corpo enviado, não no servidor.
  if (error?.type === 'entity.parse.failed') {
    return response.status(400).json({
      code: 'INVALID_JSON',
      message: 'O corpo da requisição não é um JSON válido.',
    });
  }

  if (error?.type === 'entity.too.large') {
    return response.status(413).json({
      code: 'PAYLOAD_TOO_LARGE',
      message: 'O corpo da requisição é maior que o permitido.',
    });
  }

  // O mesmo requestId do log da requisição permite ligar o erro à chamada que o causou.
  console.error(JSON.stringify({
    event: 'http_error',
    timestamp: new Date().toISOString(),
    requestId: request.requestId,
    errorName: error?.name,
    message: error?.message,
    stack: error?.stack,
  }));

  return response.status(500).json({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Ocorreu um erro interno inesperado.',
  });
});

export default app;
