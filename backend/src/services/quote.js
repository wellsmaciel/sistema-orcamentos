import Client from '../models/client.js';
import Quote from '../models/quote.js';
import Company from '../models/company.js';
import { randomBytes } from 'node:crypto';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import QuoteItem from '../models/quote-item.js';
import QuoteEvent from '../models/quote-event.js';
import { calculateItemsTotal } from '../utils/quote-pricing.js';
import { normalizeStoredQuantity } from '../utils/quote-quantity.js';
import { diffQuoteSnapshots, snapshotQuote } from '../utils/quote-history.js';
import { parseQuoteNumberSearch } from '../utils/quote-search.js';
import { validateQuoteItemsInput } from '../validators/quote-items.js';
import { getCurrentDate } from '../validators/quote.js';

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

// Campos do orçamento vindos do formulário, iguais na criação e na edição.
function buildQuoteFields(input) {
  const { serviceAddress } = input;

  return {
    description: input.description.trim(),
    pricingMode: input.pricingMode,
    totalAmount: input.pricingMode === 'ITEMIZED' ? calculateItemsTotal(input.items) : normalizeAmount(input.totalAmount),
    serviceDate: input.serviceDate,
    serviceStreet: serviceAddress.street.trim(),
    serviceNumber: serviceAddress.number.trim(),
    serviceComplement: normalizeOptionalString(serviceAddress.complement),
    servicePostalCode: serviceAddress.postalCode.trim(),
    serviceDistrict: serviceAddress.district.trim(),
    serviceCity: serviceAddress.city.trim(),
    serviceState: serviceAddress.state.trim(),
    locationNotes: normalizeOptionalString(input.locationNotes),
  };
}

function buildItemRows(quoteId, input) {
  return input.items.map((item, index) => ({
    quoteId,
    description: item.description.trim(),
    quantity: item.quantity.trim(),
    unitPrice: input.pricingMode === 'ITEMIZED' ? normalizeAmount(item.unitPrice) : null,
    position: index + 1,
  }));
}

// Reserva o próximo número de orçamento do prestador. O UPDATE trava a linha do usuário até o fim da
// transação, então dois orçamentos criados ao mesmo tempo nunca recebem o mesmo número.
async function nextQuoteNumber(userId, transaction) {
  const [rows] = await sequelize.query(
    'UPDATE users SET last_quote_number = last_quote_number + 1 WHERE id = :userId RETURNING last_quote_number',
    { replacements: { userId }, transaction },
  );

  return rows[0].last_quote_number;
}

function assertValidItemsInput(input) {
  const details = validateQuoteItemsInput(input);

  if (details.length > 0) {
    const error = new RangeError('Os itens ou a forma de cobrança são inválidos.');
    error.details = details;
    throw error;
  }
}

// Confere de novo os itens já salvos antes de enviar ou copiar um orçamento.
// Registros antigos podem ter sido gravados com regras anteriores.
function validateStoredPricing(quote, items) {
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

  return details;
}

