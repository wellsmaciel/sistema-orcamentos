import {
  getCompanyLogo,
  getPublicQuoteLogo as getPublicQuoteLogoService,
  removeCompanyLogo,
  saveCompanyLogo,
} from '../services/company-logo.js';

const ERRORS = {
  INVALID_IMAGE: { status: 415, code: 'UNSUPPORTED_IMAGE', message: 'Envie uma imagem PNG, JPEG ou WebP.' },
  TOO_LARGE: { status: 413, code: 'PAYLOAD_TOO_LARGE', message: 'A imagem deve ter no máximo 200 KB.' },
  COMPANY_NOT_FOUND: { status: 409, code: 'COMPANY_NOT_FOUND', message: 'Salve os dados profissionais antes de enviar o logo.' },
  NOT_FOUND: { status: 404, code: 'LOGO_NOT_FOUND', message: 'Logo não encontrado.' },
};

function sendError(response, outcome) {
  const { status, code, message } = ERRORS[outcome];

  return response.status(status).json({ code, message });
}

function sendImage(response, logo, cacheControl) {
  return response
    .status(200)
    .set('Content-Type', logo.mimeType)
    .set('Cache-Control', cacheControl)
    .set('X-Content-Type-Options', 'nosniff')
    .send(logo.content);
}

async function getMyCompanyLogo(request, response, next) {
  try {
    const logo = await getCompanyLogo(request.authenticatedUser.id);

    return logo ? sendImage(response, logo, 'private, no-store') : sendError(response, 'NOT_FOUND');
  } catch (error) {
    return next(error);
  }
}

async function saveMyCompanyLogo(request, response, next) {
  // express.raw só lê o corpo quando o tipo declarado é PNG, JPEG ou WebP.
  if (!Buffer.isBuffer(request.body) || request.body.length === 0) {
    return sendError(response, 'INVALID_IMAGE');
  }

  try {
    const { outcome } = await saveCompanyLogo(request.authenticatedUser.id, {
      content: request.body,
      declaredType: request.get('Content-Type')?.split(';')[0].trim(),
    });

    return outcome === 'SAVED' ? response.status(204).end() : sendError(response, outcome);
  } catch (error) {
    return next(error);
  }
}

async function deleteMyCompanyLogo(request, response, next) {
  try {
    const { outcome } = await removeCompanyLogo(request.authenticatedUser.id);

    return outcome === 'REMOVED' ? response.status(204).end() : sendError(response, outcome);
  } catch (error) {
    return next(error);
  }
}

async function getPublicQuoteLogo(request, response, next) {
  try {
    const logo = await getPublicQuoteLogoService(request.params.publicToken);

    return logo ? sendImage(response, logo, 'public, max-age=300') : sendError(response, 'NOT_FOUND');
  } catch (error) {
    return next(error);
  }
}

export { deleteMyCompanyLogo, getMyCompanyLogo, getPublicQuoteLogo, saveMyCompanyLogo };
