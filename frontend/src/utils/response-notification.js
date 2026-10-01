function formatQuoteNumber(quoteNumber) {
  return String(quoteNumber).padStart(6, '0');
}

// Por exemplo: "Maria recusou o orçamento nº 000042 em 30/09/2026, 14:00. Motivo: valor alto".
function describeResponseNotification(item, { timeZone } = {}) {
  const decision = item.decision === 'ACCEPTED' ? 'aceitou' : 'recusou';
  const respondedAt = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone }).format(new Date(item.respondedAt));
  const reason = item.decision === 'REJECTED' && item.rejectionReason ? ` Motivo: ${item.rejectionReason}` : '';

  return `${item.clientName} ${decision} o orçamento nº ${formatQuoteNumber(item.quoteNumber)} em ${respondedAt}.${reason}`;
}

export { describeResponseNotification };
