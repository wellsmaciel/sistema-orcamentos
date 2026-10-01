import { QueryTypes } from 'sequelize';

import sequelize from '../config/database.js';

const PERIODS = ['month', 'quarter', 'year', 'all'];
const STATUSES = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED'];

// O Brasil não tem horário de verão desde 2019, então o fuso de Brasília é sempre -03:00.
const BRAZIL_OFFSET = '-03:00';

function getBrazilDateParts(now) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).formatToParts(now);

  return {
    year: Number(parts.find((part) => part.type === 'year').value),
    month: Number(parts.find((part) => part.type === 'month').value),
  };
}

// Início do período no horário de Brasília: o mês atual, os últimos 3 meses (contando o atual) ou o ano.
function getPeriodStart(period, now = new Date()) {
  if (period === 'all') {
    return null;
  }

  const { year, month } = getBrazilDateParts(now);
  let startYear = year;
  let startMonth = month;

  if (period === 'quarter') {
    startMonth = month - 2;

    if (startMonth < 1) {
      startMonth += 12;
      startYear -= 1;
    }
  }

  if (period === 'year') {
    startMonth = 1;
  }

  return new Date(`${startYear}-${String(startMonth).padStart(2, '0')}-01T00:00:00${BRAZIL_OFFSET}`);
}

function toMoney(value) {
  return Number(value ?? 0).toFixed(2);
}

async function getManagementSummary(userId, { period = 'month', now = new Date(), transaction } = {}) {
  const periodStart = getPeriodStart(period, now);
  const replacements = { userId, periodStart };
  const periodFilter = periodStart ? 'AND created_at >= :periodStart' : '';

  const statusRows = await sequelize.query(
    `SELECT status, COUNT(*)::int AS count, COALESCE(SUM(total_amount), 0) AS total
       FROM quotes
      WHERE user_id = :userId ${periodFilter}
      GROUP BY status`,
    { replacements, type: QueryTypes.SELECT, transaction },
  );

  const [responseRow] = await sequelize.query(
    `SELECT AVG(EXTRACT(EPOCH FROM (responded_at - sent_at)) / 3600) AS average_hours
       FROM quotes
      WHERE user_id = :userId ${periodFilter}
        AND status IN ('ACCEPTED', 'REJECTED') AND sent_at IS NOT NULL AND responded_at IS NOT NULL`,
    { replacements, type: QueryTypes.SELECT, transaction },
  );

  // Os orçamentos ainda sem resposta aparecem independentemente do período: continuam pendentes.
  const awaitingRows = await sequelize.query(
    `SELECT id, quote_number, client_name, total_amount, sent_at
       FROM quotes
      WHERE user_id = :userId AND status = 'SENT'
      ORDER BY sent_at ASC, quote_number ASC
      LIMIT 5`,
    { replacements, type: QueryTypes.SELECT, transaction },
  );

  const clientRows = await sequelize.query(
    `SELECT client_id, MAX(client_name) AS client_name, COUNT(*)::int AS accepted_count, SUM(total_amount) AS accepted_amount
       FROM quotes
      WHERE user_id = :userId AND status = 'ACCEPTED' ${periodFilter}
      GROUP BY client_id
      ORDER BY accepted_amount DESC, client_name ASC
      LIMIT 5`,
    { replacements, type: QueryTypes.SELECT, transaction },
  );

  const byStatus = Object.fromEntries(STATUSES.map((status) => [status, { count: 0, total: 0 }]));

  for (const row of statusRows) {
    byStatus[row.status] = { count: row.count, total: Number(row.total) };
  }

  const answered = byStatus.ACCEPTED.count + byStatus.REJECTED.count;
  const averageHours = responseRow?.average_hours === null || responseRow?.average_hours === undefined ? null : Number(responseRow.average_hours);

  return {
    period,
    periodStart: periodStart ? periodStart.toISOString() : null,
    totalQuotes: STATUSES.reduce((sum, status) => sum + byStatus[status].count, 0),
    statusCounts: Object.fromEntries(STATUSES.map((status) => [status, byStatus[status].count])),
    acceptanceRate: answered > 0 ? Number((byStatus.ACCEPTED.count / answered).toFixed(4)) : null,
    acceptedAmount: toMoney(byStatus.ACCEPTED.total),
    openAmount: toMoney(byStatus.SENT.total),
    averageResponseHours: averageHours === null ? null : Number(averageHours.toFixed(1)),
    awaitingResponse: awaitingRows.map((row) => ({
      quoteId: row.id,
      quoteNumber: row.quote_number,
      clientName: row.client_name,
      totalAmount: toMoney(row.total_amount),
      sentAt: new Date(row.sent_at).toISOString(),
      daysWaiting: Math.floor((now.getTime() - new Date(row.sent_at).getTime()) / 86400000),
    })),
    topClients: clientRows.map((row) => ({
      clientId: row.client_id,
      clientName: row.client_name,
      acceptedCount: row.accepted_count,
      acceptedAmount: toMoney(row.accepted_amount),
    })),
  };
}

export { PERIODS, getManagementSummary, getPeriodStart };
