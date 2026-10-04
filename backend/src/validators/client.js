import { PHONE_ERROR_MESSAGE, normalizeBrazilianPhone } from '../utils/phone.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRequiredString(value, field, errors, options = {}) {
  const { minLength = 1, maxLength } = options;

  if (typeof value !== 'string' || value.trim().length === 0) {
    errors.push({
      field,
      message: 'Este campo é obrigatório.',
    });
    return;
  }

  const length = value.trim().length;

  if (length < minLength) {
    errors.push({
      field,
      message: `Este campo deve possuir pelo menos ${minLength} caracteres.`,
    });
  }

  if (maxLength && length > maxLength) {
    errors.push({
      field,
      message: `Este campo deve possuir no máximo ${maxLength} caracteres.`,
    });
  }
}

function validateOptionalString(value, field, errors, maxLength) {
  if (value === undefined) {
    return;
  }

  if (typeof value !== 'string') {
    errors.push({
      field,
      message: 'Este campo deve ser um texto.',
    });
    return;
  }

  if (value.trim().length > maxLength) {
    errors.push({
      field,
      message: `Este campo deve possuir no máximo ${maxLength} caracteres.`,
    });
  }
}

function validateAllowedProperties(value, allowedProperties, parent, errors) {
  for (const property of Object.keys(value)) {
    if (!allowedProperties.includes(property)) {
      errors.push({
        field: parent ? `${parent}.${property}` : property,
        message: 'Este campo não é permitido.',
      });
    }
  }
}

function validateClientInput(input) {
  const errors = [];

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return [
      {
        field: 'body',
        message: 'O corpo da requisição deve ser um objeto.',
      },
    ];
  }

  validateAllowedProperties(input, ['name', 'email', 'phone', 'address'], '', errors);

  validateRequiredString(input.name, 'name', errors, {
    maxLength: 150,
  });

  validateRequiredString(input.email, 'email', errors, {
    maxLength: 320,
  });

  if (typeof input.email === 'string' && input.email.trim().length > 0 && !EMAIL_PATTERN.test(input.email.trim())) {
    errors.push({
      field: 'email',
      message: 'Informe um e-mail válido.',
    });
  }

  validateRequiredString(input.phone, 'phone', errors, {
    maxLength: 30,
  });

  if (typeof input.phone === 'string' && input.phone.trim().length > 0 && input.phone.trim().length <= 30 && !normalizeBrazilianPhone(input.phone)) {
    errors.push({
      field: 'phone',
      message: PHONE_ERROR_MESSAGE,
    });
  }

  const address = input.address;

  if (!address || typeof address !== 'object' || Array.isArray(address)) {
    errors.push({
      field: 'address',
      message: 'O endereço é obrigatório.',
    });

    return errors;
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

  return errors;
}

export { validateClientInput };
