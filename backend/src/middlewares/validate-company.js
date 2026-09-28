import { validateCompanyInput } from '../validators/company.js';

function validateCompany(request, response, next) {
  const details = validateCompanyInput(request.body);

  if (details.length > 0) {
    return response.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Os dados informados são inválidos.',
      details,
    });
  }

  return next();
}

export { validateCompany };
