import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildGoogleCalendarUrl, describeServiceDay, formatServiceAddress } from '../src/utils/agenda.js';

test('o dia do serviço aparece como hoje, amanhã ou dia da semana com a data', () => {
  assert.equal(describeServiceDay('2026-10-15', '2026-10-15'), 'Hoje');
  assert.equal(describeServiceDay('2026-10-16', '2026-10-15'), 'Amanhã');
  assert.equal(describeServiceDay('2026-10-21', '2026-10-15'), 'quarta-feira, 21/10');
  // Virada de mês e de ano.
  assert.equal(describeServiceDay('2026-11-01', '2026-10-31'), 'Amanhã');
  assert.equal(describeServiceDay('2027-01-01', '2026-12-31'), 'Amanhã');
});

test('o endereço do serviço vira uma linha só, sem partes vazias', () => {
  assert.equal(
    formatServiceAddress({ street: 'Rua A', number: '10', complement: '', district: 'Centro', city: 'São Paulo', state: 'SP', postalCode: '01001-000' }),
    'Rua A, 10, Centro, São Paulo - SP, 01001-000',
  );
  assert.equal(formatServiceAddress(null), '');
});

test('o link do Google Agenda cria um evento de dia inteiro com cliente, serviço, valor e endereço', () => {
  const url = new URL(buildGoogleCalendarUrl({
    quoteNumber: 42,
    clientName: 'Rafael Varjão',
    description: 'Instalação de 2 câmeras\nDetalhes que ficam só no orçamento',
    totalAmount: '1410.00',
    serviceDate: '2026-10-31',
    serviceAddress: { street: 'Rua A', number: '10', district: 'Centro', city: 'São Paulo', state: 'SP', postalCode: '01001-000' },
  }));

  assert.equal(url.origin + url.pathname, 'https://calendar.google.com/calendar/render');
  assert.equal(url.searchParams.get('action'), 'TEMPLATE');
  assert.equal(url.searchParams.get('text'), 'Serviço: Rafael Varjão');
  // O fim é o dia seguinte: no Google Agenda, um evento de dia inteiro termina no dia seguinte, sem contar.
  assert.equal(url.searchParams.get('dates'), '20261031/20261101');
  assert.equal(url.searchParams.get('details'), 'Instalação de 2 câmeras\nOrçamento nº 000042 — R$ 1.410,00');
  assert.equal(url.searchParams.get('location'), 'Rua A, 10, Centro, São Paulo - SP, 01001-000');
});
