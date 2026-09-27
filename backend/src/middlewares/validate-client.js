import { validateClientInput } from '../validators/client.js';

function validateClient(request, response, next) {
  const details = validateClientInput(request.body);

  if (details.length > 0) {
    return response.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Os dados informados são inválidos.',
      details,
    });
  }

  return next();
}

export { validateClient };
