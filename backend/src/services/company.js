import Company from '../models/company.js';
import { standardizeBrazilianPhone } from '../utils/phone.js';
import { recordActivity, toChangedFields, withTransaction } from './activity-log.js';

function normalizeOptionalString(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value.trim();

  return normalizedValue || null;
}

function buildCompanyData(input) {
  const address = input.address;

  return {
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: standardizeBrazilianPhone(input.phone),
    taxId: normalizeOptionalString(input.taxId),
    street: normalizeOptionalString(address?.street),
    number: normalizeOptionalString(address?.number),
    complement: normalizeOptionalString(address?.complement),
    postalCode: normalizeOptionalString(address?.postalCode),
    district: normalizeOptionalString(address?.district),
    city: normalizeOptionalString(address?.city),
    state: normalizeOptionalString(address?.state),
    active: true,
  };
}

async function getCompany(userId, { transaction } = {}) {
  return Company.findOne({
    where: {
      ownerUserId: userId,
      active: true,
    },
    transaction,
  });
}

async function saveCompany(userId, input, { transaction } = {}) {
  if (!transaction) {
    return withTransaction(null, (newTransaction) => saveCompany(userId, input, { transaction: newTransaction }));
  }

  const companyData = buildCompanyData(input);

  const existingCompany = await Company.findOne({
    where: {
      ownerUserId: userId,
    },
    transaction,
  });

  if (existingCompany) {
    existingCompany.set(companyData);

    const changedFields = toChangedFields(existingCompany.changed()).filter((field) => field !== 'active');

    await existingCompany.save({
      transaction,
    });

    if (changedFields.length > 0) {
      await recordActivity(
        { userId, action: 'COMPANY_UPDATED', entityType: 'COMPANY', entityId: existingCompany.id, details: { changedFields } },
        { transaction },
      );
    }

    return existingCompany;
  }

  const company = await Company.create(
    {
      ownerUserId: userId,
      ...companyData,
    },
    {
      transaction,
    },
  );

  await recordActivity({ userId, action: 'COMPANY_CREATED', entityType: 'COMPANY', entityId: company.id }, { transaction });

  return company;
}

export { getCompany, saveCompany };
