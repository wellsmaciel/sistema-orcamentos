import { listActivitiesPage as listActivitiesPageService } from '../services/activity-log.js';
import { validateActivityListInput } from '../validators/activity-list.js';

async function listActivities(request, response, next) {
  const details = validateActivityListInput(request.query);

  if (details.length > 0) {
    return response.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Os dados informados são inválidos.',
      details,
    });
  }

  try {
    const page = await listActivitiesPageService(request.authenticatedUser.id, {
      page: Number(request.query.page ?? 1),
    });

    return response.status(200).json(page);
  } catch (error) {
    return next(error);
  }
}

export { listActivities };
