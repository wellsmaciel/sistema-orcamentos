import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildEmailShareUrl, buildShareMessage, buildWhatsAppShareUrl, normalizeWhatsAppPhone } from '../src/utils/quote-share.js';

const publicUrl = 'https://frontend.example.com/?quote=token-123';

function buildQuote(overrides = {}) {
  return {
    quoteNumber: 42,
    client: { name: 'Maria', email: 'maria@example.com', phone: '(11) 99999-8888' },
    provider: { name: 'Oficina do Rafael' },
    ...overrides,
  };
}

test('normaliza telefones brasileiros para o WhatsApp', () => {
  assert.equal(normalizeWhatsAppPhone('(11) 99999-8888'), '5511999998888');
  // Fixo não tem WhatsApp: o botão não aparece.
  assert.equal(normalizeWhatsAppPhone('1133334444'), null);
  assert.equal(normalizeWhatsAppPhone('+55 11 99999-8888'), '5511999998888');
  assert.equal(normalizeWhatsAppPhone('9999-8888'), null);
  assert.equal(normalizeWhatsAppPhone(''), null);
});

test('monta a mensagem com cliente, número, prestador e link', () => {
  assert.equal(
    buildShareMessage(buildQuote(), publicUrl),
    'Olá, Maria! Segue o orçamento nº 000042 de Oficina do Rafael: https://frontend.example.com/?quote=token-123\nPelo link você pode ver os detalhes e aceitar ou recusar o orçamento.',
  );
  assert.match(buildShareMessage(buildQuote({ provider: undefined }), publicUrl), /^Olá, Maria! Segue o orçamento nº 000042: https/);
});

test('o link do WhatsApp leva o número e a mensagem codificada', () => {
  const url = new URL(buildWhatsAppShareUrl(buildQuote(), publicUrl));

  assert.equal(url.origin + url.pathname, 'https://wa.me/5511999998888');
  assert.equal(url.searchParams.get('text'), buildShareMessage(buildQuote(), publicUrl));
});

test('sem telefone válido não há link do WhatsApp', () => {
  assert.equal(buildWhatsAppShareUrl(buildQuote({ client: { name: 'Maria', email: 'maria@example.com', phone: '123' } }), publicUrl), null);
});

test('o link de e-mail leva destinatário, assunto e mensagem', () => {
  const url = buildEmailShareUrl(buildQuote(), publicUrl);
  const [address, query] = url.split('?');
  const parameters = new URLSearchParams(query);

  assert.equal(address, 'mailto:maria@example.com');
  assert.equal(parameters.get('subject'), 'Orçamento nº 000042');
  assert.equal(parameters.get('body'), buildShareMessage(buildQuote(), publicUrl));
});