async function createQuote(userId, input, { transaction } = {}) {
  assertValidItemsInput(input);

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

    const quote = await Quote.create(
      {
        userId,
        quoteNumber: await nextQuoteNumber(userId, writeTransaction),
        clientId: client.id,
        clientName: client.name,
        clientEmail: client.email,
        clientPhone: client.phone,
        ...buildQuoteFields(input),
      },
      {
        transaction: writeTransaction,
      },
    );

    await QuoteItem.bulkCreate(buildItemRows(quote.id, input), {
      transaction: writeTransaction,
      validate: true,
    });

    const savedQuote = await quote.reload({
      include: buildQuoteItemsInclude(),
      transaction: writeTransaction,
    });

    await QuoteEvent.create({
      quoteId: quote.id,
      eventType: 'CREATED',
      actorType: 'PROVIDER',
      details: { after: snapshotQuote(savedQuote) },
    }, { transaction: writeTransaction });

    return savedQuote;
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

    assertValidItemsInput(input);

    const previousItems = await QuoteItem.findAll({
      where: { quoteId: quote.id },
      order: [['position', 'ASC']],
      transaction: writeTransaction,
    });
    const previousSnapshot = snapshotQuote(quote, previousItems);

    const updatedQuote = await quote.update(
      buildQuoteFields(input),
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

    await QuoteItem.bulkCreate(buildItemRows(quote.id, input), {
      transaction: writeTransaction,
      validate: true,
    });

    const savedQuote = await updatedQuote.reload({
      include: buildQuoteItemsInclude(),
      transaction: writeTransaction,
    });
    const changes = diffQuoteSnapshots(previousSnapshot, snapshotQuote(savedQuote));

    if (changes.length > 0) {
      await QuoteEvent.create({
        quoteId: quote.id,
        eventType: 'UPDATED',
        actorType: 'PROVIDER',
        details: { changes },
      }, { transaction: writeTransaction });
    }

    return {
      outcome: 'UPDATED',
      quote: savedQuote,
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

    // Um rascunho antigo pode ter uma data que já passou; o cliente não deve receber o orçamento assim.
    if (quote.serviceDate < getCurrentDate()) {
      return {
        outcome: 'SERVICE_DATE_IN_PAST',
      };
    }

    const items = await QuoteItem.findAll({
      where: {
        quoteId: quote.id,
      },
      order: [['position', 'ASC']],
      transaction: writeTransaction,
    });

    const details = validateStoredPricing(quote, items);

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

    const savedQuote = await confirmedQuote.reload({
      include: buildQuoteItemsInclude(),
      transaction: writeTransaction,
    });

    await QuoteEvent.create({
      quoteId: quote.id,
      eventType: 'CONFIRMED',
      actorType: 'PROVIDER',
      details: { after: snapshotQuote(savedQuote) },
    }, { transaction: writeTransaction });

    return {
      outcome: 'CONFIRMED',
      quote: savedQuote,
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
  if (typeof publicToken !== 'string' || !PUBLIC_TOKEN_PATTERN.test(publicToken)) {
    return { outcome: 'NOT_FOUND' };
  }

  return sequelize.transaction({ transaction }, async (writeTransaction) => {
    const quote = await Quote.findOne({
      where: { publicToken, status: ['SENT', 'ACCEPTED', 'REJECTED'] },
      transaction: writeTransaction,
      lock: writeTransaction.LOCK.UPDATE,
    });

    if (!quote) {
      return { outcome: 'NOT_FOUND' };
    }

    if (quote.status !== 'SENT') {
      return { outcome: 'NOT_RESPONDABLE' };
    }

    const rejectionReason = input.decision === 'REJECTED' ? normalizeOptionalString(input.reason) : null;

    const respondedQuote = await quote.update({
      status: input.decision,
      respondedAt: new Date(),
      rejectionReason,
    }, { transaction: writeTransaction });

    await QuoteEvent.create({
      quoteId: quote.id,
      eventType: input.decision,
      actorType: 'CLIENT',
      details: rejectionReason ? { rejectionReason } : {},
    }, { transaction: writeTransaction });

    return {
      outcome: 'RESPONDED',
      quote: await respondedQuote.reload({
        include: buildQuoteItemsInclude(),
        transaction: writeTransaction,
      }),
    };
  });
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

    const details = validateStoredPricing(originalQuote, originalItems);

    if (details.length > 0) {
      return {
        outcome: 'INVALID_ITEMS',
        details,
      };
    }

    const correction = await Quote.create(
      {
        userId: originalQuote.userId,
        quoteNumber: await nextQuoteNumber(originalQuote.userId, writeTransaction),
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

    const savedCorrection = await correction.reload({
      include: buildQuoteItemsInclude(),
      transaction: writeTransaction,
    });

    await QuoteEvent.bulkCreate([
      {
        quoteId: originalQuote.id,
        eventType: 'CORRECTION_CREATED',
        actorType: 'PROVIDER',
        details: { correctionQuoteId: correction.id, correctionQuoteNumber: correction.quoteNumber },
      },
      {
        quoteId: correction.id,
        eventType: 'CREATED_FROM_CORRECTION',
        actorType: 'PROVIDER',
        details: { originalQuoteId: originalQuote.id, originalQuoteNumber: originalQuote.quoteNumber, after: snapshotQuote(savedCorrection) },
      },
    ], { transaction: writeTransaction });

    return {
      outcome: 'CORRECTION_CREATED',
      quote: savedCorrection,
    };
  });
}
async function getQuoteHistory(userId, quoteId, { transaction } = {}) {
  const quote = await Quote.findOne({
    where: { id: quoteId, userId },
    attributes: ['id'],
    transaction,
  });

  if (!quote) {
    return null;
  }

  return QuoteEvent.findAll({
    where: { quoteId },
    order: [['sequence', 'ASC']],
    transaction,
  });
}
async function listQuotesPage(userId, { search = '', status, serviceDateFrom, serviceDateTo, page = 1, pageSize = 20, transaction } = {}) {
  const where = {
    userId,
  };

  const normalizedSearch = search.trim();

  if (normalizedSearch) {
    const escapedSearch = normalizedSearch.replace(/[\\%_]/g, '\\$&');

    const clientNameCondition = {
      clientName: {
        [Op.iLike]: `%${escapedSearch}%`,
      },
    };
    const quoteNumber = parseQuoteNumberSearch(normalizedSearch);

    // Só números (ou "nº 123"): procura pelo número do orçamento e também pelo nome, que pode ter dígitos.
    if (quoteNumber) {
      where[Op.or] = [{ quoteNumber }, clientNameCondition];
    } else {
      Object.assign(where, clientNameCondition);
    }
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
export { createQuote, updateQuote, confirmQuote, getPublicQuote, respondToPublicQuote, createQuoteCorrection, listQuotesPage, getQuoteHistory };
