import Client from '../models/client.js';
import Quote from '../models/quote.js';
import Company from '../models/company.js';
import { randomBytes } from 'node:crypto';
import { Op } from 'sequelize';
const PUBLIC_TOKEN_PATTERN = /^[0-9a-f]{64}$/;

function normalizeOptionalString(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value.trim();

  return normalizedValue || null;
}

function normalizeAmount(value) {
  const [integerPart, decimalPart = ''] = value.trim().split('.');

  return `${integerPart}.${decimalPart.padEnd(2, '0')}`;
}

async function createQuote(userId, input, { transaction } = {}) {
  const client = await Client.findOne({
    where: {
      id: input.clientId.trim(),
      userId,
      active: true,
    },
    transaction,
  });

  if (!client) {
    return null;
  }

  const { serviceAddress } = input;

  return Quote.create(
    {
      userId,
      clientId: client.id,
      clientName: client.name,
      clientEmail: client.email,
      clientPhone: client.phone,
      description: input.description.trim(),
      totalAmount: normalizeAmount(input.totalAmount),
      serviceDate: input.serviceDate,
      serviceStreet: serviceAddress.street.trim(),
      serviceNumber: serviceAddress.number.trim(),
      serviceComplement: normalizeOptionalString(serviceAddress.complement),
      servicePostalCode: serviceAddress.postalCode.trim(),
      serviceDistrict: serviceAddress.district.trim(),
      serviceCity: serviceAddress.city.trim(),
      serviceState: serviceAddress.state.trim(),
      locationNotes: normalizeOptionalString(input.locationNotes),
    },
    {
      transaction,
    },
  );
}
async function listQuotes(userId, { transaction } = {}) {
  return Quote.findAll({
    where: {
      userId,
    },
    order: [['created_at', 'DESC']],
    transaction,
  });
}
async function updateQuote(userId, quoteId, input, { transaction } = {}) {
  const quote = await Quote.findOne({
    where: {
      id: quoteId,
      userId,
    },
    transaction,
  });

  if (!quote) {
    return {
      outcome: 'NOT_FOUND',
    };
  }

  if (quote.status !== 'DRAFT') {
    return {
      outcome: 'NOT_EDITABLE',
    };
  }

  const { serviceAddress } = input;

  const updatedQuote = await quote.update(
    {
      description: input.description.trim(),
      totalAmount: normalizeAmount(input.totalAmount),
      serviceDate: input.serviceDate,
      serviceStreet: serviceAddress.street.trim(),
      serviceNumber: serviceAddress.number.trim(),
      serviceComplement: normalizeOptionalString(serviceAddress.complement),
      servicePostalCode: serviceAddress.postalCode.trim(),
      serviceDistrict: serviceAddress.district.trim(),
      serviceCity: serviceAddress.city.trim(),
      serviceState: serviceAddress.state.trim(),
      locationNotes: normalizeOptionalString(input.locationNotes),
    },
    {
      transaction,
    },
  );

  return {
    outcome: 'UPDATED',
    quote: updatedQuote,
  };
}
async function confirmQuote(userId, quoteId, { transaction } = {}) {
  const quote = await Quote.findOne({
    where: {
      id: quoteId,
      userId,
    },
    transaction,
  });

  if (!quote) {
    return {
      outcome: 'NOT_FOUND',
    };
  }

  if (quote.status !== 'DRAFT') {
    return {
      outcome: 'NOT_CONFIRMABLE',
    };
  }
  const company = await Company.findOne({
    where: {
      ownerUserId: userId,
      active: true,
    },
    transaction,
  });

  if (!company) {
    return {
      outcome: 'COMPANY_NOT_FOUND',
    };
  }

  const publicToken = randomBytes(32).toString('hex');

  const confirmedQuote = await quote.update(
    {
      status: 'SENT',
      publicToken,
      sentAt: new Date(),
      providerName: company.name,
      providerEmail: company.email,
      providerPhone: company.phone,
      providerTaxId: company.taxId,
      providerStreet: company.street,
      providerNumber: company.number,
      providerComplement: company.complement,
      providerPostalCode: company.postalCode,
      providerDistrict: company.district,
      providerCity: company.city,
      providerState: company.state,
    },
    {
      transaction,
    },
  );

  return {
    outcome: 'CONFIRMED',
    quote: confirmedQuote,
  };
}
async function getPublicQuote(publicToken, { transaction } = {}) {
  if (typeof publicToken !== 'string' || !PUBLIC_TOKEN_PATTERN.test(publicToken)) {
    return null;
  }

  return Quote.findOne({
    where: {
      publicToken,
      status: ['SENT', 'ACCEPTED', 'REJECTED'],
    },
    transaction,
  });
}
async function respondToPublicQuote(publicToken, input, { transaction } = {}) {
  const quote = await getPublicQuote(publicToken, {
    transaction,
  });

  if (!quote) {
    return {
      outcome: 'NOT_FOUND',
    };
  }

  if (quote.status !== 'SENT') {
    return {
      outcome: 'NOT_RESPONDABLE',
    };
  }

  const rejectionReason = input.decision === 'REJECTED' ? normalizeOptionalString(input.reason) : null;

  const respondedQuote = await quote.update(
    {
      status: input.decision,
      respondedAt: new Date(),
      rejectionReason,
    },
    {
      transaction,
    },
  );

  return {
    outcome: 'RESPONDED',
    quote: respondedQuote,
  };
}
async function createQuoteCorrection(userId, quoteId, { transaction } = {}) {
  const originalQuote = await Quote.findOne({
    where: {
      id: quoteId,
      userId,
    },
    transaction,
  });

  if (!originalQuote) {
    return {
      outcome: 'NOT_FOUND',
    };
  }

  if (originalQuote.status !== 'REJECTED') {
    return {
      outcome: 'NOT_CORRECTABLE',
    };
  }

  const existingCorrection = await Quote.findOne({
    where: {
      correctedFromId: originalQuote.id,
    },
    transaction,
  });

  if (existingCorrection) {
    return {
      outcome: 'ALREADY_CORRECTED',
      quote: existingCorrection,
    };
  }

  const correction = await Quote.create(
    {
      userId: originalQuote.userId,
      clientId: originalQuote.clientId,
      clientName: originalQuote.clientName,
      clientEmail: originalQuote.clientEmail,
      clientPhone: originalQuote.clientPhone,
      description: originalQuote.description,
      totalAmount: originalQuote.totalAmount,
      serviceDate: originalQuote.serviceDate,
      serviceStreet: originalQuote.serviceStreet,
      serviceNumber: originalQuote.serviceNumber,
      serviceComplement: originalQuote.serviceComplement,
      servicePostalCode: originalQuote.servicePostalCode,
      serviceDistrict: originalQuote.serviceDistrict,
      serviceCity: originalQuote.serviceCity,
      serviceState: originalQuote.serviceState,
      locationNotes: originalQuote.locationNotes,
      correctedFromId: originalQuote.id,
    },
    {
      transaction,
    },
  );

  return {
    outcome: 'CORRECTION_CREATED',
    quote: correction,
  };
}
async function listQuotesPage(userId, { search = '', status, serviceDateFrom, serviceDateTo, page = 1, pageSize = 20, transaction } = {}) {
  const where = {
    userId,
  };

  const normalizedSearch = search.trim();

  if (normalizedSearch) {
    const escapedSearch = normalizedSearch.replace(/[\\%_]/g, '\\$&');

    where.clientName = {
      [Op.iLike]: `%${escapedSearch}%`,
    };
  }

  if (status) {
    where.status = status;
  }

  if (serviceDateFrom || serviceDateTo) {
    where.serviceDate = {};

    if (serviceDateFrom) {
      where.serviceDate[Op.gte] = serviceDateFrom;
    }

    if (serviceDateTo) {
      where.serviceDate[Op.lte] = serviceDateTo;
    }
  }

  const { rows, count } = await Quote.findAndCountAll({
    where,
    order: [
      ['created_at', 'DESC'],
      ['quoteNumber', 'DESC'],
    ],
    limit: pageSize,
    offset: (page - 1) * pageSize,
    transaction,
  });

  let relatedQuotes = [];

  if (rows.length > 0) {
    const pageQuoteIds = rows.map((quote) => quote.id);

    const originalQuoteIds = rows.map((quote) => quote.correctedFromId).filter(Boolean);

    const relatedConditions = [
      {
        correctedFromId: {
          [Op.in]: pageQuoteIds,
        },
      },
    ];

    if (originalQuoteIds.length > 0) {
      relatedConditions.push({
        id: {
          [Op.in]: originalQuoteIds,
        },
      });
    }

    relatedQuotes = await Quote.findAll({
      attributes: ['id', 'quoteNumber', 'correctedFromId'],
      where: {
        userId,
        [Op.or]: relatedConditions,
      },
      transaction,
      raw: true,
    });
  }

  return {
    items: rows,
    relatedQuotes,
    total: count,
    page,
    pageSize,
    totalPages: Math.ceil(count / pageSize),
  };
}
export { createQuote, listQuotes, updateQuote, confirmQuote, getPublicQuote, respondToPublicQuote, createQuoteCorrection, listQuotesPage };
