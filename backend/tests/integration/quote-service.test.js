import { randomUUID } from 'node:crypto';

import sequelize from '../../src/config/database.js';
import Client from '../../src/models/client.js';
import User from '../../src/models/user.js';
import { confirmQuote, createQuote, getPublicQuote, listQuotes, updateQuote, respondToPublicQuote, createQuoteCorrection } from '../../src/services/quote.js';

describe('Serviço de orçamentos', () => {
  let transaction;

  beforeAll(async () => {
    await sequelize.authenticate();
  });

  beforeEach(async () => {
    transaction = await sequelize.transaction();
  });

  afterEach(async () => {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
  });

  afterAll(async () => {
    await sequelize.close();
  });

  async function createUser(name) {
    return User.create(
      {
        auth0Subject: `auth0|quote-service-${randomUUID()}`,
        name,
        email: `${randomUUID()}@example.com`,
        emailVerified: true,
      },
      {
        transaction,
      },
    );
  }

  async function createClient(userId, active = true) {
    return Client.create(
      {
        userId,
        name: 'Cliente de Teste',
        email: 'cliente@example.com',
        phone: '11999999999',
        street: 'Rua do Cliente',
        number: '100',
        complement: null,
        postalCode: '01001-000',
        district: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        active,
      },
      {
        transaction,
      },
    );
  }

  function buildQuoteInput(clientId) {
    return {
      clientId,
      description: '  Execução do serviço solicitado.  ',
      totalAmount: '1500.5',
      serviceDate: '2026-10-15',
      serviceAddress: {
        street: '  Avenida do Serviço  ',
        number: '  200  ',
        complement: '   ',
        postalCode: '  02002-000  ',
        district: '  Bairro do Serviço  ',
        city: '  São Paulo  ',
        state: '  SP  ',
      },
      locationNotes: '  Entrar em contato antes da visita.  ',
    };
  }

  test('deve criar o rascunho e copiar os dados do cliente', async () => {
    const user = await createUser('Prestador de Teste');
    const client = await createClient(user.id);

    const quote = await createQuote(user.id, buildQuoteInput(client.id), {
      transaction,
    });

    expect(quote).not.toBeNull();
    expect(quote.userId).toBe(user.id);
    expect(quote.clientId).toBe(client.id);
    expect(quote.clientName).toBe(client.name);
    expect(quote.clientEmail).toBe(client.email);
    expect(quote.totalAmount).toBe('1500.50');
    expect(quote.description).toBe('Execução do serviço solicitado.');
    expect(quote.serviceStreet).toBe('Avenida do Serviço');
    expect(quote.serviceComplement).toBeNull();
    expect(quote.locationNotes).toBe('Entrar em contato antes da visita.');
    expect(quote.status).toBe('DRAFT');
  });

  test('não deve usar cliente pertencente a outro usuário', async () => {
    const owner = await createUser('Proprietário do Cliente');
    const otherUser = await createUser('Outro Prestador');
    const client = await createClient(owner.id);

    const quote = await createQuote(otherUser.id, buildQuoteInput(client.id), {
      transaction,
    });

    expect(quote).toBeNull();
  });

  test('não deve usar cliente inativo', async () => {
    const user = await createUser('Prestador de Teste');
    const client = await createClient(user.id, false);

    const quote = await createQuote(user.id, buildQuoteInput(client.id), {
      transaction,
    });

    expect(quote).toBeNull();
  });

  test('deve listar somente os orçamentos do usuário, do mais recente para o mais antigo', async () => {
    const user = await createUser('Prestador de Teste');
    const otherUser = await createUser('Outro Prestador');

    const client = await createClient(user.id);
    const otherClient = await createClient(otherUser.id);

    const olderQuote = await createQuote(user.id, buildQuoteInput(client.id), {
      transaction,
    });

    await new Promise((resolve) => {
      setTimeout(resolve, 10);
    });

    const newerQuote = await createQuote(
      user.id,
      {
        ...buildQuoteInput(client.id),
        description: 'Orçamento mais recente.',
      },
      {
        transaction,
      },
    );

    const otherUserQuote = await createQuote(otherUser.id, buildQuoteInput(otherClient.id), {
      transaction,
    });

    const quotes = await listQuotes(user.id, {
      transaction,
    });

    expect(quotes).toHaveLength(2);
    expect(quotes[0].id).toBe(newerQuote.id);
    expect(quotes[1].id).toBe(olderQuote.id);
    expect(quotes.map((quote) => quote.id)).not.toContain(otherUserQuote.id);
  });

  test('deve atualizar um orçamento em rascunho', async () => {
    const user = await createUser('Prestador de Teste');
    const client = await createClient(user.id);

    const quote = await createQuote(user.id, buildQuoteInput(client.id), {
      transaction,
    });

    const updateInput = buildQuoteInput(client.id);

    delete updateInput.clientId;

    updateInput.description = '  Descrição atualizada.  ';
    updateInput.totalAmount = '2000';

    const result = await updateQuote(user.id, quote.id, updateInput, {
      transaction,
    });

    expect(result.outcome).toBe('UPDATED');
    expect(result.quote.description).toBe('Descrição atualizada.');
    expect(result.quote.totalAmount).toBe('2000.00');
    expect(result.quote.clientId).toBe(client.id);
    expect(result.quote.clientName).toBe(client.name);
  });

  test('não deve atualizar orçamento pertencente a outro usuário', async () => {
    const owner = await createUser('Proprietário do Orçamento');
    const otherUser = await createUser('Outro Prestador');
    const client = await createClient(owner.id);

    const quote = await createQuote(owner.id, buildQuoteInput(client.id), {
      transaction,
    });

    const updateInput = buildQuoteInput(client.id);

    delete updateInput.clientId;

    const result = await updateQuote(otherUser.id, quote.id, updateInput, {
      transaction,
    });

    expect(result).toEqual({
      outcome: 'NOT_FOUND',
    });
  });

  test('não deve atualizar orçamento que não está em rascunho', async () => {
    const user = await createUser('Prestador de Teste');
    const client = await createClient(user.id);

    const quote = await createQuote(user.id, buildQuoteInput(client.id), {
      transaction,
    });

    await quote.update(
      {
        status: 'SENT',
      },
      {
        transaction,
      },
    );

    const updateInput = buildQuoteInput(client.id);

    delete updateInput.clientId;

    const result = await updateQuote(user.id, quote.id, updateInput, {
      transaction,
    });

    expect(result).toEqual({
      outcome: 'NOT_EDITABLE',
    });
  });
  test('deve confirmar um orçamento em rascunho e gerar o token público', async () => {
    const user = await createUser('Prestador de Teste');
    const client = await createClient(user.id);

    const quote = await createQuote(user.id, buildQuoteInput(client.id), {
      transaction,
    });

    const result = await confirmQuote(user.id, quote.id, {
      transaction,
    });

    expect(result.outcome).toBe('CONFIRMED');
    expect(result.quote.status).toBe('SENT');
    expect(result.quote.publicToken).toMatch(/^[0-9a-f]{64}$/);
    expect(result.quote.sentAt).toBeInstanceOf(Date);
  });

  test('não deve confirmar orçamento pertencente a outro usuário', async () => {
    const owner = await createUser('Proprietário do Orçamento');
    const otherUser = await createUser('Outro Prestador');
    const client = await createClient(owner.id);

    const quote = await createQuote(owner.id, buildQuoteInput(client.id), {
      transaction,
    });

    const result = await confirmQuote(otherUser.id, quote.id, {
      transaction,
    });

    expect(result).toEqual({
      outcome: 'NOT_FOUND',
    });
  });

  test('não deve confirmar novamente um orçamento enviado', async () => {
    const user = await createUser('Prestador de Teste');
    const client = await createClient(user.id);

    const quote = await createQuote(user.id, buildQuoteInput(client.id), {
      transaction,
    });

    await confirmQuote(user.id, quote.id, {
      transaction,
    });

    const secondResult = await confirmQuote(user.id, quote.id, {
      transaction,
    });

    expect(secondResult).toEqual({
      outcome: 'NOT_CONFIRMABLE',
    });
  });

  test('deve localizar um orçamento confirmado pelo token público', async () => {
    const user = await createUser('Prestador de Teste');
    const client = await createClient(user.id);

    const quote = await createQuote(user.id, buildQuoteInput(client.id), {
      transaction,
    });

    const confirmationResult = await confirmQuote(user.id, quote.id, {
      transaction,
    });

    const publicQuote = await getPublicQuote(confirmationResult.quote.publicToken, {
      transaction,
    });

    expect(publicQuote).not.toBeNull();
    expect(publicQuote.id).toBe(quote.id);
    expect(publicQuote.status).toBe('SENT');
  });

  test('não deve consultar publicamente um orçamento sem token válido', async () => {
    const publicQuote = await getPublicQuote('token-invalido', {
      transaction,
    });

    expect(publicQuote).toBeNull();
  });

  test('deve registrar a aceitação do orçamento pelo cliente', async () => {
    const user = await createUser('Prestador de Teste');
    const client = await createClient(user.id);

    const quote = await createQuote(user.id, buildQuoteInput(client.id), {
      transaction,
    });

    const confirmationResult = await confirmQuote(user.id, quote.id, {
      transaction,
    });

    const result = await respondToPublicQuote(
      confirmationResult.quote.publicToken,
      {
        decision: 'ACCEPTED',
      },
      {
        transaction,
      },
    );

    expect(result.outcome).toBe('RESPONDED');
    expect(result.quote.status).toBe('ACCEPTED');
    expect(result.quote.respondedAt).toBeInstanceOf(Date);
    expect(result.quote.rejectionReason).toBeNull();
  });

  test('deve registrar a recusa e normalizar o motivo', async () => {
    const user = await createUser('Prestador de Teste');
    const client = await createClient(user.id);

    const quote = await createQuote(user.id, buildQuoteInput(client.id), {
      transaction,
    });

    const confirmationResult = await confirmQuote(user.id, quote.id, {
      transaction,
    });

    const result = await respondToPublicQuote(
      confirmationResult.quote.publicToken,
      {
        decision: 'REJECTED',
        reason: '  O valor precisa ser revisto.  ',
      },
      {
        transaction,
      },
    );

    expect(result.outcome).toBe('RESPONDED');
    expect(result.quote.status).toBe('REJECTED');
    expect(result.quote.respondedAt).toBeInstanceOf(Date);
    expect(result.quote.rejectionReason).toBe('O valor precisa ser revisto.');
  });

  test('não deve permitir uma segunda resposta ao orçamento', async () => {
    const user = await createUser('Prestador de Teste');
    const client = await createClient(user.id);

    const quote = await createQuote(user.id, buildQuoteInput(client.id), {
      transaction,
    });

    const confirmationResult = await confirmQuote(user.id, quote.id, {
      transaction,
    });

    await respondToPublicQuote(
      confirmationResult.quote.publicToken,
      {
        decision: 'ACCEPTED',
      },
      {
        transaction,
      },
    );

    const secondResult = await respondToPublicQuote(
      confirmationResult.quote.publicToken,
      {
        decision: 'REJECTED',
        reason: 'Tentativa de alterar a resposta.',
      },
      {
        transaction,
      },
    );

    expect(secondResult).toEqual({
      outcome: 'NOT_RESPONDABLE',
    });
  });
  test('deve criar um novo rascunho a partir de um orçamento recusado', async () => {
    const user = await createUser('Prestador de Teste');
    const client = await createClient(user.id);

    const originalQuote = await createQuote(user.id, buildQuoteInput(client.id), {
      transaction,
    });

    const confirmationResult = await confirmQuote(user.id, originalQuote.id, {
      transaction,
    });

    await respondToPublicQuote(
      confirmationResult.quote.publicToken,
      {
        decision: 'REJECTED',
        reason: 'O valor precisa ser revisto.',
      },
      {
        transaction,
      },
    );

    const result = await createQuoteCorrection(user.id, originalQuote.id, {
      transaction,
    });

    expect(result.outcome).toBe('CORRECTION_CREATED');
    expect(result.quote.id).not.toBe(originalQuote.id);
    expect(result.quote.quoteNumber).not.toBe(originalQuote.quoteNumber);
    expect(result.quote.status).toBe('DRAFT');
    expect(result.quote.correctedFromId).toBe(originalQuote.id);
    expect(result.quote.description).toBe(originalQuote.description);
    expect(result.quote.totalAmount).toBe(originalQuote.totalAmount);
    expect(result.quote.publicToken).toBeNull();
    expect(result.quote.sentAt).toBeNull();
    expect(result.quote.respondedAt).toBeNull();
    expect(result.quote.rejectionReason).toBeNull();
  });

  test('não deve criar correção de orçamento que não foi recusado', async () => {
    const user = await createUser('Prestador de Teste');
    const client = await createClient(user.id);

    const quote = await createQuote(user.id, buildQuoteInput(client.id), {
      transaction,
    });

    const result = await createQuoteCorrection(user.id, quote.id, {
      transaction,
    });

    expect(result).toEqual({
      outcome: 'NOT_CORRECTABLE',
    });
  });

  test('não deve criar duas correções para o mesmo orçamento', async () => {
    const user = await createUser('Prestador de Teste');
    const client = await createClient(user.id);

    const originalQuote = await createQuote(user.id, buildQuoteInput(client.id), {
      transaction,
    });

    const confirmationResult = await confirmQuote(user.id, originalQuote.id, {
      transaction,
    });

    await respondToPublicQuote(
      confirmationResult.quote.publicToken,
      {
        decision: 'REJECTED',
      },
      {
        transaction,
      },
    );

    const firstResult = await createQuoteCorrection(user.id, originalQuote.id, {
      transaction,
    });

    const secondResult = await createQuoteCorrection(user.id, originalQuote.id, {
      transaction,
    });

    expect(firstResult.outcome).toBe('CORRECTION_CREATED');
    expect(secondResult.outcome).toBe('ALREADY_CORRECTED');
    expect(secondResult.quote.id).toBe(firstResult.quote.id);
  });

  test('não deve corrigir orçamento pertencente a outro usuário', async () => {
    const owner = await createUser('Proprietário do Orçamento');
    const otherUser = await createUser('Outro Prestador');
    const client = await createClient(owner.id);

    const quote = await createQuote(owner.id, buildQuoteInput(client.id), {
      transaction,
    });

    const result = await createQuoteCorrection(otherUser.id, quote.id, {
      transaction,
    });

    expect(result).toEqual({
      outcome: 'NOT_FOUND',
    });
  });
});
