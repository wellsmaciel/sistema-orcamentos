import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildEmailShareUrl, buildShareMessage, buildWhatsAppShareUrl, normalizeWhatsAppPhone } from '../src/utils/quote-share.js';

const publicUrl = 'https://frontend.example.com/?quote=token-123';

function buildQuote(overrides = {}) {
  return {
    quoteNumber: 42,
    description: 'Instalação de câmeras no galpão\nDetalhes técnicos na segunda linha',
    totalAmount: '1200.50',
    serviceDate: '2099-10-15',
    client: { name: 'Maria', email: 'maria@example.com', phone: '(11) 99999-8888' },
    provider: { name: 'Oficina do Rafael', phone: '(11) 3333-4444' },
    ...overrides,
  };
}

// O Intl usa espaço não separável entre "R$" e o valor.
const normalizeSpaces = (text) => text.replace(/\u00a0/g, ' ');

test('normaliza telefones brasileiros para o WhatsApp', () => {
  assert.equal(normalizeWhatsAppPhone('(11) 99999-8888'), '5511999998888');
  // Fixo não tem WhatsApp: o botão não aparece.
  assert.equal(normalizeWhatsAppPhone('1133334444'), null);
  assert.equal(normalizeWhatsAppPhone('+55 11 99999-8888'), '5511999998888');
  assert.equal(normalizeWhatsAppPhone('9999-8888'), null);
  assert.equal(normalizeWhatsAppPhone(''), null);
});

test('monta a mensagem com cliente, número, prestador, resumo, valor, data, link e contato', () => {
  assert.equal(normalizeSpaces(buildShareMessage(buildQuote(), publicUrl)), [
    'Olá, Maria!',
    '',
    'Segue o orçamento nº 000042 de Oficina do Rafael.',
    'Serviço: Instalação de câmeras no galpão',
    'Valor: R$ 1.200,50',
    'Data prevista: 15/10/2099',
    '',
    'Para ver os detalhes e aceitar ou recusar o orçamento, acesse:',
    publicUrl,
    '',
    'Em caso de dúvidas: (11) 3333-4444',
    'Oficina do Rafael',
  ].join('\n'));
});

test('sem os dados do prestador, a mensagem continua completa sem a assinatura', () => {
  const message = buildShareMessage(buildQuote({ provider: undefined }), publicUrl);

  assert.match(message, /^Olá, Maria!\n\nSegue o orçamento nº 000042\./);
  assert.ok(message.endsWith(publicUrl));
});

function serviceLineOf(description) {
  return buildShareMessage(buildQuote({ description }), publicUrl)
    .split('\n')
    .find((line) => line.startsWith('Serviço: '));
}

test('descrição longa sem espaços vira um resumo curto', () => {
  const serviceLine = serviceLineOf('x'.repeat(300));

  assert.equal(serviceLine.length, 'Serviço: '.length + 160);
  assert.ok(serviceLine.endsWith('...'));
});

test('o resumo termina numa palavra inteira, sem conectivo nem vírgula sobrando', () => {
  const serviceLine = serviceLineOf(
    'Troca de 3 tomadas com mau contato, instalação de 2 luminárias na cozinha, passagem de 8 metros de cabo no corredor e '
      + 'revisão completa do quadro de distribuição do apartamento',
  );

  assert.equal(
    serviceLine,
    'Serviço: Troca de 3 tomadas com mau contato, instalação de 2 luminárias na cozinha, passagem de 8 metros de cabo no corredor e revisão completa do quadro...',
  );
  assert.ok(serviceLine.length <= 'Serviço: '.length + 160);

  assert.equal(
    serviceLineOf(`${'palavra '.repeat(18)}cozinha, e de mais coisas que não cabem no resumo de jeito nenhum`),
    `Serviço: ${'palavra '.repeat(18)}cozinha...`,
  );
});

test('descrição curta vai inteira', () => {
  assert.equal(serviceLineOf('Instalação de 2 luminárias'), 'Serviço: Instalação de 2 luminárias');
});

test('o link do WhatsApp leva o número e a mensagem codificada', () => {
  const url = new URL(buildWhatsAppShareUrl(buildQuote(), publicUrl));

  assert.equal(url.origin + url.pathname, 'https://wa.me/5511999998888');
  assert.equal(url.searchParams.get('text'), buildShareMessage(buildQuote(), publicUrl));
});

test('sem telefone válido não há link do WhatsApp', () => {
  assert.equal(buildWhatsAppShareUrl(buildQuote({ client: { name: 'Maria', email: 'maria@example.com', phone: '123' } }), publicUrl), null);
});

test('o link de e-mail leva destinatário, assunto com a empresa e mensagem', () => {
  const url = buildEmailShareUrl(buildQuote(), publicUrl);
  const [address, query] = url.split('?');
  const parameters = new URLSearchParams(query);

  assert.equal(address, 'mailto:maria@example.com');
  assert.equal(parameters.get('subject'), 'Orçamento nº 000042 - Oficina do Rafael');
  assert.equal(parameters.get('body'), buildShareMessage(buildQuote(), publicUrl));
  assert.equal(new URLSearchParams(buildEmailShareUrl(buildQuote({ provider: undefined }), publicUrl).split('?')[1]).get('subject'), 'Orçamento nº 000042');
});
