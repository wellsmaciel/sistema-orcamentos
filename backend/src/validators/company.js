const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TAX_ID_PATTERN = /^(?:\d{11}|\d{14})$/;

function addError(errors, field, message) {
  errors.push({
    field,
    message,
  });
}

function validateAllowedProperties(value, allowedProperties, parent, errors) {
  for (const property of Object.keys(value)) {
    if (!allowedProperties.includes(property)) {
      addError(errors, parent ? `${parent}.${property}` : property, 'Este campo não é permitido.');
    }
  }
}

function validateRequiredString(value, field, errors, options = {}) {
  const { minLength = 1, maxLength } = options;

  if (typeof value !== 'string' || value.trim().length === 0) {
    addError(errors, field, 'Este campo é obrigatório.');
    return;
  }

  const length = value.trim().length;

  if (length < minLength) {
    addError(errors, field, `Este campo deve possuir pelo menos ${minLength} caracteres.`);
  }

  if (maxLength && length > maxLength) {
    addError(errors, field, `Este campo deve possuir no máximo ${maxLength} caracteres.`);
  }
}

function validateOptionalString(value, field, errors, maxLength) {
  if (value === undefined) {
    return;
  }

  if (typeof value !== 'string') {
    addError(errors, field, 'Este campo deve ser um texto.');
    return;
  }

  if (value.trim().length > maxLength) {
    addError(errors, field, `Este campo deve possuir no máximo ${maxLength} caracteres.`);
  }
}

function validateAddress(address, errors) {
  if (address === undefined) {
    return;
  }

  if (!address || typeof address !== 'object' || Array.isArray(address)) {
    addError(errors, 'address', 'O endereço deve ser um objeto.');
    return;
  }

  validateAllowedProperties(address, ['street', 'number', 'complement', 'postalCode', 'district', 'city', 'state'], 'address', errors);

  validateRequiredString(address.street, 'address.street', errors, {
    maxLength: 200,
  });

  validateRequiredString(address.number, 'address.number', errors, {
    maxLength: 30,
  });

  validateOptionalString(address.complement, 'address.complement', errors, 150);

  validateRequiredString(address.postalCode, 'address.postalCode', errors, {
    maxLength: 20,
  });

  validateRequiredString(address.district, 'address.district', errors, {
    maxLength: 100,
  });

  validateRequiredString(address.city, 'address.city', errors, {
    maxLength: 100,
  });

  validateRequiredString(address.state, 'address.state', errors, {
    maxLength: 100,
  });
}

function validateCompanyInput(input) {
  const errors = [];

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return [
      {
        field: 'body',
        message: 'O corpo da requisição deve ser um objeto.',
      },
    ];
  }

  validateAllowedProperties(input, ['name', 'email', 'phone', 'taxId', 'address'], '', errors);

  validateRequiredString(input.name, 'name', errors, {
    maxLength: 150,
  });

  validateRequiredString(input.email, 'email', errors, {
    maxLength: 320,
  });

  if (typeof input.email === 'string' && input.email.trim().length > 0 && !EMAIL_PATTERN.test(input.email.trim())) {
    addError(errors, 'email', 'Informe um e-mail válido.');
  }

  validateRequiredString(input.phone, 'phone', errors, {
    minLength: 8,
    maxLength: 30,
  });

  validateOptionalString(input.taxId, 'taxId', errors, 20);

  if (typeof input.taxId === 'string' && input.taxId.trim().length > 0) {
    const normalizedTaxId = input.taxId.replace(/[.\-/\s]/g, '');

    if (!TAX_ID_PATTERN.test(normalizedTaxId)) {
      addError(errors, 'taxId', 'Informe um CPF ou CNPJ com 11 ou 14 dígitos.');
    }
  }

  validateAddress(input.address, errors);

  return errors;
}

export { validateCompanyInput };
