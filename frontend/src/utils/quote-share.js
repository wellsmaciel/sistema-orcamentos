function formatQuoteNumber(quoteNumber) {
  return String(quoteNumber).padStart(6, '0');
}

// Aceita telefones brasileiros com DDD (10 ou 11 dígitos), com ou sem o código do país 55.
function normalizeWhatsAppPhone(phone) {
  const digits = String(phone ?? '').replace(/\D/g, '');

  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    return digits;
  }

  return null;
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
