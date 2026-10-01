import { Op } from 'sequelize';

import Quote from '../models/quote.js';
import User from '../models/user.js';

const RESPONSE_STATUSES = ['ACCEPTED', 'REJECTED'];

// Respostas dos clientes aos orçamentos do prestador, das mais recentes para as mais antigas.
// É "nova" a resposta recebida depois da última vez que o prestador marcou os avisos como vistos.
async function listResponseNotifications(userId, { limit = 5, transaction } = {}) {
  const user = await User.findByPk(userId, { attributes: ['id', 'responseNotificationsSeenAt'], transaction });
  const seenAt = user?.responseNotificationsSeenAt ?? null;
  const respondedWhere = { userId, status: { [Op.in]: RESPONSE_STATUSES }, respondedAt: { [Op.ne]: null } };

  const quotes = await Quote.findAll({
    attributes: ['id', 'quoteNumber', 'clientName', 'status', 'rejectionReason', 'respondedAt'],
    where: respondedWhere,
    order: [['respondedAt', 'DESC'], ['quoteNumber', 'DESC']],
    limit,
    transaction,
  });
  const unreadCount = await Quote.count({
    where: seenAt ? { ...respondedWhere, respondedAt: { [Op.gt]: seenAt } } : respondedWhere,
    transaction,
  });

  return {
    unreadCount,
    items: quotes.map((quote) => ({
      quoteId: quote.id,
      quoteNumber: quote.quoteNumber,
      clientName: quote.clientName,
      decision: quote.status,
      rejectionReason: quote.status === 'REJECTED' ? quote.rejectionReason ?? null : null,
      respondedAt: quote.respondedAt,
      unread: !seenAt || quote.respondedAt > seenAt,
    })),
  };
}

async function markResponseNotificationsRead(userId, { now = new Date(), transaction } = {}) {
  await User.update({ responseNotificationsSeenAt: now }, { where: { id: userId }, transaction });
}

export { listResponseNotifications, markResponseNotificationsRead };
