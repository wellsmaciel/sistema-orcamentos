// Limite simples em memória. Suficiente para uma única réplica da API.
function createRateLimiter({ limit, windowMs, now = () => Date.now() }) {
  const attempts = new Map();

  function tryConsume(key) {
    const currentTime = now();
    const recentAttempts = (attempts.get(key) ?? []).filter((attemptTime) => currentTime - attemptTime < windowMs);

    if (recentAttempts.length >= limit) {
      attempts.set(key, recentAttempts);
      return false;
    }

    recentAttempts.push(currentTime);
    attempts.set(key, recentAttempts);

    return true;
  }

  return { tryConsume };
}

export { createRateLimiter };
