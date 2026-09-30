import { calculateItemsTotal } from '../utils/quote-pricing.js';

const PRICING_MODES = ['ITEMIZED', 'FIXED_TOTAL'];
const ITEM_FIELDS = ['description', 'quantity', 'unitPrice'];
const QUANTITY_PATTERN = /^\d{1,9}(?:\.\d)?$/;
const MONEY_PATTERN = /^\d{1,10}(?:\.\d{1,2})?$/;
const MONEY_FORMAT_MESSAGE = 'Informe um valor decimal válido com até duas casas.';

function addError(errors, field, message) {
  errors.push({ field, message });
}

function validatePositiveDecimal(value, field, errors, options) {
  const { pattern, formatMessage, positiveMessage } = options;

  if (value === undefined || value === null || (typeof value === 'string' && value.trim().length === 0)) {
    addError(errors, field, 'Este campo é obrigatório.');
    return;
  }

  if (typeof value !== 'string' || !pattern.test(value.trim())) {
    addError(errors, field, formatMessage);
    return;
  }

  if (!/[1-9]/.test(value.trim())) {
    addError(errors, field, positiveMessage);
  }
}

function validateItem(item, index, pricingMode, errors) {
  const prefix = 'items[' + index + ']';

  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    addError(errors, prefix, 'Cada item deve ser um objeto.');
    return;
  }

  for (const property of Object.keys(item)) {
    if (!ITEM_FIELDS.includes(property)) {
      addError(errors, prefix + '.' + property, 'Este campo não é permitido.');
    }
  }

  if (typeof item.description !== 'string' || item.description.trim().length === 0) {
    addError(errors, prefix + '.description', 'Este campo é obrigatório.');
  } else if (item.description.trim().length > 500) {
    addError(errors, prefix + '.description', 'Este campo deve possuir no máximo 500 caracteres.');
  }

  validatePositiveDecimal(item.quantity, prefix + '.quantity', errors, {
    pattern: QUANTITY_PATTERN,
    formatMessage: 'Informe uma quantidade válida com até uma casa decimal.',
    positiveMessage: 'A quantidade deve ser maior que zero.',
  });

  if (pricingMode === 'ITEMIZED') {
    validatePositiveDecimal(item.unitPrice, prefix + '.unitPrice', errors, {
      pattern: MONEY_PATTERN,
      formatMessage: MONEY_FORMAT_MESSAGE,
      positiveMessage: 'O preço unitário deve ser maior que zero.',
    });
  } else if (pricingMode === 'FIXED_TOTAL' && item.unitPrice !== undefined && item.unitPrice !== null) {
    addError(errors, prefix + '.unitPrice', 'Não informe preço individual no modo global.');
  }
}

function validateQuoteItemsInput(input) {
  const errors = [];

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return [
      {
        field: 'body',
        message: 'O corpo da requisição deve ser um objeto.',
      },
    ];
  }

  if (!PRICING_MODES.includes(input.pricingMode)) {
    addError(errors, 'pricingMode', 'Escolha uma forma de cobrança válida.');
  }

  if (input.pricingMode === 'FIXED_TOTAL') {
    validatePositiveDecimal(input.totalAmount, 'totalAmount', errors, {
      pattern: MONEY_PATTERN,
      formatMessage: MONEY_FORMAT_MESSAGE,
      positiveMessage: 'O valor total deve ser maior que zero.',
    });
  } else if (input.pricingMode === 'ITEMIZED' && Object.prototype.hasOwnProperty.call(input, 'totalAmount')) {
    addError(errors, 'totalAmount', 'Não informe o valor total no modo por item.');
  }

  if (!Array.isArray(input.items) || input.items.length === 0) {
    addError(errors, 'items', 'Informe pelo menos um item.');
  } else {
    for (let index = 0; index < input.items.length; index += 1) {
      validateItem(input.items[index], index, input.pricingMode, errors);
    }
  }

  if (input.pricingMode === 'ITEMIZED' && errors.length === 0) {
    try {
      calculateItemsTotal(input.items);
    } catch (error) {
      if (!(error instanceof RangeError)) {
        throw error;
      }

      addError(errors, 'totalAmount', error.message);
    }
  }

  return errors;
}

export { validateQuoteItemsInput };
