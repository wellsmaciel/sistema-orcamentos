const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MONEY_PATTERN = /^\d{1,10}(?:\.\d{1,2})?$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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

function validateRequiredString(value, field, errors, maxLength) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    addError(errors, field, 'Este campo é obrigatório.');
    return;
  }

  if (value.trim().length > maxLength) {
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

function isValidDate(value) {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function getCurrentDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function validateServiceAddress(address, errors) {
  if (!address || typeof address !== 'object' || Array.isArray(address)) {
    addError(errors, 'serviceAddress', 'O endereço do serviço é obrigatório.');
    return;
  }

  validateAllowedProperties(address, ['street', 'number', 'complement', 'postalCode', 'district', 'city', 'state'], 'serviceAddress', errors);

  validateRequiredString(address.street, 'serviceAddress.street', errors, 200);

  validateRequiredString(address.number, 'serviceAddress.number', errors, 30);

  validateOptionalString(address.complement, 'serviceAddress.complement', errors, 150);

  validateRequiredString(address.postalCode, 'serviceAddress.postalCode', errors, 20);

  validateRequiredString(address.district, 'serviceAddress.district', errors, 100);

  validateRequiredString(address.city, 'serviceAddress.city', errors, 100);

  validateRequiredString(address.state, 'serviceAddress.state', errors, 100);
}

function validateQuoteInput(input, currentDate = getCurrentDate()) {
  const errors = [];

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return [
      {
        field: 'body',
        message: 'O corpo da requisição deve ser um objeto.',
      },
    ];
  }

  validateAllowedProperties(input, ['clientId', 'description', 'totalAmount', 'serviceDate', 'serviceAddress', 'locationNotes'], '', errors);

  if (typeof input.clientId !== 'string' || input.clientId.trim().length === 0) {
    addError(errors, 'clientId', 'Este campo é obrigatório.');
  } else if (!UUID_PATTERN.test(input.clientId.trim())) {
    addError(errors, 'clientId', 'Informe um identificador válido.');
  }

  validateRequiredString(input.description, 'description', errors, 10000);

  if (typeof input.totalAmount !== 'string' || input.totalAmount.trim().length === 0) {
    addError(errors, 'totalAmount', 'Este campo é obrigatório.');
  } else if (!MONEY_PATTERN.test(input.totalAmount.trim())) {
    addError(errors, 'totalAmount', 'Informe um valor decimal válido com até duas casas.');
  } else if (Number(input.totalAmount) <= 0) {
    addError(errors, 'totalAmount', 'O valor total deve ser maior que zero.');
  }

  if (typeof input.serviceDate !== 'string' || input.serviceDate.trim().length === 0) {
    addError(errors, 'serviceDate', 'Este campo é obrigatório.');
  } else if (!isValidDate(input.serviceDate)) {
    addError(errors, 'serviceDate', 'Informe uma data válida.');
  } else if (input.serviceDate < currentDate) {
    addError(errors, 'serviceDate', 'A data do serviço não pode estar no passado.');
  }

  validateServiceAddress(input.serviceAddress, errors);

  validateOptionalString(input.locationNotes, 'locationNotes', errors, 2000);

  return errors;
}

export { validateQuoteInput };
