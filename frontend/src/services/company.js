async function requestCompany(getAccessTokenSilently) {
  const accessToken = await getAccessTokenSilently();

  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/company`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const responseBody = await response.json();

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(responseBody.message ?? 'Não foi possível consultar os dados profissionais.');
  }

  return responseBody;
}

async function saveCompany(getAccessTokenSilently, company) {
  const accessToken = await getAccessTokenSilently();

  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/company`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(company),
  });

  const responseBody = await response.json();

  if (!response.ok) {
    throw new Error(responseBody.message ?? 'Não foi possível salvar os dados profissionais.');
  }

  return responseBody;
}

export { requestCompany, saveCompany };
