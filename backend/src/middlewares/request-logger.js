import { randomUUID } from 'node:crypto';

// Registra uma linha JSON por requisição na saída padrão, que o Railway coleta como fluxo de eventos.
// Usa o formato da rota (por exemplo, /api/v1/public/quotes/:publicToken), nunca o endereço real,
// para que tokens de links públicos, parâmetros de busca e dados pessoais não cheguem aos logs.
function createRequestLogger({ log = console.log, enabled = process.env.NODE_ENV !== 'test' } = {}) {
  return function requestLogger(request, response, next) {
    const startedAt = process.hrtime.bigint();

    request.requestId = randomUUID();
    response.setHeader('X-Request-Id', request.requestId);

    if (enabled) {
      response.on('finish', () => {
        const entry = {
          event: 'http_request',
          timestamp: new Date().toISOString(),
          requestId: request.requestId,
          method: request.method,
          route: request.route ? `${request.baseUrl}${request.route.path}` : null,
          status: response.statusCode,
          durationMs: Number((process.hrtime.bigint() - startedAt) / 1000000n),
        };

        if (request.authenticatedUser?.id) {
          entry.userId = request.authenticatedUser.id;
        }

        log(JSON.stringify(entry));
      });
    }

    next();
  };
}

const requestLogger = createRequestLogger();

export { createRequestLogger, requestLogger };
