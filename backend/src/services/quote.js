import Client from '../models/client.js';
import Quote from '../models/quote.js';
import Company from '../models/company.js';
import { randomBytes } from 'node:crypto';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import QuoteItem from '../models/quote-item.js';
import { calculateItemsTotal } from '../utils/quote-pricing.js';
import { normalizeStoredQuantity } from '../utils/quote-quantity.js';
import { validateQuoteItemsInput } from '../validators/quote-items.js';

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
  const details = validateQuoteItemsInput(input);

  if (details.length > 0) {
    const error = new RangeError('Os itens ou a forma de cobrança são inválidos.');
    error.details = details;
    throw error;
  }

  const totalAmount = input.pricingMode === 'ITEMIZED' ? calculateItemsTotal(input.items) : normalizeAmount(input.totalAmount);

  return sequelize.transaction({ transaction }, async (writeTransaction) => {
    const client = await Client.findOne({
      where: {
        id: input.clientId.trim(),
        userId,
        active: true,
      },
      transaction: writeTransaction,
      lock: writeTransaction.LOCK.UPDATE,
    });

    if (!client) {
      return null;
    }

    const { serviceAddress } = input;

    const quote = await Quote.create(
      {
        userId,
        clientId: client.id,
        clientName: client.name,
        clientEmail: client.email,
        clientPhone: client.phone,
        description: input.description.trim(),
        pricingMode: input.pricingMode,
        totalAmount,
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
        transaction: writeTransaction,
      },
    );

    const items = input.items.map((item, index) => ({
      quoteId: quote.id,
      description: item.description.trim(),
      quantity: item.quantity.trim(),
      unitPrice: input.pricingMode === 'ITEMIZED' ? normalizeAmount(item.unitPrice) : null,
      position: index + 1,
    }));

    await QuoteItem.bulkCreate(items, {
      transaction: writeTransaction,
      validate: true,
    });

    return quote.reload({
      include: buildQuoteItemsInclude(),
      transaction: writeTransaction,
    });
  });
}
async function listQuotes(userId, { transaction } = {}) {
  return Quote.findAll({
    where: {
      userId,
    },
    order: [['created_at', 'DESC']],
    include: buildQuoteItemsInclude(),
    transaction,
  });
}
async function updateQuote(userId, quoteId, input, { transaction } = {}) {
  return sequelize.transaction({ transaction }, async (writeTransaction) => {
    const quote = await Quote.findOne({
      where: {
        id: quoteId,
        userId,
      },
      transaction: writeTransaction,
      lock: writeTransaction.LOCK.UPDATE,
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

    const details = validateQuoteItemsInput(input);

    if (details.length > 0) {
      const error = new RangeError('Os itens ou a forma de cobrança são inválidos.');
      error.details = details;
      throw error;
    }

    const totalAmount = input.pricingMode === 'ITEMIZED' ? calculateItemsTotal(input.items) : normalizeAmount(input.totalAmount);

    const { serviceAddress } = input;

    const updatedQuote = await quote.update(
      {
        description: input.description.trim(),
        pricingMode: input.pricingMode,
        totalAmount,
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
        transaction: writeTransaction,
      },
    );

    await QuoteItem.destroy({
      where: {
        quoteId: quote.id,
      },
      transaction: writeTransaction,
    });

    const items = input.items.map((item, index) => ({
      quoteId: quote.id,
      description: item.description.trim(),
      quantity: item.quantity.trim(),
      unitPrice: input.pricingMode === 'ITEMIZED' ? normalizeAmount(item.unitPrice) : null,
      position: index + 1,
    }));

    await QuoteItem.bulkCreate(items, {
      transaction: writeTransaction,
      validate: true,
    });

    return {
      outcome: 'UPDATED',
      quote: await updatedQuote.reload({
        include: buildQuoteItemsInclude(),
        transaction: writeTransaction,
      }),
    };
  });
}
async function confirmQuote(userId, quoteId, { transaction } = {}) {
  return sequelize.transaction({ transaction }, async (writeTransaction) => {
    const quote = await Quote.findOne({
      where: {
        id: quoteId,
        userId,
      },
      transaction: writeTransaction,
      lock: writeTransaction.LOCK.UPDATE,
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

    const items = await QuoteItem.findAll({
      where: {
        quoteId: quote.id,
      },
      order: [['position', 'ASC']],
      transaction: writeTransaction,
    });

    const pricingInput = {
      pricingMode: quote.pricingMode,
      items: items.map((item) => ({
        description: item.description,
        quantity: normalizeStoredQuantity(item.quantity),
        unitPrice: item.unitPrice,
      })),
    };

    if (quote.pricingMode === 'FIXED_TOTAL') {
      pricingInput.totalAmount = quote.totalAmount;
    }

    const details = validateQuoteItemsInput(pricingInput);

    if (details.length === 0 && quote.pricingMode === 'ITEMIZED' && calculateItemsTotal(pricingInput.items) !== normalizeAmount(quote.totalAmount)) {
      details.push({
        field: 'totalAmount',
        message: 'O valor total não corresponde à soma dos itens.',
      });
    }

    if (details.length > 0) {
      return {
        outcome: 'INVALID_ITEMS',
        details,
      };
    }

    const company = await Company.findOne({
      where: {
        ownerUserId: userId,
        active: true,
      },
      transaction: writeTransaction,
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
        transaction: writeTransaction,
      },
    );

    return {
      outcome: 'CONFIRMED',
      quote: await confirmedQuote.reload({
        include: buildQuoteItemsInclude(),
        transaction: writeTransaction,
      }),
    };
  });
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
    include: buildQuoteItemsInclude(),
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
  return sequelize.transaction({ transaction }, async (writeTransaction) => {
    const originalQuote = await Quote.findOne({
      where: {
        id: quoteId,
        userId,
      },
      transaction: writeTransaction,
      lock: writeTransaction.LOCK.UPDATE,
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
        userId,
      },
      transaction: writeTransaction,
    });

    if (existingCorrection) {
      return {
        outcome: 'ALREADY_CORRECTED',
        quote: existingCorrection,
      };
    }

    const originalItems = await QuoteItem.findAll({
      where: {
        quoteId: originalQuote.id,
      },
      order: [['position', 'ASC']],
      transaction: writeTransaction,
    });

    const pricingInput = {
      pricingMode: originalQuote.pricingMode,
      items: originalItems.map((item) => ({
        description: item.description,
        quantity: normalizeStoredQuantity(item.quantity),
        unitPrice: item.unitPrice,
      })),
    };

    if (originalQuote.pricingMode === 'FIXED_TOTAL') {
      pricingInput.totalAmount = originalQuote.totalAmount;
    }

    const details = validateQuoteItemsInput(pricingInput);

    if (details.length === 0 && originalQuote.pricingMode === 'ITEMIZED' && calculateItemsTotal(pricingInput.items) !== normalizeAmount(originalQuote.totalAmount)) {
      details.push({
        field: 'totalAmount',
        message: 'O valor total não corresponde à soma dos itens.',
      });
    }

    if (details.length > 0) {
      return {
        outcome: 'INVALID_ITEMS',
        details,
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
        pricingMode: originalQuote.pricingMode,
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
        status: 'DRAFT',
      },
      {
        transaction: writeTransaction,
      },
    );

    const copiedItems = originalItems.map((item) => ({
      quoteId: correction.id,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      position: item.position,
    }));

    await QuoteItem.bulkCreate(copiedItems, {
      transaction: writeTransaction,
      validate: true,
    });

    return {
      outcome: 'CORRECTION_CREATED',
      quote: await correction.reload({
        include: buildQuoteItemsInclude(),
        transaction: writeTransaction,
      }),
    };
  });
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
    include: buildQuoteItemsInclude(),
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
function buildQuoteItemsInclude() {
  return [
    {
      model: QuoteItem,
      as: 'items',
      separate: true,
      order: [['position', 'ASC']],
    },
  ];
}
export { createQuote, listQuotes, updateQuote, confirmQuote, getPublicQuote, respondToPublicQuote, createQuoteCorrection, listQuotesPage };
