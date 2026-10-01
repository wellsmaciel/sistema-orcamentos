const PERIOD_OPTIONS = [
  { value: 'month', label: 'Este mês' },
  { value: 'quarter', label: 'Últimos 3 meses' },
  { value: 'year', label: 'Este ano' },
  { value: 'all', label: 'Todo o período' },
];

const STATUS_ROWS = [
  { status: 'DRAFT', label: 'Rascunho' },
  { status: 'SENT', label: 'Aguardando resposta' },
  { status: 'ACCEPTED', label: 'Aceito' },
  { status: 'REJECTED', label: 'Recusado' },
];

function formatAcceptanceRate(rate) {
  if (rate === null || rate === undefined) {
    return 'Sem respostas';
  }

  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(rate * 100)}%`;
}

// Até 48 horas o tempo aparece em horas; depois, em dias.
function formatResponseTime(hours) {
  if (hours === null || hours === undefined) {
    return 'Sem respostas';
  }

  const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

  if (hours < 48) {
    return hours === 1 ? '1 hora' : `${number.format(hours)} horas`;
  }

  return `${number.format(hours / 24)} dias`;
}

function formatDaysWaiting(days) {
  if (days <= 0) {
    return 'enviado hoje';
  }

  return days === 1 ? 'há 1 dia' : `há ${days} dias`;
}

export { PERIOD_OPTIONS, STATUS_ROWS, formatAcceptanceRate, formatDaysWaiting, formatResponseTime };
