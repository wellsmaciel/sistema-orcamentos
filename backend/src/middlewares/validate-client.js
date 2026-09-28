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
function validateClientIdParameter(request, response, next) {
  const { clientId } = request.params;
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (typeof clientId !== 'string' || !uuidPattern.test(clientId)) {
    return response.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Os dados informados são inválidos.',
      details: [
        {
          field: 'clientId',
          message: 'Informe um identificador de cliente válido.',
        },
      ],
    });
  }

  return next();
}
function validateClientListQuery(request, response, next) {
  const { page = '1', active = 'true', search = '' } = request.query;

  const details = [];
  const pageNumber = Number(page);

  if (typeof page !== 'string' || !/^[1-9]\d*$/.test(page) || !Number.isSafeInteger(pageNumber) || pageNumber > 1000000) {
    details.push({
      field: 'page',
      message: 'Informe uma página entre 1 e 1000000.',
    });
  }

  if (active !== 'true' && active !== 'false') {
    details.push({
      field: 'active',
      message: 'Informe true para ativos ou false para inativos.',
    });
  }

  if (typeof search !== 'string' || search.trim().length > 150) {
    details.push({
      field: 'search',
      message: 'A busca deve ser um texto com até 150 caracteres.',
    });
  }

  if (details.length > 0) {
    return response.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Os dados informados são inválidos.',
      details,
    });
  }

  request.clientListOptions = {
    page: pageNumber,
    pageSize: 20,
    active: active === 'true',
    search: search.trim(),
  };

  return next();
}
export { validateClient, validateClientIdParameter, validateClientListQuery };
