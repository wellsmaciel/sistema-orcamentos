import { normalizeBrazilianPhone } from './phone.js';
import { formatQuoteNumber } from './format.js';

// Usa a mesma regra de telefone dos cadastros e acrescenta o código do Brasil exigido pelo WhatsApp.
// Só celular (DDD + 9 dígitos): telefone fixo normalmente não tem WhatsApp, e o link levaria a um número inexistente no aplicativo.
function normalizeWhatsAppPhone(phone) {
  const digits = normalizeBrazilianPhone(phone);

  return digits?.length === 11 ? `55${digits}` : null;
}

function buildShareMessage(quote, publicUrl) {
  const provider = quote.provider?.name ? ` de ${quote.provider.name}` : '';

  return [
    `Olá, ${quote.client.name}! Segue o orçamento nº ${formatQuoteNumber(quote.quoteNumber)}${provider}: ${publicUrl}`,
    'Pelo link você pode ver os detalhes e aceitar ou recusar o orçamento.',
  ].join('\n');
}

// Os links abrem o WhatsApp ou o aplicativo de e-mail do próprio prestador, que confirma o envio.
function buildWhatsAppShareUrl(quote, publicUrl) {
  const phone = normalizeWhatsAppPhone(quote.client.phone);

  return phone ? `https://wa.me/${phone}?text=${encodeURIComponent(buildShareMessage(quote, publicUrl))}` : null;
}

function buildEmailShareUrl(quote, publicUrl) {
  const subject = `Orçamento nº ${formatQuoteNumber(quote.quoteNumber)}`;

  return `mailto:${quote.client.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(buildShareMessage(quote, publicUrl))}`;
}

export { buildEmailShareUrl, buildShareMessage, buildWhatsAppShareUrl, normalizeWhatsAppPhone };
