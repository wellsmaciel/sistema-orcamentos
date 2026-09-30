import { Op } from 'sequelize';

import sequelize from '../config/database.js';
import ActivityLog from '../models/activity-log.js';
import Client from '../models/client.js';

const ADDRESS_ATTRIBUTES = ['street', 'number', 'complement', 'postalCode', 'district', 'city', 'state'];

// Executa a ação e o registro da atividade na mesma transação: ou os dois ficam salvos, ou nenhum.
function withTransaction(transaction, callback) {
  return transaction ? callback(transaction) : sequelize.transaction(callback);
}

// Converte os atributos alterados do modelo nos nomes de campo da API, agrupando o endereço.
// Guarda apenas os nomes dos campos, nunca os valores, para não copiar dados pessoais.
function toChangedFields(changedAttributes) {
  const fields = new Set();

  for (const attribute of changedAttributes || []) {
    fields.add(ADDRESS_ATTRIBUTES.includes(attribute) ? 'address' : attribute);
  }

  return [...fields].sort();
}

async function recordActivity({ userId, action, entityType, entityId, details = {} }, { transaction } = {}) {
  return ActivityLog.create({ userId, action, entityType, entityId, details }, { transaction });
}

async function listActivitiesPage(userId, { page = 1, pageSize = 20, transaction } = {}) {
  const { rows, count } = await ActivityLog.findAndCountAll({
    where: { userId },
    order: [['sequence', 'DESC']],
    limit: pageSize,
    offset: (page - 1) * pageSize,
    transaction,
  });

  // O nome vem do cadastro atual: um cliente excluído deixa de ter nome no histórico.
  const clientIds = [...new Set(rows.filter((row) => row.entityType === 'CLIENT').map((row) => row.entityId))];
  const clients = clientIds.length > 0
    ? await Client.findAll({ attributes: ['id', 'name'], where: { id: { [Op.in]: clientIds }, userId }, transaction })
    : [];
  const clientNames = new Map(clients.map((client) => [client.id, client.name]));

  return {
    items: rows.map((row) => ({
      id: row.id,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      entityName: row.entityType === 'CLIENT' ? clientNames.get(row.entityId) ?? null : null,
      changedFields: row.details.changedFields ?? [],
      createdAt: row.created_at,
    })),
    total: count,
    page,
    pageSize,
    totalPages: Math.ceil(count / pageSize),
  };
}

export { listActivitiesPage, recordActivity, toChangedFields, withTransaction };
