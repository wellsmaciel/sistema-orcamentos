function getAuthenticatedUser(request, response) {
  const user = request.authenticatedUser;

  return response.status(200).json({
    id: user.id,
    name: user.name,
    email: user.email,
  });
}

export { getAuthenticatedUser };
