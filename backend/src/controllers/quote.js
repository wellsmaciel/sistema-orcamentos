import {
  confirmQuote as confirmQuoteService,
  createQuote as createQuoteService,
  getPublicQuote as getPublicQuoteService,
  respondToPublicQuote as respondToPublicQuoteService,
  updateQuote as updateQuoteService,
  createQuoteCorrection as createQuoteCorrectionService,
  listQuotesPage as listQuotesPageService,
  getQuoteHistory as getQuoteHistoryService,
} from '../services/quote.js';
import { hasCompanyLogo } from '../services/company-logo.js';
import { serializeQuoteItems } from '../utils/quote-items-response.js';

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
    pricingMode: quote.pricingMode,
    items: serializeQuoteItems(quote),
    totalAmount: quote.totalAmount,
    serviceDate: quote.serviceDate,
    serviceAddress,
    status: quote.status,
    createdAt: quote.created_at,
  };

  if (quote.locationNotes) {
    responseBody.locationNotes = quote.locationNotes;
  }

  if (quote.publicToken) {
    responseBody.publicToken = quote.publicToken;
  }

  if (quote.sentAt) {
    responseBody.sentAt = quote.sentAt;
  }
  if (quote.respondedAt) {
    responseBody.respondedAt = quote.respondedAt;
  }

  if (quote.rejectionReason) {
    responseBody.rejectionReason = quote.rejectionReason;
  }
  if (quote.correctedFromId) {
    responseBody.correctedFromId = quote.correctedFromId;
  }
  return responseBody;
}
function serializePublicQuote(quote, hasProviderLogo = false) {
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
    quoteNumber: quote.quoteNumber,
    clientName: quote.clientName,
    description: quote.description,
    pricingMode: quote.pricingMode,
    items: serializeQuoteItems(quote),
    totalAmount: quote.totalAmount,
    serviceDate: quote.serviceDate,
    serviceAddress,
    status: quote.status,
    sentAt: quote.sentAt,
    hasProviderLogo,
  };

  if (quote.locationNotes) {
    responseBody.locationNotes = quote.locationNotes;
  }
  if (quote.respondedAt) {
    responseBody.respondedAt = quote.respondedAt;
  }

  if (quote.rejectionReason) {
    responseBody.rejectionReason = quote.rejectionReason;
  }
  if (quote.providerName) {
    const provider = {
      name: quote.providerName,
      email: quote.providerEmail,
      phone: quote.providerPhone,
    };

    if (quote.providerTaxId) {
      provider.taxId = quote.providerTaxId;
    }

    if (quote.providerStreet) {
      const address = {
        street: quote.providerStreet,
        number: quote.providerNumber,
        postalCode: quote.providerPostalCode,
        district: quote.providerDistrict,
        city: quote.providerCity,
        state: quote.providerState,
      };

      if (quote.providerComplement) {
        address.complement = quote.providerComplement;
      }

      provider.address = address;
    }

    responseBody.provider = provider;
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
async function confirmQuote(request, response, next) {
  try {
    const result = await confirmQuoteService(request.authenticatedUser.id, request.params.quoteId);

    if (result.outcome === 'NOT_FOUND') {
      return response.status(404).json({
        code: 'QUOTE_NOT_FOUND',
        message: 'Orçamento não encontrado.',
      });
    }

    if (result.outcome === 'NOT_CONFIRMABLE') {
      return response.status(409).json({
        code: 'QUOTE_NOT_CONFIRMABLE',
        message: 'Somente orçamentos em rascunho podem ser confirmados.',
      });
    }
    if (result.outcome === 'SERVICE_DATE_IN_PAST') {
      return response.status(409).json({
        code: 'QUOTE_SERVICE_DATE_PAST',
        message: 'A data do serviço já passou. Edite o rascunho e escolha uma nova data antes de confirmar.',
      });
    }
    if (result.outcome === 'COMPANY_NOT_FOUND') {
      return response.status(409).json({
        code: 'COMPANY_PROFILE_REQUIRED',
        message: 'Cadastre seus dados profissionais antes de confirmar o orçamento.',
      });
    }
    if (result.outcome === 'INVALID_ITEMS') {
      return response.status(409).json({
        code: 'QUOTE_ITEMS_INVALID',
        message: 'Revise os itens e o valor do orçamento antes de confirmar.',
        details: result.details,
      });
    }
    return response.status(200).json(serializeQuote(result.quote));
  } catch (error) {
    return next(error);
  }
}
async function getPublicQuote(request, response, next) {
  try {
    const quote = await getPublicQuoteService(request.params.publicToken);

    if (!quote) {
      return response.status(404).json({
        code: 'QUOTE_NOT_FOUND',
        message: 'Orçamento não encontrado ou link inválido.',
      });
    }

    return response.status(200).json(serializePublicQuote(quote, await hasCompanyLogo(quote.userId)));
  } catch (error) {
    return next(error);
  }
}
async function respondToPublicQuote(request, response, next) {
  try {
    const result = await respondToPublicQuoteService(request.params.publicToken, request.body);

    if (result.outcome === 'NOT_FOUND') {
      return response.status(404).json({
        code: 'QUOTE_NOT_FOUND',
        message: 'Orçamento não encontrado ou link inválido.',
      });
    }

    if (result.outcome === 'NOT_RESPONDABLE') {
      return response.status(409).json({
        code: 'QUOTE_ALREADY_RESPONDED',
        message: 'Este orçamento já recebeu uma resposta.',
      });
    }

    return response.status(200).json(serializePublicQuote(result.quote, await hasCompanyLogo(result.quote.userId)));
  } catch (error) {
    return next(error);
  }
}
async function createQuoteCorrection(request, response, next) {
  try {
    const result = await createQuoteCorrectionService(request.authenticatedUser.id, request.params.quoteId);

    if (result.outcome === 'NOT_FOUND') {
      return response.status(404).json({
        code: 'QUOTE_NOT_FOUND',
        message: 'Orçamento não encontrado.',
      });
    }

    if (result.outcome === 'NOT_CORRECTABLE') {
      return response.status(409).json({
        code: 'QUOTE_NOT_CORRECTABLE',
        message: 'Somente orçamentos recusados podem gerar uma correção.',
      });
    }

    if (result.outcome === 'ALREADY_CORRECTED') {
      return response.status(409).json({
        code: 'QUOTE_ALREADY_CORRECTED',
        message: 'Este orçamento já possui uma correção.',
      });
    }
    if (result.outcome === 'INVALID_ITEMS') {
      return response.status(409).json({
        code: 'QUOTE_ITEMS_INVALID',
        message: 'Os itens ou o valor do orçamento original são inválidos.',
        details: result.details,
      });
    }
    return response.status(201).json(serializeQuote(result.quote));
  } catch (error) {
    return next(error);
  }
}
async function listQuotesPage(request, response, next) {
  try {
    const result = await listQuotesPageService(request.authenticatedUser.id, request.quoteListOptions);

    const items = result.items.map((quote) => {
      const serializedQuote = serializeQuote(quote);

      const originalQuote = result.relatedQuotes.find((candidate) => candidate.id === quote.correctedFromId);

      const correction = result.relatedQuotes.find((candidate) => candidate.correctedFromId === quote.id);

      if (originalQuote) {
        serializedQuote.originalQuoteNumber = originalQuote.quoteNumber;
      }

      if (correction) {
        serializedQuote.correction = {
          id: correction.id,
          quoteNumber: correction.quoteNumber,
        };
      }

      return serializedQuote;
    });

    return response.status(200).json({
      items,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    });
  } catch (error) {
    return next(error);
  }
}
async function getQuoteHistory(request, response, next) {
  try {
    const events = await getQuoteHistoryService(request.authenticatedUser.id, request.params.quoteId);

    if (!events) {
      return response.status(404).json({
        code: 'QUOTE_NOT_FOUND',
        message: 'Orçamento não encontrado.',
      });
    }

    return response.status(200).json({
      items: events.map((event) => ({
        id: event.id,
        type: event.eventType,
        actor: event.actorType,
        details: event.details,
        createdAt: event.created_at,
      })),
    });
  } catch (error) {
    return next(error);
  }
}
export { createQuote, updateQuote, confirmQuote, getPublicQuote, respondToPublicQuote, createQuoteCorrection, listQuotesPage, getQuoteHistory };
