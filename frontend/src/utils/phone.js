// Mesma regra de backend/src/utils/phone.js. O frontend é publicado sem a pasta do backend,
// por isso a regra é repetida aqui; tests/phone.test.js garante que as duas concordam.
const PHONE_EXAMPLE = '21999998888';
const PHONE_LANDLINE_EXAMPLE = '2133334444';
const PHONE_ERROR_MESSAGE = `Informe o telefone com DDD: celular, por exemplo ${PHONE_EXAMPLE}, ou fixo, por exemplo ${PHONE_LANDLINE_EXAMPLE}.`;

function normalizeBrazilianPhone(value) {
  if (typeof value !== 'string') {
    return null;
  }

  let digits = value.replace(/\D/g, '');

  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    digits = digits.slice(2);
  }

  const isMobile = /^[1-9][1-9]9\d{8}$/.test(digits);
  const isLandline = /^[1-9][1-9][2-5]\d{7}$/.test(digits);

  return isMobile || isLandline ? digits : null;
}

function standardizeBrazilianPhone(value) {
  const digits = normalizeBrazilianPhone(value);

  if (!digits) {
    return null;
  }

  const number = digits.slice(2);
  const splitAt = number.length - 4;

  return `(${digits.slice(0, 2)}) ${number.slice(0, splitAt)}-${number.slice(splitAt)}`;
}

export { PHONE_ERROR_MESSAGE, PHONE_EXAMPLE, PHONE_LANDLINE_EXAMPLE, normalizeBrazilianPhone, standardizeBrazilianPhone };
