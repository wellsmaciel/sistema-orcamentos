import {
  listResponseNotifications as listResponseNotificationsService,
  markResponseNotificationsRead as markResponseNotificationsReadService,
} from '../services/response-notification.js';

async function listResponseNotifications(request, response, next) {
  try {
    const notifications = await listResponseNotificationsService(request.authenticatedUser.id);

    return response.status(200).json(notifications);
  } catch (error) {
    return next(error);
  }
}

async function markResponseNotificationsRead(request, response, next) {
  try {
    await markResponseNotificationsReadService(request.authenticatedUser.id);

    return response.status(204).end();
  } catch (error) {
    return next(error);
  }
}

export { listResponseNotifications, markResponseNotificationsRead };
