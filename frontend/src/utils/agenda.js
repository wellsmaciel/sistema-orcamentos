import { formatAmount, formatQuoteNumber } from './format.js';
import { summarizeService } from './quote-share.js';

const WEEKDAYS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const DAY_MS = 86400000;

// Datas sem horário ("2026-10-15") viram dias em UTC, para a conta de dias não depender do fuso do aparelho.
function toUtcDay(value) {
  const [year, month, day] = value.split('-').map(Number);

  return Date.UTC(year, month - 1, day);
}

// "Hoje", "Amanhã" ou o dia da semana com a data, por exemplo "quarta-feira, 15/10".
// "Hoje" vem da API, no horário de Brasília, e não do relógio do aparelho.
function describeServiceDay(serviceDate, today) {
  const daysAhead = Math.round((toUtcDay(serviceDate) - toUtcDay(today)) / DAY_MS);
  const [, month, day] = serviceDate.split('-');

  if (daysAhead === 0) {
    return 'Hoje';
  }

  if (daysAhead === 1) {
    return 'Amanhã';
  }

  return `${WEEKDAYS[new Date(toUtcDay(serviceDate)).getUTCDay()]}, ${day}/${month}`;
}

function formatServiceAddress(address) {
  if (!address?.street) {
    return '';
  }

  const streetLine = [address.street, address.number, address.complement].filter(Boolean).join(', ');
  const cityLine = [address.city, address.state].filter(Boolean).join(' - ');

  return [streetLine, address.district, cityLine, address.postalCode].filter(Boolean).join(', ');
}

// Link que abre o Google Agenda com o evento já preenchido, como o botão do WhatsApp: nada é enviado
// sem o prestador confirmar no próprio Google Agenda. O evento é de dia inteiro, porque o orçamento não tem horário.
function buildGoogleCalendarUrl(service) {
  const start = service.serviceDate.replaceAll('-', '');
  const end = new Date(toUtcDay(service.serviceDate) + DAY_MS).toISOString().slice(0, 10).replaceAll('-', '');
  const summary = summarizeService(service.description);
  const details = [
    summary,
    `Orçamento nº ${formatQuoteNumber(service.quoteNumber)} — ${formatAmount(service.totalAmount)}`,
  ].filter(Boolean).join('\n');
  const url = new URL('https://calendar.google.com/calendar/render');

  url.search = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Serviço: ${service.clientName}`,
    dates: `${start}/${end}`,
    details,
    location: formatServiceAddress(service.serviceAddress),
  }).toString();

  return url.toString();
}

export { buildGoogleCalendarUrl, describeServiceDay, formatServiceAddress };
