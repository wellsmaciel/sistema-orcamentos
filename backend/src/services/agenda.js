import { Op } from 'sequelize';

import Quote from '../models/quote.js';
import { getCurrentDate } from '../validators/quote.js';

// Agenda do prestador: orçamentos aceitos com serviço de hoje em diante (pelo horário de Brasília),
// do mais próximo para o mais distante. Serviços com data já passada não aparecem.
async function listUpcomingServices(userId, { now = new Date(), limit = 5, transaction } = {}) {
  const today = getCurrentDate(now);
  const where = { userId, status: 'ACCEPTED', serviceDate: { [Op.gte]: today } };

  const quotes = await Quote.findAll({
    where,
    order: [['serviceDate', 'ASC'], ['quoteNumber', 'ASC']],
    limit,
    transaction,
  });
  const total = await Quote.count({ where, transaction });

  return {
    today,
    total,
    items: quotes.map((quote) => ({
      quoteId: quote.id,
      quoteNumber: quote.quoteNumber,
      clientName: quote.clientName,
      description: quote.description,
      totalAmount: quote.totalAmount,
      serviceDate: quote.serviceDate,
      serviceAddress: {
        street: quote.serviceStreet,
        number: quote.serviceNumber,
        complement: quote.serviceComplement,
        district: quote.serviceDistrict,
        city: quote.serviceCity,
        state: quote.serviceState,
        postalCode: quote.servicePostalCode,
      },
    })),
  };
}

export { listUpcomingServices };
