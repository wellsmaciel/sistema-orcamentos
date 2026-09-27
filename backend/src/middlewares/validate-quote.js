import { validateQuoteInput } from '../validators/quote.js';

function validateQuote(request, response, next) {
  const details = validateQuoteInput(request.body);

  if (details.length > 0) {
    return response.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Os dados informados são inválidos.',
      details,
    });
  }

  return next();
}

export { validateQuote };
