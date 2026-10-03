import { randomUUID } from 'node:crypto';

import sequelize from '../../src/config/database.js';
import Client from '../../src/models/client.js';
import User from '../../src/models/user.js';
import Company from '../../src/models/company.js';
import { confirmQuote, createQuote, getPublicQuote, updateQuote, respondToPublicQuote, createQuoteCorrection, listQuotesPage, getQuoteHistory } from '../../src/services/quote.js';
import { jest } from '@jest/globals';
import Quote from '../../src/models/quote.js';
import QuoteItem from '../../src/models/quote-item.js';

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

  async function createUserWithoutCompany(name) {
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

  async function createUser(name) {
    const user = await createUserWithoutCompany(name);

    await Company.create(
      {
        ownerUserId: user.id,
        name: `${name} Serviços`,
        email: 'profissional@example.com',
        phone: '11988887777',
        taxId: '12345678901',
        street: 'Rua Profissional',
        number: '200',
        complement: 'Sala 1',
        postalCode: '01001-001',
        district: 'Centro',
        city: 'São Paulo',
        state: 'SP',
      },
      {
        transaction,
      },
    );

    return user;
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
      pricingMode: 'FIXED_TOTAL',
      items: [
        {
          description: 'Mão de obra',
          quantity: '1',
        },
      ],
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

    const { items: quotes } = await listQuotesPage(user.id, {
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
    expect(result.quote.providerName).toBe('Prestador de Teste Serviços');
    expect(result.quote.providerEmail).toBe('profissional@example.com');
    expect(result.quote.providerPhone).toBe('11988887777');
    expect(result.quote.providerTaxId).toBe('12345678901');
    expect(result.quote.providerStreet).toBe('Rua Profissional');
    expect(result.quote.providerNumber).toBe('200');
    expect(result.quote.providerComplement).toBe('Sala 1');
    expect(result.quote.providerPostalCode).toBe('01001-001');
    expect(result.quote.providerDistrict).toBe('Centro');
    expect(result.quote.providerCity).toBe('São Paulo');
    expect(result.quote.providerState).toBe('SP');
  });

  test('não deve confirmar um orçamento sem perfil profissional', async () => {
    const user = await createUserWithoutCompany('Prestador sem Perfil');
    const client = await createClient(user.id);

    const quote = await createQuote(user.id, buildQuoteInput(client.id), {
      transaction,
    });

    const result = await confirmQuote(user.id, quote.id, {
      transaction,
    });

    expect(result).toEqual({
      outcome: 'COMPANY_NOT_FOUND',
    });

    await quote.reload({
      transaction,
    });

    expect(quote.status).toBe('DRAFT');
    expect(quote.publicToken).toBeNull();
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

  test('deve combinar filtros de cliente, situação e data sem acessar outra conta', async () => {
    const user = await createUser('Prestador dos Filtros');
    const otherUser = await createUser('Outro Prestador');
    const client = await createClient(user.id);
    const otherClient = await createClient(otherUser.id);

    const matchingQuote = await createQuote(
      user.id,
      {
        ...buildQuoteInput(client.id),
        serviceDate: '2026-10-15',
      },
      { transaction },
    );

    await matchingQuote.update({ status: 'ACCEPTED' }, { transaction });

    const outsidePeriod = await createQuote(
      user.id,
      {
        ...buildQuoteInput(client.id),
        serviceDate: '2026-11-01',
      },
      { transaction },
    );

    await outsidePeriod.update({ status: 'ACCEPTED' }, { transaction });

    await createQuote(
      user.id,
      {
        ...buildQuoteInput(client.id),
        serviceDate: '2026-10-15',
      },
      { transaction },
    );

    const otherQuote = await createQuote(
      otherUser.id,
      {
        ...buildQuoteInput(otherClient.id),
        serviceDate: '2026-10-15',
      },
      { transaction },
    );

    await otherQuote.update({ status: 'ACCEPTED' }, { transaction });

    const result = await listQuotesPage(user.id, {
      search: 'CLIENTE',
      status: 'ACCEPTED',
      serviceDateFrom: '2026-10-01',
      serviceDateTo: '2026-10-31',
      transaction,
    });

    expect(result.items.map((quote) => quote.id)).toEqual([matchingQuote.id]);
    expect(result.total).toBe(1);

    const noMatches = await listQuotesPage(user.id, {
      search: 'Nome inexistente',
      transaction,
    });

    expect(noMatches.items).toEqual([]);
    expect(noMatches.total).toBe(0);
  });

  test('deve buscar pelo número do orçamento, com ou sem zeros e prefixo, só entre os do prestador', async () => {
    const user = await createUser('Prestador da Busca por Número');
    const otherUser = await createUser('Outro Prestador da Busca por Número');
    const client = await createClient(user.id);
    const otherClient = await createClient(otherUser.id);
    const wanted = await createQuote(user.id, buildQuoteInput(client.id), { transaction });
    await createQuote(user.id, buildQuoteInput(client.id), { transaction });
    const otherQuote = await createQuote(otherUser.id, buildQuoteInput(otherClient.id), { transaction });

    for (const search of [String(wanted.quoteNumber), String(wanted.quoteNumber).padStart(6, '0'), `nº ${wanted.quoteNumber}`, `#${wanted.quoteNumber}`]) {
      const result = await listQuotesPage(user.id, { search, transaction });

      expect(result.items.map((quote) => quote.id)).toEqual([wanted.id]);
    }

    const foreign = await listQuotesPage(user.id, { search: String(otherQuote.quoteNumber), transaction });
    expect(foreign.items.map((quote) => quote.id)).not.toContain(otherQuote.id);
  });

  test('deve paginar orçamentos com os mais recentes primeiro', async () => {
    const user = await createUser('Prestador da Paginação');
    const client = await createClient(user.id);
    const createdQuotes = [];

    for (let index = 0; index < 3; index += 1) {
      const quote = await createQuote(user.id, buildQuoteInput(client.id), { transaction });

      createdQuotes.push(quote);
    }

    const result = await listQuotesPage(user.id, {
      page: 2,
      pageSize: 2,
      transaction,
    });

    expect(result.items.map((quote) => quote.id)).toEqual([createdQuotes[0].id]);
    expect(result.total).toBe(3);
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(2);
    expect(result.totalPages).toBe(2);
  });

  test('deve localizar os vínculos de correção fora do filtro atual', async () => {
    const user = await createUser('Prestador das Correções');
    const client = await createClient(user.id);

    const originalQuote = await createQuote(user.id, buildQuoteInput(client.id), { transaction });

    await originalQuote.update({ status: 'REJECTED' }, { transaction });

    const correctionResult = await createQuoteCorrection(user.id, originalQuote.id, { transaction });

    const correction = correctionResult.quote;

    const drafts = await listQuotesPage(user.id, {
      status: 'DRAFT',
      pageSize: 1,
      transaction,
    });

    expect(drafts.items.map((quote) => quote.id)).toEqual([correction.id]);

    expect(drafts.relatedQuotes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: originalQuote.id,
          quoteNumber: originalQuote.quoteNumber,
        }),
      ]),
    );

    const rejected = await listQuotesPage(user.id, {
      status: 'REJECTED',
      pageSize: 1,
      transaction,
    });

    expect(rejected.items.map((quote) => quote.id)).toEqual([originalQuote.id]);

    expect(rejected.relatedQuotes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: correction.id,
          correctedFromId: originalQuote.id,
        }),
      ]),
    );
  });

  test('itens: deve criar orçamento por item e calcular o total', async () => {
    const user = await createUser('Prestador por Item');
    const client = await createClient(user.id);
    const input = buildQuoteInput(client.id);

    input.pricingMode = 'ITEMIZED';
    delete input.totalAmount;

    input.items = [
      {
        description: '  Cabo elétrico  ',
        quantity: '  2.5  ',
        unitPrice: '  19.99  ',
      },
      {
        description: '  Mão de obra  ',
        quantity: '1.2',
        unitPrice: '8.00',
      },
    ];

    const quote = await createQuote(user.id, input, { transaction });

    const items = await QuoteItem.findAll({
      where: { quoteId: quote.id },
      order: [['position', 'ASC']],
      transaction,
    });

    expect(quote.pricingMode).toBe('ITEMIZED');
    expect(quote.totalAmount).toBe('59.58');
    expect(quote.status).toBe('DRAFT');

    expect(items).toHaveLength(2);
    expect(items.map((item) => item.description)).toEqual(['Cabo elétrico', 'Mão de obra']);
    expect(items.map((item) => item.quantity)).toEqual(['2.500', '1.200']);
    expect(items.map((item) => item.unitPrice)).toEqual(['19.99', '8.00']);
    expect(items.map((item) => item.position)).toEqual([1, 2]);
  });

  test('itens: deve criar orçamento global sem preços individuais', async () => {
    const user = await createUser('Prestador Global');
    const client = await createClient(user.id);
    const input = buildQuoteInput(client.id);

    input.totalAmount = '  1000.00  ';
    input.items = [
      {
        description: '  Escapamento  ',
        quantity: '1',
      },
      {
        description: '  Mão de obra  ',
        quantity: '1',
        unitPrice: null,
      },
    ];

    const quote = await createQuote(user.id, input, { transaction });

    const items = await QuoteItem.findAll({
      where: { quoteId: quote.id },
      order: [['position', 'ASC']],
      transaction,
    });

    expect(quote.pricingMode).toBe('FIXED_TOTAL');
    expect(quote.totalAmount).toBe('1000.00');
    expect(items).toHaveLength(2);
    expect(items.every((item) => item.unitPrice === null)).toBe(true);
    expect(items.map((item) => item.description)).toEqual(['Escapamento', 'Mão de obra']);
    expect(items.map((item) => item.position)).toEqual([1, 2]);
  });

  test('itens: deve desfazer o orçamento se a gravação dos itens falhar', async () => {
    const user = await createUser('Prestador da Transação');
    const client = await createClient(user.id);
    const input = buildQuoteInput(client.id);

    const writeError = new Error('Falha simulada ao salvar itens.');
    const itemsSpy = jest.spyOn(QuoteItem, 'bulkCreate').mockRejectedValueOnce(writeError);

    try {
      await expect(createQuote(user.id, input, { transaction })).rejects.toBe(writeError);

      expect(itemsSpy).toHaveBeenCalledTimes(1);

      const quoteCount = await Quote.count({
        where: { userId: user.id },
        transaction,
      });

      expect(quoteCount).toBe(0);
    } finally {
      itemsSpy.mockRestore();
    }
  });

  test('edição de itens: deve mudar de global para por item e recalcular o total', async () => {
    const user = await createUser('Prestador da Edição');
    const client = await createClient(user.id);

    const quote = await createQuote(user.id, buildQuoteInput(client.id), { transaction });

    const input = buildQuoteInput(client.id);
    delete input.clientId;
    delete input.totalAmount;

    input.pricingMode = 'ITEMIZED';
    input.description = '  Serviço atualizado.  ';
    input.items = [
      {
        description: '  Cabo elétrico  ',
        quantity: '2.5',
        unitPrice: '19.99',
      },
      {
        description: 'Mão de obra',
        quantity: '1.2',
        unitPrice: '8.00',
      },
    ];

    const result = await updateQuote(user.id, quote.id, input, {
      transaction,
    });

    const items = await QuoteItem.findAll({
      where: { quoteId: quote.id },
      order: [['position', 'ASC']],
      transaction,
    });

    expect(result.outcome).toBe('UPDATED');
    expect(result.quote.status).toBe('DRAFT');
    expect(result.quote.pricingMode).toBe('ITEMIZED');
    expect(result.quote.description).toBe('Serviço atualizado.');
    expect(result.quote.totalAmount).toBe('59.58');
    expect(result.quote.clientId).toBe(client.id);

    expect(items).toHaveLength(2);
    expect(items.map((item) => item.description)).toEqual(['Cabo elétrico', 'Mão de obra']);
    expect(items.map((item) => item.unitPrice)).toEqual(['19.99', '8.00']);
    expect(items.map((item) => item.position)).toEqual([1, 2]);
  });

  test('edição de itens: deve mudar para global e substituir os itens anteriores', async () => {
    const user = await createUser('Prestador do Valor Global');
    const client = await createClient(user.id);

    const initialInput = buildQuoteInput(client.id);
    initialInput.pricingMode = 'ITEMIZED';
    delete initialInput.totalAmount;

    initialInput.items = [
      { description: 'Peça', quantity: '2', unitPrice: '50.00' },
      { description: 'Instalação', quantity: '1', unitPrice: '100.00' },
    ];

    const quote = await createQuote(user.id, initialInput, {
      transaction,
    });

    const input = buildQuoteInput(client.id);
    delete input.clientId;

    input.totalAmount = '  1000.00  ';
    input.items = [
      {
        description: '  Serviço completo  ',
        quantity: '1',
      },
    ];

    const result = await updateQuote(user.id, quote.id, input, {
      transaction,
    });

    const items = await QuoteItem.findAll({
      where: { quoteId: quote.id },
      order: [['position', 'ASC']],
      transaction,
    });

    expect(result.outcome).toBe('UPDATED');
    expect(result.quote.pricingMode).toBe('FIXED_TOTAL');
    expect(result.quote.totalAmount).toBe('1000.00');

    expect(items).toHaveLength(1);
    expect(items[0].description).toBe('Serviço completo');
    expect(items[0].unitPrice).toBeNull();
    expect(items[0].position).toBe(1);
  });

  test('edição de itens: deve preservar o orçamento e os itens se a gravação falhar', async () => {
    const user = await createUser('Prestador da Segurança');
    const client = await createClient(user.id);

    const quote = await createQuote(user.id, buildQuoteInput(client.id), { transaction });

    const originalDescription = quote.description;

    const originalItems = await QuoteItem.findAll({
      where: { quoteId: quote.id },
      order: [['position', 'ASC']],
      transaction,
      raw: true,
    });

    const input = buildQuoteInput(client.id);
    delete input.clientId;

    input.description = 'Esta alteração não deve ser salva.';
    input.totalAmount = '999.00';
    input.items = [{ description: 'Novo item', quantity: '2' }];

    const writeError = new Error('Falha simulada na edição dos itens.');
    const itemsSpy = jest.spyOn(QuoteItem, 'bulkCreate').mockRejectedValueOnce(writeError);

    try {
      await expect(updateQuote(user.id, quote.id, input, { transaction })).rejects.toBe(writeError);

      expect(itemsSpy).toHaveBeenCalledTimes(1);

      await quote.reload({ transaction });

      const persistedItems = await QuoteItem.findAll({
        where: { quoteId: quote.id },
        order: [['position', 'ASC']],
        transaction,
        raw: true,
      });

      expect(quote.description).toBe(originalDescription);
      expect(quote.pricingMode).toBe('FIXED_TOTAL');
      expect(quote.totalAmount).toBe('1500.50');
      expect(persistedItems).toEqual(originalItems);
    } finally {
      itemsSpy.mockRestore();
    }
  });

  test('confirmação de itens: deve confirmar orçamento por item sem alterar seus itens', async () => {
    const user = await createUser('Prestador da Confirmação');
    const client = await createClient(user.id);

    const input = buildQuoteInput(client.id);
    input.pricingMode = 'ITEMIZED';
    delete input.totalAmount;

    input.items = [
      {
        description: 'Instalação',
        quantity: '2',
        unitPrice: '50.00',
      },
    ];

    const quote = await createQuote(user.id, input, {
      transaction,
    });

    const originalItems = await QuoteItem.findAll({
      where: { quoteId: quote.id },
      order: [['position', 'ASC']],
      transaction,
      raw: true,
    });

    const result = await confirmQuote(user.id, quote.id, {
      transaction,
    });

    const persistedItems = await QuoteItem.findAll({
      where: { quoteId: quote.id },
      order: [['position', 'ASC']],
      transaction,
      raw: true,
    });

    expect(result.outcome).toBe('CONFIRMED');
    expect(result.quote.status).toBe('SENT');
    expect(result.quote.pricingMode).toBe('ITEMIZED');
    expect(result.quote.totalAmount).toBe('100.00');
    expect(result.quote.publicToken).toMatch(/^[0-9a-f]{64}$/);
    expect(persistedItems).toEqual(originalItems);
  });

  test('confirmação de itens: deve bloquear orçamento sem itens', async () => {
    const user = await createUser('Prestador sem Itens');
    const client = await createClient(user.id);

    const quote = await createQuote(user.id, buildQuoteInput(client.id), { transaction });

    // Simula um registro antigo ou incompleto somente neste teste.
    await QuoteItem.destroy({
      where: { quoteId: quote.id },
      transaction,
    });

    const result = await confirmQuote(user.id, quote.id, {
      transaction,
    });

    expect(result).toEqual(
      expect.objectContaining({
        outcome: 'INVALID_ITEMS',
      }),
    );

    await quote.reload({ transaction });

    expect(quote.status).toBe('DRAFT');
    expect(quote.publicToken).toBeNull();
    expect(quote.sentAt).toBeNull();
  });

  test('confirmação de itens: deve bloquear total diferente da soma dos itens', async () => {
    const user = await createUser('Prestador do Total');
    const client = await createClient(user.id);

    const input = buildQuoteInput(client.id);
    input.pricingMode = 'ITEMIZED';
    delete input.totalAmount;

    input.items = [
      {
        description: 'Instalação',
        quantity: '2',
        unitPrice: '50.00',
      },
    ];

    const quote = await createQuote(user.id, input, {
      transaction,
    });

    // Simula uma inconsistência somente neste teste.
    await quote.update({ totalAmount: '101.00' }, { transaction });

    const result = await confirmQuote(user.id, quote.id, {
      transaction,
    });

    expect(result).toEqual(
      expect.objectContaining({
        outcome: 'INVALID_ITEMS',
      }),
    );

    await quote.reload({ transaction });

    expect(quote.status).toBe('DRAFT');
    expect(quote.publicToken).toBeNull();
    expect(quote.sentAt).toBeNull();
    expect(quote.totalAmount).toBe('101.00');
  });

  test.each(['FIXED_TOTAL', 'ITEMIZED'])('correção de itens: deve copiar os itens de %s e preservar o original', async (pricingMode) => {
    const user = await createUser('Prestador da Correção');
    const client = await createClient(user.id);

    const input = buildQuoteInput(client.id);
    input.pricingMode = pricingMode;
    input.items = [
      { description: 'Peça', quantity: '2.5' },
      { description: 'Instalação', quantity: '1' },
    ];

    if (pricingMode === 'ITEMIZED') {
      delete input.totalAmount;
      input.items[0].unitPrice = '19.99';
      input.items[1].unitPrice = '10.00';
    }

    const originalQuote = await createQuote(user.id, input, {
      transaction,
    });

    const confirmation = await confirmQuote(user.id, originalQuote.id, {
      transaction,
    });

    await respondToPublicQuote(
      confirmation.quote.publicToken,
      {
        decision: 'REJECTED',
        reason: 'Revisar o serviço.',
      },
      { transaction },
    );

    await originalQuote.reload({ transaction });
    const originalData = originalQuote.toJSON();

    const originalItems = await QuoteItem.findAll({
      where: { quoteId: originalQuote.id },
      order: [['position', 'ASC']],
      transaction,
      raw: true,
    });

    const result = await createQuoteCorrection(user.id, originalQuote.id, { transaction });

    expect(result.outcome).toBe('CORRECTION_CREATED');
    expect(result.quote.id).not.toBe(originalQuote.id);
    expect(result.quote.correctedFromId).toBe(originalQuote.id);
    expect(result.quote.status).toBe('DRAFT');
    expect(result.quote.pricingMode).toBe(pricingMode);
    expect(result.quote.totalAmount).toBe(originalQuote.totalAmount);
    expect(result.quote.publicToken).toBeNull();
    expect(result.quote.sentAt).toBeNull();
    expect(result.quote.respondedAt).toBeNull();
    expect(result.quote.rejectionReason).toBeNull();

    const copiedItems = await QuoteItem.findAll({
      where: { quoteId: result.quote.id },
      order: [['position', 'ASC']],
      transaction,
      raw: true,
    });

    expect(copiedItems).toHaveLength(originalItems.length);

    copiedItems.forEach((item, index) => {
      const originalItem = originalItems[index];

      expect(item.id).not.toBe(originalItem.id);
      expect(item.quoteId).toBe(result.quote.id);
      expect(item.description).toBe(originalItem.description);
      expect(item.quantity).toBe(originalItem.quantity);
      expect(item.unitPrice).toBe(originalItem.unitPrice);
      expect(item.position).toBe(originalItem.position);
    });

    const updateInput = buildQuoteInput(client.id);
    delete updateInput.clientId;

    updateInput.description = 'Serviço corrigido.';
    updateInput.totalAmount = '1200.00';
    updateInput.items = [{ description: 'Novo serviço', quantity: '1' }];

    const updateResult = await updateQuote(user.id, result.quote.id, updateInput, { transaction });

    expect(updateResult.outcome).toBe('UPDATED');

    await originalQuote.reload({ transaction });

    const preservedItems = await QuoteItem.findAll({
      where: { quoteId: originalQuote.id },
      order: [['position', 'ASC']],
      transaction,
      raw: true,
    });

    expect(originalQuote.toJSON()).toEqual(originalData);
    expect(preservedItems).toEqual(originalItems);
  });

  test('correção de itens: deve desfazer a correção se a cópia dos itens falhar', async () => {
    const user = await createUser('Prestador da Transação');
    const client = await createClient(user.id);

    const originalQuote = await createQuote(user.id, buildQuoteInput(client.id), { transaction });

    const confirmation = await confirmQuote(user.id, originalQuote.id, {
      transaction,
    });

    await respondToPublicQuote(confirmation.quote.publicToken, { decision: 'REJECTED', reason: 'Revisar o serviço.' }, { transaction });

    const writeError = new Error('Falha simulada ao copiar os itens.');
    const itemsSpy = jest.spyOn(QuoteItem, 'bulkCreate').mockRejectedValueOnce(writeError);

    try {
      await expect(createQuoteCorrection(user.id, originalQuote.id, { transaction })).rejects.toBe(writeError);

      expect(itemsSpy).toHaveBeenCalledTimes(1);

      const correctionCount = await Quote.count({
        where: { correctedFromId: originalQuote.id },
        transaction,
      });

      expect(correctionCount).toBe(0);

      await originalQuote.reload({ transaction });
      expect(originalQuote.status).toBe('REJECTED');

      const originalItemCount = await QuoteItem.count({
        where: { quoteId: originalQuote.id },
        transaction,
      });

      expect(originalItemCount).toBe(1);
    } finally {
      itemsSpy.mockRestore();
    }
  });

  test('consulta de itens: deve listar os itens na ordem de preenchimento sem acessar outra conta', async () => {
    const user = await createUser('Prestador da Consulta');
    const otherUser = await createUser('Outro Prestador');
    const client = await createClient(user.id);
    const otherClient = await createClient(otherUser.id);

    const input = buildQuoteInput(client.id);
    input.items = [
      { description: 'Item Z', quantity: '2.5' },
      { description: 'Item A', quantity: '1' },
    ];

    const quote = await createQuote(user.id, input, {
      transaction,
    });

    await createQuote(otherUser.id, buildQuoteInput(otherClient.id), { transaction });

    const { items: quotes } = await listQuotesPage(user.id, { transaction });

    expect(quotes).toHaveLength(1);
    expect(quotes[0].id).toBe(quote.id);
    expect(quotes[0].items).toHaveLength(2);
    expect(quotes[0].items.map((item) => item.description)).toEqual(['Item Z', 'Item A']);
    expect(quotes[0].items.map((item) => item.position)).toEqual([1, 2]);
    expect(quotes[0].items.every((item) => item.quoteId === quote.id)).toBe(true);
  });

  test('consulta de itens: deve paginar orçamentos sem contar cada item como um orçamento', async () => {
    const user = await createUser('Prestador da Paginação');
    const client = await createClient(user.id);

    const olderInput = buildQuoteInput(client.id);
    olderInput.items = [
      { description: 'Primeiro item', quantity: '1' },
      { description: 'Segundo item', quantity: '2' },
      { description: 'Terceiro item', quantity: '3' },
    ];

    const olderQuote = await createQuote(user.id, olderInput, {
      transaction,
    });

    const newerInput = buildQuoteInput(client.id);
    newerInput.items = [
      { description: 'Instalação', quantity: '1' },
      { description: 'Acabamento', quantity: '1' },
    ];

    await createQuote(user.id, newerInput, { transaction });

    const result = await listQuotesPage(user.id, {
      page: 2,
      pageSize: 1,
      transaction,
    });

    expect(result.total).toBe(2);
    expect(result.totalPages).toBe(2);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe(olderQuote.id);
    expect(result.items[0].items).toHaveLength(3);
    expect(result.items[0].items.map((item) => item.description)).toEqual(['Primeiro item', 'Segundo item', 'Terceiro item']);
  });

  test('consulta de itens: deve carregar os itens pelo token público', async () => {
    const user = await createUser('Prestador do Link Público');
    const client = await createClient(user.id);

    const input = buildQuoteInput(client.id);
    input.pricingMode = 'ITEMIZED';
    delete input.totalAmount;

    input.items = [
      {
        description: 'Cabo elétrico',
        quantity: '2.5',
        unitPrice: '19.99',
      },
    ];

    const quote = await createQuote(user.id, input, {
      transaction,
    });

    const confirmation = await confirmQuote(user.id, quote.id, {
      transaction,
    });

    const publicQuote = await getPublicQuote(confirmation.quote.publicToken, { transaction });

    expect(publicQuote).not.toBeNull();
    expect(publicQuote.pricingMode).toBe('ITEMIZED');
    expect(publicQuote.totalAmount).toBe('49.98');
    expect(publicQuote.items).toHaveLength(1);
    expect(publicQuote.items[0].quoteId).toBe(quote.id);
    expect(publicQuote.items[0].description).toBe('Cabo elétrico');
    expect(publicQuote.items[0].quantity).toBe('2.500');
    expect(publicQuote.items[0].unitPrice).toBe('19.99');
  });

  test('retorno de itens: deve devolver os itens atualizados durante todo o fluxo', async () => {
    const user = await createUser('Prestador dos Retornos');
    const client = await createClient(user.id);

    const input = buildQuoteInput(client.id);
    input.items = [
      { description: 'Instalação', quantity: '1' },
      { description: 'Acabamento', quantity: '2.5' },
    ];

    const quote = await createQuote(user.id, input, {
      transaction,
    });

    expect(quote.items).toHaveLength(2);
    expect(quote.items.map((item) => item.position)).toEqual([1, 2]);

    const updateInput = buildQuoteInput(client.id);
    delete updateInput.clientId;
    delete updateInput.totalAmount;

    updateInput.pricingMode = 'ITEMIZED';
    updateInput.items = [
      {
        description: 'Cabo elétrico',
        quantity: '2.5',
        unitPrice: '19.99',
      },
    ];

    const updateResult = await updateQuote(user.id, quote.id, updateInput, { transaction });

    expect(updateResult.outcome).toBe('UPDATED');
    expect(updateResult.quote.pricingMode).toBe('ITEMIZED');
    expect(updateResult.quote.totalAmount).toBe('49.98');
    expect(updateResult.quote.items).toHaveLength(1);
    expect(updateResult.quote.items[0].description).toBe('Cabo elétrico');

    const itemId = updateResult.quote.items[0].id;

    const confirmation = await confirmQuote(user.id, quote.id, {
      transaction,
    });

    expect(confirmation.outcome).toBe('CONFIRMED');
    expect(confirmation.quote.items).toHaveLength(1);
    expect(confirmation.quote.items[0].id).toBe(itemId);

    const rejection = await respondToPublicQuote(
      confirmation.quote.publicToken,
      {
        decision: 'REJECTED',
        reason: 'Revisar o serviço.',
      },
      { transaction },
    );

    expect(rejection.outcome).toBe('RESPONDED');
    expect(rejection.quote.items).toHaveLength(1);
    expect(rejection.quote.items[0].id).toBe(itemId);

    const correction = await createQuoteCorrection(user.id, quote.id, { transaction });

    expect(correction.outcome).toBe('CORRECTION_CREATED');
    expect(correction.quote.pricingMode).toBe('ITEMIZED');
    expect(correction.quote.totalAmount).toBe('49.98');
    expect(correction.quote.items).toHaveLength(1);
    expect(correction.quote.items[0].id).not.toBe(itemId);
    expect(correction.quote.items[0].description).toBe('Cabo elétrico');
    expect(correction.quote.items[0].quantity).toBe('2.500');
    expect(correction.quote.items[0].unitPrice).toBe('19.99');
  });

  test.each(['ITEMIZED', 'FIXED_TOTAL'])('precisão: deve rejeitar criação com duas casas no modo %s', async (pricingMode) => {
    const user = await createUser('Prestador da Precisão');
    const client = await createClient(user.id);
    const input = buildQuoteInput(client.id);
    input.pricingMode = pricingMode;
    input.items[0].quantity = '1.25';

    if (pricingMode === 'ITEMIZED') {
      delete input.totalAmount;
      input.items[0].unitPrice = '8.00';
    }

    await expect(createQuote(user.id, input, { transaction })).rejects.toThrow(RangeError);
    expect(await Quote.count({ where: { userId: user.id }, transaction })).toBe(0);
  });

  test.each(['ITEMIZED', 'FIXED_TOTAL'])('precisão: deve rejeitar edição com duas casas e preservar o original no modo %s', async (pricingMode) => {
    const user = await createUser('Prestador da Edição Precisa');
    const client = await createClient(user.id);
    const input = buildQuoteInput(client.id);
    input.pricingMode = pricingMode;

    if (pricingMode === 'ITEMIZED') {
      delete input.totalAmount;
      input.items[0].unitPrice = '8.00';
    }

    const quote = await createQuote(user.id, input, { transaction });
    const originalItemId = quote.items[0].id;
    const updateInput = structuredClone(input);
    delete updateInput.clientId;
    updateInput.items[0].quantity = '1.25';

    await expect(updateQuote(user.id, quote.id, updateInput, { transaction })).rejects.toThrow(RangeError);
    const storedItem = await QuoteItem.findByPk(originalItemId, { transaction });
    expect(storedItem.quantity).toBe('1.000');
    expect(await QuoteItem.count({ where: { quoteId: quote.id }, transaction })).toBe(1);
  });

  test('precisão: não deve arredondar um rascunho histórico para confirmá-lo', async () => {
    const user = await createUser('Prestador do Histórico');
    const client = await createClient(user.id);
    const quote = await createQuote(user.id, buildQuoteInput(client.id), { transaction });

    // Representa um registro salvo antes da nova regra, dentro da transação de teste.
    await QuoteItem.update({ quantity: '1.250' }, { where: { quoteId: quote.id }, transaction });
    const result = await confirmQuote(user.id, quote.id, { transaction });

    expect(result.outcome).toBe('INVALID_ITEMS');
    expect(result.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'items[0].quantity' })]));
    await quote.reload({ transaction });
    expect(quote.status).toBe('DRAFT');
    expect(quote.publicToken).toBeNull();
    expect((await QuoteItem.findOne({ where: { quoteId: quote.id }, transaction })).quantity).toBe('1.250');
  });

  test('precisão: não deve arredondar um original histórico ao criar uma correção', async () => {
    const user = await createUser('Prestador da Correção Histórica');
    const client = await createClient(user.id);
    const quote = await createQuote(user.id, buildQuoteInput(client.id), { transaction });
    const confirmed = await confirmQuote(user.id, quote.id, { transaction });
    await respondToPublicQuote(confirmed.quote.publicToken, { decision: 'REJECTED', reason: 'Rever serviço.' }, { transaction });

    await QuoteItem.update({ quantity: '1.250' }, { where: { quoteId: quote.id }, transaction });
    const result = await createQuoteCorrection(user.id, quote.id, { transaction });

    expect(result.outcome).toBe('INVALID_ITEMS');
    expect(result.details).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'items[0].quantity' })]));
    expect(await Quote.count({ where: { correctedFromId: quote.id }, transaction })).toBe(0);
    expect((await QuoteItem.findOne({ where: { quoteId: quote.id }, transaction })).quantity).toBe('1.250');
  });

  test('registra alterações, resposta e correção em ordem, apenas para o dono', async () => {
    const owner = await createUser('Prestador do Histórico de Eventos');
    const otherUser = await createUser('Outro Prestador');
    const client = await createClient(owner.id);
    const quote = await createQuote(owner.id, buildQuoteInput(client.id), { transaction });

    const updateInput = buildQuoteInput(client.id);
    delete updateInput.clientId;
    updateInput.description = 'Descrição revisada.';
    updateInput.serviceDate = '2026-10-20';
    updateInput.items.push({ description: 'Peça adicional', quantity: '2' });
    await updateQuote(owner.id, quote.id, updateInput, { transaction });

    const confirmed = await confirmQuote(owner.id, quote.id, { transaction });
    await respondToPublicQuote(confirmed.quote.publicToken, {
      decision: 'REJECTED', reason: 'Preciso rever o prazo.',
    }, { transaction });
    const duplicateResponse = await respondToPublicQuote(confirmed.quote.publicToken, {
      decision: 'ACCEPTED',
    }, { transaction });
    const correction = await createQuoteCorrection(owner.id, quote.id, { transaction });

    expect(duplicateResponse.outcome).toBe('NOT_RESPONDABLE');
    expect(await getQuoteHistory(otherUser.id, quote.id, { transaction })).toBeNull();

    const originalEvents = await getQuoteHistory(owner.id, quote.id, { transaction });
    expect(originalEvents.map((event) => event.eventType)).toEqual([
      'CREATED', 'UPDATED', 'CONFIRMED', 'REJECTED', 'CORRECTION_CREATED',
    ]);
    expect(originalEvents[0].details.after.items).toHaveLength(1);
    expect(originalEvents[1].details.changes).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'description', before: 'Execução do serviço solicitado.', after: 'Descrição revisada.' }),
      expect.objectContaining({ field: 'serviceDate', after: '2026-10-20' }),
      expect.objectContaining({ field: 'items' }),
    ]));
    expect(originalEvents[3].details.rejectionReason).toBe('Preciso rever o prazo.');
    expect(originalEvents[4].details.correctionQuoteId).toBe(correction.quote.id);

    const correctionEvents = await getQuoteHistory(owner.id, correction.quote.id, { transaction });
    expect(correctionEvents).toHaveLength(1);
    expect(correctionEvents[0].eventType).toBe('CREATED_FROM_CORRECTION');
    expect(correctionEvents[0].details.originalQuoteId).toBe(quote.id);
  });
});
