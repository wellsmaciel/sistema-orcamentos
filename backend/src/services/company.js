import Company from '../models/company.js';

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
    phone: input.phone.trim(),
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
  const companyData = buildCompanyData(input);

  const existingCompany = await Company.findOne({
    where: {
      ownerUserId: userId,
    },
    transaction,
  });

  if (existingCompany) {
    await existingCompany.update(companyData, {
      transaction,
    });

    return existingCompany;
  }

  return Company.create(
    {
      ownerUserId: userId,
      ...companyData,
    },
    {
      transaction,
    },
  );
}

export { getCompany, saveCompany };
