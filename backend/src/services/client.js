import Client from '../models/client.js';

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
export { createClient, listClients };
