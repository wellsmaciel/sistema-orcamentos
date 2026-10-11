// Telefone brasileiro com DDD: celular com 11 dígitos (começa com 9) ou fixo com 10 dígitos
// (começa de 2 a 5). Aceita pontuação, espaços e o código do país +55.
// A mesma regra existe em frontend/src/utils/phone.js; um teste do frontend garante que as duas concordam.
const PHONE_EXAMPLE = '21999998888';
const PHONE_LANDLINE_EXAMPLE = '2133334444';
const PHONE_ERROR_MESSAGE = `Informe o telefone com DDD. Celular: 9 dígitos depois do DDD, começando com 9, por exemplo ${PHONE_EXAMPLE}. `
  + `Fixo: 8 dígitos depois do DDD, começando com 2, 3, 4 ou 5, por exemplo ${PHONE_LANDLINE_EXAMPLE}.`;

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

function formatBrazilianPhone(digits) {
  const areaCode = digits.slice(0, 2);
  const number = digits.slice(2);
  const splitAt = number.length - 4;

  return `(${areaCode}) ${number.slice(0, splitAt)}-${number.slice(splitAt)}`;
}

// Devolve o telefone no formato padrão, por exemplo "(21) 99999-8888", ou null se for inválido.
function standardizeBrazilianPhone(value) {
  const digits = normalizeBrazilianPhone(value);

  return digits ? formatBrazilianPhone(digits) : null;
}

// Mensagem para um telefone recusado. O caso mais comum é o celular no formato antigo, sem o 9 na frente
// (8 dígitos começando com 6 a 9): a mensagem mostra o próprio número já com o 9.
function phoneErrorMessage(value) {
  let digits = typeof value === 'string' ? value.replace(/\D/g, '') : '';

  if (digits.length === 12 && digits.startsWith('55')) {
    digits = digits.slice(2);
  }

  if (/^[1-9][1-9][6-9]\d{7}$/.test(digits)) {
    const withNine = `${digits.slice(0, 2)}9${digits.slice(2)}`;

    return `Parece um celular sem o 9 na frente. Celulares têm 9 dígitos depois do DDD, por exemplo ${formatBrazilianPhone(withNine)}.`;
  }

  return PHONE_ERROR_MESSAGE;
}

export { PHONE_ERROR_MESSAGE, PHONE_EXAMPLE, PHONE_LANDLINE_EXAMPLE, normalizeBrazilianPhone, phoneErrorMessage, standardizeBrazilianPhone };
