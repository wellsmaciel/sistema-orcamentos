import { createRateLimiter } from '../../src/utils/rate-limiter.js';

describe('createRateLimiter', () => {
  test('bloqueia novas tentativas depois do limite dentro da janela', () => {
    let currentTime = 0;
    const limiter = createRateLimiter({ limit: 2, windowMs: 1000, now: () => currentTime });

    expect(limiter.tryConsume('user-1')).toBe(true);
    currentTime = 500;
    expect(limiter.tryConsume('user-1')).toBe(true);
    expect(limiter.tryConsume('user-1')).toBe(false);
  });

  test('libera tentativas quando as anteriores saem da janela', () => {
    let currentTime = 0;
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000, now: () => currentTime });

    expect(limiter.tryConsume('user-1')).toBe(true);
    currentTime = 999;
    expect(limiter.tryConsume('user-1')).toBe(false);
    currentTime = 1000;
    expect(limiter.tryConsume('user-1')).toBe(true);
  });

  test('conta cada usuário separadamente', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000, now: () => 0 });

    expect(limiter.tryConsume('user-1')).toBe(true);
    expect(limiter.tryConsume('user-2')).toBe(true);
    expect(limiter.tryConsume('user-1')).toBe(false);
  });
});
