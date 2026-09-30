const QUANTITY_PATTERN = /^\d{1,9}(?:\.\d)?$/;
const MONEY_PATTERN = /^\d{1,10}(?:\.\d{1,2})?$/;
const MAX_AMOUNT_CENTS = 999999999999n;

function normalizeDecimalInput(value) {
  return typeof value === 'string' ? value.trim().replace(',', '.') : '';
}

function formatQuoteQuantity(value) {
  const normalizedValue = normalizeDecimalInput(value);

  if (!/^\d+(?:\.\d+)?$/.test(normalizedValue)) {
    return '—';
  }

  const [integerPart, decimalPart = ''] = normalizedValue.split('.');
  const significantDecimals = decimalPart.replace(/0+$/, '');
  return significantDecimals ? `${integerPart},${significantDecimals}` : integerPart;
}

function parsePositiveDecimal(value, pattern, decimalPlaces, label) {
  const normalizedValue = normalizeDecimalInput(value);

  if (!pattern.test(normalizedValue)) {
    throw new RangeError(`${label}: informe um número sem separadores de milhares, com até ${decimalPlaces} casas decimais.`);
  }

  const [integerPart, decimalPart = ''] = normalizedValue.split('.');
  const scaledValue = BigInt(integerPart + decimalPart.padEnd(decimalPlaces, '0'));

  if (scaledValue <= 0n) {
    throw new RangeError(`${label} deve ser maior que zero.`);
  }

  return { normalizedValue, scaledValue };
}

function formatCents(value) {
  return `${value / 100n}.${String(value % 100n).padStart(2, '0')}`;
}

function calculateFormItemSubtotal(quantity, unitPrice) {
  const { scaledValue: quantityTenths } = parsePositiveDecimal(quantity, QUANTITY_PATTERN, 1, 'Quantidade');
  const { scaledValue: unitPriceCents } = parsePositiveDecimal(unitPrice, MONEY_PATTERN, 2, 'Preço unitário');
  const subtotalCents = (quantityTenths * unitPriceCents + 5n) / 10n;

  if (subtotalCents > MAX_AMOUNT_CENTS) {
    throw new RangeError('O subtotal excede o limite monetário permitido.');
  }

  return formatCents(subtotalCents);
}

function getItemsPricingPreview(items) {
  const subtotals = items.map((item) => {
    try {
      return calculateFormItemSubtotal(item.quantity, item.unitPrice);
    } catch (error) {
      if (!(error instanceof RangeError)) {
        throw error;
      }

      return null;
    }
  });

  if (subtotals.length === 0 || subtotals.includes(null)) {
    return { subtotals, totalAmount: null };
  }

  const totalCents = subtotals.reduce((total, subtotal) => total + BigInt(subtotal.replace('.', '')), 0n);

  return {
    subtotals,
    totalAmount: totalCents > 0n && totalCents <= MAX_AMOUNT_CENTS ? formatCents(totalCents) : null,
  };
}

function formatQuoteMoney(value) {
  if (typeof value !== 'string' || !/^\d+(?:\.\d{1,2})?$/.test(value)) {
    return '—';
  }

  const [integerPart, decimalPart = ''] = value.split('.');
  return `R$ ${integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${decimalPart.padEnd(2, '0')}`;
}

// Linha sem nada digitado pelo usuário, por exemplo criada por engano com "Adicionar outro item".
// Preço oculto no modo de valor global não conta, e a quantidade padrão 1 também não.
function isBlankFormItem(item, pricingMode) {
  const description = typeof item.description === 'string' ? item.description.trim() : '';
  const quantity = typeof item.quantity === 'string' ? item.quantity.trim() : '';
  const unitPrice = pricingMode === 'ITEMIZED' && typeof item.unitPrice === 'string' ? item.unitPrice.trim() : '';

  return !description && !unitPrice && (quantity === '' || quantity === '1');
}

function buildQuoteRequest(formData, { isEditing = false } = {}) {
  if (!['ITEMIZED', 'FIXED_TOTAL'].includes(formData.pricingMode)) {
    throw new RangeError('Escolha uma forma de cobrança válida.');
  }

  // Mantém o número original de cada linha para que as mensagens de erro apontem o item certo.
  const filledItems = (Array.isArray(formData.items) ? formData.items : [])
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !isBlankFormItem(item, formData.pricingMode));

  if (filledItems.length === 0) {
    throw new RangeError('Informe pelo menos um item.');
  }

  const items = filledItems.map(({ item, index }) => {
    if (typeof item.description !== 'string' || !item.description.trim() || item.description.trim().length > 500) {
      throw new RangeError(`Item ${index + 1}: informe uma descrição com até 500 caracteres.`);
    }

    const { normalizedValue: quantity } = parsePositiveDecimal(item.quantity, QUANTITY_PATTERN, 1, `Quantidade do item ${index + 1}`);
    const requestItem = { description: item.description.trim(), quantity };

    if (formData.pricingMode === 'ITEMIZED') {
      const { normalizedValue: unitPrice } = parsePositiveDecimal(item.unitPrice, MONEY_PATTERN, 2, `Preço unitário do item ${index + 1}`);
      requestItem.unitPrice = unitPrice;
    }

    return requestItem;
  });

  const requestBody = {
    description: formData.description,
    pricingMode: formData.pricingMode,
    items,
    serviceDate: formData.serviceDate,
    serviceAddress: {
      street: formData.street,
      number: formData.number,
      complement: formData.complement,
      postalCode: formData.postalCode,
      district: formData.district,
      city: formData.city,
      state: formData.state,
    },
    locationNotes: formData.locationNotes,
  };

  if (formData.pricingMode === 'FIXED_TOTAL') {
    requestBody.totalAmount = parsePositiveDecimal(formData.totalAmount, MONEY_PATTERN, 2, 'Valor total').normalizedValue;
  } else if (getItemsPricingPreview(items).totalAmount === null) {
    throw new RangeError('O total dos itens deve ser maior que zero e não pode ultrapassar R$ 9.999.999.999,99.');
  }

  if (!isEditing) {
    requestBody.clientId = formData.clientId;
  }

  return requestBody;
}

// Envia à revisão com IA apenas a descrição e os itens preenchidos, nunca dados do cliente.
function buildDescriptionReviewRequest(formData) {
  const items = (formData.items ?? [])
    .filter((item) => typeof item.description === 'string' && item.description.trim())
    .slice(0, 50)
    .map((item) => {
      const requestItem = { description: item.description.trim() };
      const quantity = typeof item.quantity === 'string' ? item.quantity.trim() : '';

      if (quantity) {
        requestItem.quantity = quantity;
      }

      return requestItem;
    });

  return { description: formData.description.trim(), items };
}

export { normalizeDecimalInput, formatQuoteQuantity, calculateFormItemSubtotal, getItemsPricingPreview, formatQuoteMoney, buildQuoteRequest, buildDescriptionReviewRequest, isBlankFormItem };
