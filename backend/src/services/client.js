import Client from '../models/client.js';
import sequelize from '../config/database.js';
import Quote from '../models/quote.js';
import { Op } from 'sequelize';

function normalizeOptionalString(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value.trim();

  return normalizedValue || null;
}

async function createClient(userId, input, { transaction } = {}) {
  const { address } = input;

  return Client.create(
    {
      userId,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone.trim(),
      street: address.street.trim(),
      number: address.number.trim(),
      complement: normalizeOptionalString(address.complement),
      postalCode: address.postalCode.trim(),
      district: address.district.trim(),
      city: address.city.trim(),
      state: address.state.trim(),
    },
    {
      transaction,
    },
  );
}
async function listClients(userId, { transaction } = {}) {
  return Client.findAll({
    where: {
      userId,
      active: true,
    },
    order: [
      ['name', 'ASC'],
      ['created_at', 'ASC'],
    ],
    transaction,
  });
}
async function updateClient(userId, clientId, input, { transaction } = {}) {
  const client = await Client.findOne({
    where: {
      id: clientId,
      userId,
    },
    transaction,
  });

  if (!client) {
    return {
      outcome: 'NOT_FOUND',
    };
  }

  const { address } = input;

  const updatedClient = await client.update(
    {
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone.trim(),
      street: address.street.trim(),
      number: address.number.trim(),
      complement: normalizeOptionalString(address.complement),
      postalCode: address.postalCode.trim(),
      district: address.district.trim(),
      city: address.city.trim(),
      state: address.state.trim(),
    },
    {
      transaction,
    },
  );

  return {
    outcome: 'UPDATED',
    client: updatedClient,
  };
}
async function deleteClient(userId, clientId, { transaction } = {}) {
  if (!transaction) {
    return sequelize.transaction((newTransaction) =>
      deleteClient(userId, clientId, {
        transaction: newTransaction,
      }),
    );
  }

  const client = await Client.findOne({
    where: {
      id: clientId,
      userId,
    },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!client) {
    return {
      outcome: 'NOT_FOUND',
    };
  }

  const linkedQuote = await Quote.findOne({
    attributes: ['id'],
    where: {
      clientId: client.id,
    },
    transaction,
  });

  if (linkedQuote) {
    return {
      outcome: 'HAS_QUOTES',
    };
  }

  await client.destroy({
    transaction,
  });

  return {
    outcome: 'DELETED',
  };
}
async function deactivateClient(userId, clientId, { transaction } = {}) {
  const client = await Client.findOne({
    where: {
      id: clientId,
      userId,
    },
    transaction,
  });

  if (!client) {
    return {
      outcome: 'NOT_FOUND',
    };
  }

  const deactivatedClient = await client.update(
    {
      active: false,
    },
    {
      transaction,
    },
  );

  return {
    outcome: 'DEACTIVATED',
    client: deactivatedClient,
  };
}
async function reactivateClient(userId, clientId, { transaction } = {}) {
  const client = await Client.findOne({
    where: {
      id: clientId,
      userId,
    },
    transaction,
  });

  if (!client) {
    return {
      outcome: 'NOT_FOUND',
    };
  }

  const reactivatedClient = await client.update(
    {
      active: true,
    },
    {
      transaction,
    },
  );

  return {
    outcome: 'REACTIVATED',
    client: reactivatedClient,
  };
}
async function listClientsPage(userId, { active = true, search = '', page = 1, pageSize = 20, transaction } = {}) {
  const where = {
    userId,
    active,
  };

  const normalizedSearch = search.trim();

  if (normalizedSearch) {
    const escapedSearch = normalizedSearch.replace(/[\\%_]/g, '\\$&');

    where.name = {
      [Op.iLike]: `%${escapedSearch}%`,
    };
  }

  const { rows, count } = await Client.findAndCountAll({
    where,
    order: [
      ['name', 'ASC'],
      ['id', 'ASC'],
    ],
    limit: pageSize,
    offset: (page - 1) * pageSize,
    transaction,
  });

  return {
    items: rows,
    total: count,
    page,
    pageSize,
    totalPages: Math.ceil(count / pageSize),
  };
}
export { createClient, listClients, updateClient, deleteClient, deactivateClient, reactivateClient, listClientsPage };
