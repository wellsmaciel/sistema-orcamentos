import { listUpcomingServices as listUpcomingServicesService } from '../services/agenda.js';

async function listUpcomingServices(request, response, next) {
  try {
    const agenda = await listUpcomingServicesService(request.authenticatedUser.id);

    return response.status(200).json(agenda);
  } catch (error) {
    return next(error);
  }
}

export { listUpcomingServices };
