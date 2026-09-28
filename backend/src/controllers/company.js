import { getCompany as getCompanyService, saveCompany as saveCompanyService } from '../services/company.js';

function serializeCompany(company) {
  const serializedCompany = {
    id: company.id,
    name: company.name,
    email: company.email,
    phone: company.phone,
  };

  if (company.taxId) {
    serializedCompany.taxId = company.taxId;
  }

  if (company.street) {
    const address = {
      street: company.street,
      number: company.number,
      postalCode: company.postalCode,
      district: company.district,
      city: company.city,
      state: company.state,
    };

    if (company.complement) {
      address.complement = company.complement;
    }

    serializedCompany.address = address;
  }

  return serializedCompany;
}

async function getCompany(request, response, next) {
  try {
    const company = await getCompanyService(request.authenticatedUser.id);

    if (!company) {
      return response.status(404).json({
        code: 'COMPANY_NOT_FOUND',
        message: 'Dados profissionais não encontrados.',
      });
    }

    return response.status(200).json(serializeCompany(company));
  } catch (error) {
    return next(error);
  }
}

async function saveCompany(request, response, next) {
  try {
    const company = await saveCompanyService(request.authenticatedUser.id, request.body);

    return response.status(200).json(serializeCompany(company));
  } catch (error) {
    return next(error);
  }
}

export { getCompany, saveCompany };
