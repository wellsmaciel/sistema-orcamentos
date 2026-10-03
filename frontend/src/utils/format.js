// Formatos usados em todas as telas, num lugar só para não divergirem.

// Número do orçamento sempre com seis dígitos, por exemplo 000042.
function formatQuoteNumber(quoteNumber) {
  return String(quoteNumber).padStart(6, '0');
}

// Valor em reais, por exemplo R$ 1.200,50.
function formatAmount(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
}

// Data sem horário vinda da API ("2026-10-15") para o formato brasileiro (15/10/2026), sem conversão de fuso.
function formatDate(value) {
  const [year, month, day] = value.split('-');

  return `${day}/${month}/${year}`;
}

export { formatAmount, formatDate, formatQuoteNumber };
