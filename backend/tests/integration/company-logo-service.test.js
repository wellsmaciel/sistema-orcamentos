import { randomUUID } from 'node:crypto';

import sequelize from '../../src/config/database.js';
import ActivityLog from '../../src/models/activity-log.js';
import Client from '../../src/models/client.js';
import Company from '../../src/models/company.js';
import CompanyLogo from '../../src/models/company-logo.js';
import User from '../../src/models/user.js';
import {
  getCompanyLogo,
  getPublicQuoteLogo,
  hasCompanyLogo,
  removeCompanyLogo,
  saveCompanyLogo,
} from '../../src/services/company-logo.js';
import { confirmQuote, createQuote } from '../../src/services/quote.js';

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32, 1)]);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32, 2)]);

describe('Serviço de logo da empresa', () => {
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

  async function createProvider({ withCompany = true } = {}) {
    const user = await User.create(
      {
        auth0Subject: `auth0|logo-${randomUUID()}`,
        name: 'Prestador de Teste',
        email: `${randomUUID()}@example.com`,
        emailVerified: true,
      },
      { transaction },
    );

    if (withCompany) {
      await Company.create(
        { ownerUserId: user.id, name: 'Oficina de Teste', email: 'oficina@example.com', phone: '1133334444' },
        { transaction },
      );
    }

    return user;
  }

  async function createSentQuote(userId) {
    const client = await Client.create(
      {
        userId, name: 'Maria Cliente', email: 'maria@example.com', phone: '11999999999',
        street: 'Rua do Cliente', number: '100', postalCode: '01001-000', district: 'Centro', city: 'São Paulo', state: 'SP',
      },
      { transaction },
    );
    const quote = await createQuote(
      userId,
      {
        clientId: client.id,
        description: 'Troca de escapamento',
        pricingMode: 'FIXED_TOTAL',
        items: [{ description: 'Escapamento', quantity: '1' }],
        totalAmount: '750',
        serviceDate: '2099-10-15',
        serviceAddress: { street: 'Rua do Serviço', number: '10', postalCode: '01001-000', district: 'Centro', city: 'São Paulo', state: 'SP' },
      },
      { transaction },
    );

    return { draft: quote, sent: (await confirmQuote(userId, quote.id, { transaction })).quote };
  }

  function listLogoActivities(userId) {
    return ActivityLog.findAll({ where: { userId }, transaction });
  }

  test('salva, substitui e remove o logo, registrando as atividades', async () => {
    const user = await createProvider();

    expect(await hasCompanyLogo(user.id, { transaction })).toBe(false);
    expect(await saveCompanyLogo(user.id, { content: PNG, declaredType: 'image/png' }, { transaction })).toEqual({ outcome: 'SAVED' });
    expect(await hasCompanyLogo(user.id, { transaction })).toBe(true);

    expect(await saveCompanyLogo(user.id, { content: JPEG, declaredType: 'image/jpeg' }, { transaction })).toEqual({ outcome: 'SAVED' });
    const logo = await getCompanyLogo(user.id, { transaction });
    expect(logo.mimeType).toBe('image/jpeg');
    expect(logo.sizeBytes).toBe(JPEG.length);
    expect(Buffer.compare(logo.content, JPEG)).toBe(0);
    expect(await CompanyLogo.count({ where: { companyId: logo.companyId }, transaction })).toBe(1);

    expect(await removeCompanyLogo(user.id, { transaction })).toEqual({ outcome: 'REMOVED' });
    expect(await getCompanyLogo(user.id, { transaction })).toBeNull();
    expect(await removeCompanyLogo(user.id, { transaction })).toEqual({ outcome: 'NOT_FOUND' });

    const activities = await listLogoActivities(user.id);
    // Ordenado pelo nome: na mesma transação os horários podem empatar.
    expect(activities.map((activity) => activity.action).sort()).toEqual(['COMPANY_LOGO_REMOVED', 'COMPANY_LOGO_UPDATED', 'COMPANY_LOGO_UPDATED']);
    expect(activities.every((activity) => activity.entityType === 'COMPANY' && activity.entityId === logo.companyId)).toBe(true);
  });

  test.each([
    ['conteúdo que não é imagem', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'), 'image/png'],
    ['tipo declarado diferente do real', PNG, 'image/jpeg'],
    ['arquivo curto demais', Buffer.from([0x89, 0x50]), 'image/png'],
  ])('rejeita %s', async (_case, content, declaredType) => {
    const user = await createProvider();

    expect(await saveCompanyLogo(user.id, { content, declaredType }, { transaction })).toEqual({ outcome: 'INVALID_IMAGE' });
    expect(await hasCompanyLogo(user.id, { transaction })).toBe(false);
  });

  test('rejeita imagem acima de 200 KB', async () => {
    const user = await createProvider();
    const content = Buffer.concat([PNG, Buffer.alloc(200 * 1024)]);

    expect(await saveCompanyLogo(user.id, { content, declaredType: 'image/png' }, { transaction })).toEqual({ outcome: 'TOO_LARGE' });
  });

  test('exige os dados profissionais antes do logo', async () => {
    const user = await createProvider({ withCompany: false });

    expect(await saveCompanyLogo(user.id, { content: PNG, declaredType: 'image/png' }, { transaction })).toEqual({ outcome: 'COMPANY_NOT_FOUND' });
    expect(await hasCompanyLogo(user.id, { transaction })).toBe(false);
  });

  test('um prestador não acessa nem remove o logo de outro', async () => {
    const owner = await createProvider();
    const other = await createProvider();
    await saveCompanyLogo(owner.id, { content: PNG, declaredType: 'image/png' }, { transaction });

    expect(await getCompanyLogo(other.id, { transaction })).toBeNull();
    expect(await removeCompanyLogo(other.id, { transaction })).toEqual({ outcome: 'NOT_FOUND' });
    expect(await hasCompanyLogo(owner.id, { transaction })).toBe(true);
  });

  test('o link público mostra o logo atual da empresa só para orçamentos enviados', async () => {
    const user = await createProvider();
    const { sent } = await createSentQuote(user.id);

    expect(await getPublicQuoteLogo(sent.publicToken, { transaction })).toBeNull();

    await saveCompanyLogo(user.id, { content: PNG, declaredType: 'image/png' }, { transaction });
    expect((await getPublicQuoteLogo(sent.publicToken, { transaction })).mimeType).toBe('image/png');

    // Orçamentos antigos passam a mostrar o logo novo.
    await saveCompanyLogo(user.id, { content: JPEG, declaredType: 'image/jpeg' }, { transaction });
    expect((await getPublicQuoteLogo(sent.publicToken, { transaction })).mimeType).toBe('image/jpeg');

    expect(await getPublicQuoteLogo('f'.repeat(64), { transaction })).toBeNull();
    expect(await getPublicQuoteLogo('token-invalido', { transaction })).toBeNull();
  });
});
