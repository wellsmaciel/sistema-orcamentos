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
    // 204 (por exemplo, ao excluir) não tem corpo.
    const responseBody = response.status === 204 ? null : await response.json();
    return { response, responseBody };
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error('A consulta demorou demais. Tente novamente.');
    }

    if (error instanceof TypeError) {
      throw new Error('Não foi possível se comunicar com o sistema. Verifique sua conexão ou tente novamente em alguns minutos.');
    }

    if (error instanceof SyntaxError) {
      throw new Error('Algo deu errado ao receber os dados. Tente novamente.');
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Chamada autenticada à API: busca o token, envia JSON e aplica o mesmo tempo limite e as mesmas
// mensagens de erro de rede em todas as telas.
async function requestApi(getAccessTokenSilently, path, { method = 'GET', body, timeoutMs } = {}) {
  const accessToken = await withTimeout(getAccessTokenSilently());
  const headers = { Authorization: `Bearer ${accessToken}` };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  return fetchJsonWithTimeout(
    `${import.meta.env.VITE_API_BASE_URL}${path}`,
    { method, headers, body: body === undefined ? undefined : JSON.stringify(body) },
    timeoutMs,
  );
}

export { fetchJsonWithTimeout, requestApi, withTimeout };
