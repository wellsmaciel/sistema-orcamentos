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

// Endereço do serviço numa linha, como o prestador confere: "Rua A, 10, fundos · Centro, São Paulo – SP · CEP 01001-000".
function formatServiceAddressLine(address) {
  const street = [address.street, address.number, address.complement].filter(Boolean).join(', ');

  return `${street} · ${address.district}, ${address.city} – ${address.state} · CEP ${address.postalCode}`;
}

export { formatAmount, formatDate, formatQuoteNumber, formatServiceAddressLine };
