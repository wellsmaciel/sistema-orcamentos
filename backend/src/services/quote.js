import Client from '../models/client.js';
import Quote from '../models/quote.js';

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
export { createQuote, listQuotes };
