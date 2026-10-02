import Company from '../models/company.js';
import CompanyLogo from '../models/company-logo.js';
import Quote from '../models/quote.js';
import { MAX_LOGO_BYTES, detectImageType } from '../utils/image-type.js';
import { recordActivity, withTransaction } from './activity-log.js';

const PUBLIC_TOKEN_PATTERN = /^[0-9a-f]{64}$/;
const PUBLIC_STATUSES = ['SENT', 'ACCEPTED', 'REJECTED'];

function findCompanyByOwner(userId, transaction) {
  return Company.findOne({ attributes: ['id'], where: { ownerUserId: userId, active: true }, transaction });
}

async function getCompanyLogo(userId, { transaction } = {}) {
  const company = await findCompanyByOwner(userId, transaction);

  return company ? CompanyLogo.findByPk(company.id, { transaction }) : null;
}

async function hasCompanyLogo(userId, { transaction } = {}) {
  const company = await findCompanyByOwner(userId, transaction);

  return company ? (await CompanyLogo.count({ where: { companyId: company.id }, transaction })) > 0 : false;
}

// O tipo declarado pelo navegador precisa bater com o tipo real, lido nos primeiros bytes do arquivo.
async function saveCompanyLogo(userId, { content, declaredType }, { transaction } = {}) {
  if (!transaction) {
    return withTransaction(null, (newTransaction) => saveCompanyLogo(userId, { content, declaredType }, { transaction: newTransaction }));
  }

  const detectedType = detectImageType(content);

  if (!detectedType || (declaredType && declaredType !== detectedType)) {
    return { outcome: 'INVALID_IMAGE' };
  }

  if (content.length > MAX_LOGO_BYTES) {
    return { outcome: 'TOO_LARGE' };
  }

  const company = await findCompanyByOwner(userId, transaction);

  if (!company) {
    return { outcome: 'COMPANY_NOT_FOUND' };
  }

  await CompanyLogo.upsert({ companyId: company.id, content, mimeType: detectedType, sizeBytes: content.length }, { transaction });
  await recordActivity({ userId, action: 'COMPANY_LOGO_UPDATED', entityType: 'COMPANY', entityId: company.id }, { transaction });

  return { outcome: 'SAVED' };
}

async function removeCompanyLogo(userId, { transaction } = {}) {
  if (!transaction) {
    return withTransaction(null, (newTransaction) => removeCompanyLogo(userId, { transaction: newTransaction }));
  }

  const company = await findCompanyByOwner(userId, transaction);
  const removed = company ? await CompanyLogo.destroy({ where: { companyId: company.id }, transaction }) : 0;

  if (removed === 0) {
    return { outcome: 'NOT_FOUND' };
  }

  await recordActivity({ userId, action: 'COMPANY_LOGO_REMOVED', entityType: 'COMPANY', entityId: company.id }, { transaction });

  return { outcome: 'REMOVED' };
}

// Logo atual da empresa do orçamento, para o link público. Só devolve a imagem, nenhum outro dado.
async function getPublicQuoteLogo(publicToken, { transaction } = {}) {
  if (typeof publicToken !== 'string' || !PUBLIC_TOKEN_PATTERN.test(publicToken)) {
    return null;
  }

  const quote = await Quote.findOne({ attributes: ['userId'], where: { publicToken, status: PUBLIC_STATUSES }, transaction });

  return quote ? getCompanyLogo(quote.userId, { transaction }) : null;
}

export { getCompanyLogo, getPublicQuoteLogo, hasCompanyLogo, removeCompanyLogo, saveCompanyLogo };
