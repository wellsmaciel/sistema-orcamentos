async function requestClients(getAccessTokenSilently) {
  const accessToken = await getAccessTokenSilently();

  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/clients`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const responseBody = await response.json();

  if (!response.ok) {
    throw new Error(responseBody.message ?? 'Não foi possível consultar os clientes.');
  }

  return responseBody.items;
}

export { requestClients };
