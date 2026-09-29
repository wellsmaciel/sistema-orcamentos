// Preserva cálculos de registros históricos armazenados com três casas.
// Novos cadastros e edições são limitados a uma casa pelo validador da API.
const QUANTITY_PATTERN = /^\d{1,9}(?:\.\d{1,3})?$/;
const MONEY_PATTERN = /^\d{1,10}(?:\.\d{1,2})?$/;
const MAX_AMOUNT_CENTS = 999999999999n;

function parsePositiveScaled(value, pattern, decimalPlaces, label) {
  if (typeof value !== 'string') {
    throw new TypeError(label + ' deve ser um texto decimal.');
  }

  const normalizedValue = value.trim();

  if (!pattern.test(normalizedValue)) {
    throw new RangeError(label + ' possui formato ou precisão inválidos.');
  }

  const [integerPart, decimalPart = ''] = normalizedValue.split('.');
  const scaledValue = BigInt(integerPart + decimalPart.padEnd(decimalPlaces, '0'));

  if (scaledValue <= 0n) {
    throw new RangeError(label + ' deve ser maior que zero.');
  }

  return scaledValue;
}

function formatCents(value) {
  const integerPart = value / 100n;
  const decimalPart = value % 100n;

  return integerPart.toString() + '.' + decimalPart.toString().padStart(2, '0');
}

function calculateSubtotalCents(quantity, unitPrice) {
  const quantityThousandths = parsePositiveScaled(quantity, QUANTITY_PATTERN, 3, 'Quantidade');

  const unitPriceCents = parsePositiveScaled(unitPrice, MONEY_PATTERN, 2, 'Preço unitário');

  // Arredonda para o centavo mais próximo; empate arredonda para cima.
  const subtotalCents = (quantityThousandths * unitPriceCents + 500n) / 1000n;

  if (subtotalCents > MAX_AMOUNT_CENTS) {
    throw new RangeError('O subtotal excede o limite monetário permitido.');
  }

  return subtotalCents;
}

function calculateItemSubtotal(quantity, unitPrice) {
  return formatCents(calculateSubtotalCents(quantity, unitPrice));
}

function calculateItemsTotal(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new RangeError('Informe pelo menos um item.');
  }

  let totalCents = 0n;

  for (const item of items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new TypeError('Cada item deve ser um objeto.');
    }

    totalCents += calculateSubtotalCents(item.quantity, item.unitPrice);

    if (totalCents > MAX_AMOUNT_CENTS) {
      throw new RangeError('O total excede o limite monetário permitido.');
    }
  }

  if (totalCents <= 0n) {
    throw new RangeError('O valor total deve ser maior que zero.');
  }

  return formatCents(totalCents);
}

export { calculateItemSubtotal, calculateItemsTotal };
