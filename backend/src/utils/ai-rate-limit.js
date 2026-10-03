import { createRateLimiter } from './rate-limiter.js';

// Protege o custo da API de IA: cada prestador pode fazer 10 pedidos à IA a cada 10 minutos,
// somando a revisão da descrição e a separação em itens.
const aiUsageLimiter = createRateLimiter({ limit: 10, windowMs: 10 * 60 * 1000 });

export { aiUsageLimiter };
