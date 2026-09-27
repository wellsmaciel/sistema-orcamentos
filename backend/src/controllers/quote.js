import { createQuote as createQuoteService, listQuotes as listQuotesService, updateQuote as updateQuoteService } from '../services/quote.js';

function serializeQuote(quote) {
  const serviceAddress = {
    street: quote.serviceStreet,
    number: quote.serviceNumber,
    postalCode: quote.servicePostalCode,
    district: quote.serviceDistrict,
    city: quote.serviceCity,
    state: quote.serviceState,
  };

  if (quote.serviceComplement) {
    serviceAddress.complement = quote.serviceComplement;
  }

  const responseBody = {
    id: quote.id,
    quoteNumber: quote.quoteNumber,
    client: {
      id: quote.clientId,
      name: quote.clientName,
      email: quote.clientEmail,
      phone: quote.clientPhone,
    },
    description: quote.description,
    totalAmount: quote.totalAmount,
    serviceDate: quote.serviceDate,
    serviceAddress,
    status: quote.status,
    createdAt: quote.created_at,
  };

  if (quote.locationNotes) {
    responseBody.locationNotes = quote.locationNotes;
  }

  return responseBody;
}

async function createQuote(request, response, next) {
  try {
    const quote = await createQuoteService(request.authenticatedUser.id, request.body);

    if (!quote) {
      return response.status(404).json({
        code: 'CLIENT_NOT_FOUND',
        message: 'Cliente não encontrado.',
      });
    }

    return response.status(201).json(serializeQuote(quote));
  } catch (error) {
    return next(error);
  }
}
async function listQuotes(request, response, next) {
  try {
    const quotes = await listQuotesService(request.authenticatedUser.id);

    return response.status(200).json({
      items: quotes.map(serializeQuote),
    });
  } catch (error) {
    return next(error);
  }
}
async function updateQuote(request, response, next) {
  try {
    const result = await updateQuoteService(request.authenticatedUser.id, request.params.quoteId, request.body);

    if (result.outcome === 'NOT_FOUND') {
      return response.status(404).json({
        code: 'QUOTE_NOT_FOUND',
        message: 'Orçamento não encontrado.',
      });
    }

    if (result.outcome === 'NOT_EDITABLE') {
      return response.status(409).json({
        code: 'QUOTE_NOT_EDITABLE',
        message: 'Somente orçamentos em rascunho podem ser alterados.',
      });
    }

    return response.status(200).json(serializeQuote(result.quote));
  } catch (error) {
    return next(error);
  }
}
export { createQuote, listQuotes, updateQuote };
