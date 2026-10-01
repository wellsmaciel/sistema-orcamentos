import { PERIODS, getManagementSummary as getManagementSummaryService } from '../services/management.js';

async function getManagementSummary(request, response, next) {
  const details = [];

  for (const property of Object.keys(request.query)) {
    if (property !== 'period') {
      details.push({ field: property, message: 'Este parâmetro não é permitido.' });
    }
  }

  const period = request.query.period ?? 'month';

  if (!PERIODS.includes(period)) {
    details.push({ field: 'period', message: 'Informe month, quarter, year ou all.' });
  }

  if (details.length > 0) {
    return response.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Os dados informados são inválidos.',
      details,
    });
  }

  try {
    const summary = await getManagementSummaryService(request.authenticatedUser.id, { period });

    return response.status(200).json(summary);
  } catch (error) {
    return next(error);
  }
}

export { getManagementSummary };
