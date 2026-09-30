const REQUEST_TIMEOUT_MS = 20000;

function withTimeout(promise, timeoutMs = REQUEST_TIMEOUT_MS) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('A consulta demorou demais. Tente novamente.')), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

async function fetchJsonWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const responseBody = await response.json();
    return { response, responseBody };
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error('A consulta demorou demais. Tente novamente.');
    }

    if (error instanceof TypeError) {
      throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.');
    }

    if (error instanceof SyntaxError) {
      throw new Error('O servidor enviou uma resposta inválida. Tente novamente.');
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export { fetchJsonWithTimeout, withTimeout };
