import Anthropic from '@anthropic-ai/sdk';

let client;

// Sem ANTHROPIC_API_KEY a revisão com IA fica desativada, sem impedir o restante da API.
function getAnthropicClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    return null;
  }

  client ??= new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    timeout: 20000,
    maxRetries: 1,
  });

  return client;
}

export { getAnthropicClient };
