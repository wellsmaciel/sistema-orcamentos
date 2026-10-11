const TAX_ID_ERROR_MESSAGE = 'Informe um CPF com 11 números ou um CNPJ com 14 caracteres.';
const CPF_ERROR_MESSAGE = 'CPF inválido: confira os números.';
const CNPJ_ERROR_MESSAGE = 'CNPJ inválido: confira os números e as letras.';

// Remove a pontuação e deixa as letras em maiúsculas. Qualquer outro caractere torna o valor inválido.
function cleanTaxId(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue || !/^[\dA-Za-z.\-/\s]+$/.test(trimmedValue)) {
    return null;
  }

  return trimmedValue.replace(/[.\-/\s]/g, '').toUpperCase();
}

// Dígito verificador do módulo 11. Cada caractere vale seu código ASCII menos 48: os números mantêm o valor
// e as letras do CNPJ alfanumérico (Receita Federal, a partir de julho de 2026) começam em A = 17.
function checkDigit(characters, firstWeight, lastWeight) {
  let sum = 0;
  let weight = firstWeight;

  for (const character of characters) {
    sum += (character.charCodeAt(0) - 48) * weight;
    weight = weight === 2 ? lastWeight : weight - 1;
  }

  const remainder = sum % 11;

  return remainder < 2 ? 0 : 11 - remainder;
}

function isValidCpf(cpf) {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  const first = checkDigit(cpf.slice(0, 9), 10, 10);
  const second = checkDigit(cpf.slice(0, 10), 11, 11);

  return cpf.endsWith(`${first}${second}`);
}

// CNPJ: 12 posições com números ou letras e 2 dígitos verificadores numéricos. Os pesos vão de 2 a 9, da direita para a esquerda.
function isValidCnpj(cnpj) {
  if (!/^[\dA-Z]{12}\d{2}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) {
    return false;
  }

  const first = checkDigit(cnpj.slice(0, 12), 5, 9);
  const second = checkDigit(cnpj.slice(0, 13), 6, 9);

  return cnpj.endsWith(`${first}${second}`);
}

// CPF ou CNPJ válido, sem pontuação e com letras maiúsculas; null quando inválido.
function normalizeBrazilianTaxId(value) {
  const taxId = cleanTaxId(value);

  if (taxId?.length === 11) {
    return isValidCpf(taxId) ? taxId : null;
  }

  if (taxId?.length === 14) {
    return isValidCnpj(taxId) ? taxId : null;
  }

  return null;
}

function standardizeBrazilianTaxId(value) {
  const taxId = normalizeBrazilianTaxId(value);

  if (!taxId) {
    return null;
  }

  if (taxId.length === 11) {
    return `${taxId.slice(0, 3)}.${taxId.slice(3, 6)}.${taxId.slice(6, 9)}-${taxId.slice(9)}`;
  }

  return `${taxId.slice(0, 2)}.${taxId.slice(2, 5)}.${taxId.slice(5, 8)}/${taxId.slice(8, 12)}-${taxId.slice(12)}`;
}

// Mensagem para um valor recusado: diz se o problema é o tamanho ou os dígitos verificadores.
function taxIdErrorMessage(value) {
  const taxId = cleanTaxId(value);

  if (taxId?.length === 11 && /^\d+$/.test(taxId)) {
    return CPF_ERROR_MESSAGE;
  }

  if (taxId?.length === 14) {
    return CNPJ_ERROR_MESSAGE;
  }

  return TAX_ID_ERROR_MESSAGE;
}

export { TAX_ID_ERROR_MESSAGE, normalizeBrazilianTaxId, standardizeBrazilianTaxId, taxIdErrorMessage };
