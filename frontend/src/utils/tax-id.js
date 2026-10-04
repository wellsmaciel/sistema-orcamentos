// Mesma regra de backend/src/utils/tax-id.js. O frontend é publicado sem a pasta do backend,
// por isso a regra é repetida aqui; tests/tax-id.test.js garante que as duas concordam.
const TAX_ID_ERROR_MESSAGE = 'Informe um CPF ou CNPJ com 11 ou 14 dígitos.';

function normalizeBrazilianTaxId(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue || !/^[\d.\-/\s]+$/.test(trimmedValue)) {
    return null;
  }

  const digits = trimmedValue.replace(/\D/g, '');

  return digits.length === 11 || digits.length === 14 ? digits : null;
}

function standardizeBrazilianTaxId(value) {
  const digits = normalizeBrazilianTaxId(value);

  if (!digits) {
    return null;
  }

  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }

  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export { TAX_ID_ERROR_MESSAGE, normalizeBrazilianTaxId, standardizeBrazilianTaxId };
