const userInfoEndpoint = `https://${process.env.AUTH0_DOMAIN}/userinfo`;

async function getUserInfo(accessToken) {
  const response = await fetch(userInfoEndpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Não foi possível consultar o perfil no Auth0.');
  }

  const profile = await response.json();

  if (!profile.sub || !profile.name || !profile.email) {
    throw new Error('O Auth0 retornou um perfil incompleto.');
  }

  return profile;
}

export { getUserInfo };
