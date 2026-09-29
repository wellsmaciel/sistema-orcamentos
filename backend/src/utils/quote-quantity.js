// A coluna existente tem três casas. Remover zeros não altera a quantidade;
// dígitos significativos antigos são preservados, nunca arredondados.
function normalizeStoredQuantity(value) {
  if (typeof value !== 'string') {
    throw new TypeError('Quantidade deve ser um texto decimal.');
  }

  const normalizedValue = value.trim();

  if (!/^\d{1,9}(?:\.\d{1,3})?$/.test(normalizedValue)) {
    throw new RangeError('A quantidade armazenada possui formato inválido.');
  }

  const [integerPart, decimalPart = ''] = normalizedValue.split('.');
  const significantDecimals = decimalPart.replace(/0+$/, '');

  return significantDecimals ? `${integerPart}.${significantDecimals}` : integerPart;
}

export { normalizeStoredQuantity };
