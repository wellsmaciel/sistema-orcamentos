import { validateQuoteId, validateQuoteInput, validateQuoteUpdateInput, validateQuoteResponseInput } from '../validators/quote.js';
import { validateQuoteListInput } from '../validators/quote-list.js';
import { validateQuoteDescriptionReviewInput } from '../validators/quote-description-review.js';
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
function validateQuoteUpdate(request, response, next) {
  const details = validateQuoteUpdateInput(request.body);

  if (details.length > 0) {
    return response.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Os dados informados são inválidos.',
      details,
    });
  }

  return next();
}
function validateQuoteIdParameter(request, response, next) {
  const details = validateQuoteId(request.params.quoteId);

  if (details.length > 0) {
    return response.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Os dados informados são inválidos.',
      details,
    });
  }

  return next();
}
function validateQuoteResponse(request, response, next) {
  const details = validateQuoteResponseInput(request.body);

  if (details.length > 0) {
    return response.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Os dados informados são inválidos.',
      details,
    });
  }

  return next();
}
function validateQuoteListQuery(request, response, next) {
  const details = validateQuoteListInput(request.query);

  if (details.length > 0) {
    return response.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Os dados informados são inválidos.',
      details,
    });
  }

  const { page = '1', search = '', status = '', serviceDateFrom = '', serviceDateTo = '' } = request.query;

  request.quoteListOptions = {
    page: Number(page),
    pageSize: 20,
    search: search.trim(),
    status: status || undefined,
    serviceDateFrom: serviceDateFrom || undefined,
    serviceDateTo: serviceDateTo || undefined,
  };

  return next();
}
function validateQuoteDescriptionReview(request, response, next) {
  const details = validateQuoteDescriptionReviewInput(request.body);

  if (details.length > 0) {
    return response.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Os dados informados são inválidos.',
      details,
    });
  }

  return next();
}
export { validateQuote, validateQuoteUpdate, validateQuoteIdParameter, validateQuoteResponse, validateQuoteListQuery, validateQuoteDescriptionReview };
