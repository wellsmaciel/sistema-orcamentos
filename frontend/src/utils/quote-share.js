import { normalizeBrazilianPhone } from './phone.js';
import { formatAmount, formatDate, formatQuoteNumber } from './format.js';

const MAX_SERVICE_SUMMARY_LENGTH = 120;

// Usa a mesma regra de telefone dos cadastros e acrescenta o código do Brasil exigido pelo WhatsApp.
// Só celular (DDD + 9 dígitos): telefone fixo normalmente não tem WhatsApp, e o link levaria a um número inexistente no aplicativo.
function normalizeWhatsAppPhone(phone) {
  const digits = normalizeBrazilianPhone(phone);

  return digits?.length === 11 ? `55${digits}` : null;
}

// Primeira linha da descrição, curta, só para o cliente reconhecer o orçamento.
function summarizeService(description) {
  const firstLine = typeof description === 'string' ? description.trim().split('\n')[0].trim() : '';

  return firstLine.length > MAX_SERVICE_SUMMARY_LENGTH ? `${firstLine.slice(0, MAX_SERVICE_SUMMARY_LENGTH - 3).trimEnd()}...` : firstLine;
}

// Texto simples: o e-mail é aberto no aplicativo do próprio prestador, que não aceita imagens nem formatação.
// O mesmo texto vai pelo WhatsApp.
function buildShareMessage(quote, publicUrl) {
  const providerName = quote.provider?.name;
  const service = summarizeService(quote.description);
  const lines = [
    `Olá, ${quote.client.name}!`,
    '',
    `Segue o orçamento nº ${formatQuoteNumber(quote.quoteNumber)}${providerName ? ` de ${providerName}` : ''}.`,
  ];

  if (service) {
    lines.push(`Serviço: ${service}`);
  }

  if (quote.totalAmount) {
    lines.push(`Valor: ${formatAmount(quote.totalAmount)}`);
  }

  if (quote.serviceDate) {
    lines.push(`Data prevista: ${formatDate(quote.serviceDate)}`);
  }

  lines.push('', 'Para ver os detalhes e aceitar ou recusar o orçamento, acesse:', publicUrl);

  if (providerName) {
    lines.push('');

    if (quote.provider.phone) {
      lines.push(`Em caso de dúvidas: ${quote.provider.phone}`);
    }

    lines.push(providerName);
  }

  return lines.join('\n');
}

// Os links abrem o WhatsApp ou o aplicativo de e-mail do próprio prestador, que confirma o envio.
function buildWhatsAppShareUrl(quote, publicUrl) {
  const phone = normalizeWhatsAppPhone(quote.client.phone);

  return phone ? `https://wa.me/${phone}?text=${encodeURIComponent(buildShareMessage(quote, publicUrl))}` : null;
}

function buildEmailShareUrl(quote, publicUrl) {
  const providerName = quote.provider?.name;
  const subject = `Orçamento nº ${formatQuoteNumber(quote.quoteNumber)}${providerName ? ` - ${providerName}` : ''}`;

  return `mailto:${quote.client.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(buildShareMessage(quote, publicUrl))}`;
}

export { buildEmailShareUrl, buildShareMessage, buildWhatsAppShareUrl, normalizeWhatsAppPhone };
