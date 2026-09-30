import {
  createClient as createClientService,
  listClients as listClientsService,
  updateClient as updateClientService,
  deleteClient as deleteClientService,
  deactivateClient as deactivateClientService,
  reactivateClient as reactivateClientService,
  listClientsPage as listClientsPageService,
} from '../services/client.js';

function serializeClient(client) {
  const address = {
    street: client.street,
    number: client.number,
    postalCode: client.postalCode,
    district: client.district,
    city: client.city,
    state: client.state,
  };

  if (client.complement) {
    address.complement = client.complement;
  }

  return {
    id: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone,
    address,
    active: client.active,
  };
}

async function createClient(request, response, next) {
  try {
    const client = await createClientService(request.authenticatedUser.id, request.body);

    return response.status(201).json(serializeClient(client));
  } catch (error) {
    return next(error);
  }
}
async function listClients(request, response, next) {
  try {
    const clients = await listClientsService(request.authenticatedUser.id);

    return response.status(200).json({
      items: clients.map(serializeClient),
    });
  } catch (error) {
    return next(error);
  }
}
async function updateClient(request, response, next) {
  try {
    const result = await updateClientService(request.authenticatedUser.id, request.params.clientId, request.body);

    if (result.outcome === 'NOT_FOUND') {
      return response.status(404).json({
        code: 'CLIENT_NOT_FOUND',
        message: 'Cliente não encontrado.',
      });
    }

    return response.status(200).json(serializeClient(result.client));
  } catch (error) {
    return next(error);
  }
}
async function deleteClient(request, response, next) {
  try {
    const result = await deleteClientService(request.authenticatedUser.id, request.params.clientId);

    if (result.outcome === 'NOT_FOUND') {
      return response.status(404).json({
        code: 'CLIENT_NOT_FOUND',
        message: 'Cliente não encontrado.',
      });
    }

    if (result.outcome === 'HAS_QUOTES') {
      return response.status(409).json({
        code: 'CLIENT_HAS_QUOTES',
        message: 'Este cliente possui orçamentos vinculados. Inative o cadastro para preservar o histórico.',
      });
    }

    return response.status(204).send();
  } catch (error) {
    return next(error);
  }
}

async function deactivateClient(request, response, next) {
  try {
    const result = await deactivateClientService(request.authenticatedUser.id, request.params.clientId);

    if (result.outcome === 'NOT_FOUND') {
      return response.status(404).json({
        code: 'CLIENT_NOT_FOUND',
        message: 'Cliente não encontrado.',
      });
    }

    return response.status(200).json({
      ...serializeClient(result.client),
      active: result.client.active,
    });
  } catch (error) {
    return next(error);
  }
}
async function reactivateClient(request, response, next) {
  try {
    const result = await reactivateClientService(request.authenticatedUser.id, request.params.clientId);

    if (result.outcome === 'NOT_FOUND') {
      return response.status(404).json({
        code: 'CLIENT_NOT_FOUND',
        message: 'Cliente não encontrado.',
      });
    }

    return response.status(200).json({
      ...serializeClient(result.client),
      active: result.client.active,
    });
  } catch (error) {
    return next(error);
  }
}
async function listClientsPage(request, response, next) {
  try {
    const result = await listClientsPageService(request.authenticatedUser.id, request.clientListOptions);

    return response.status(200).json({
      ...result,
      items: result.items.map(serializeClient),
    });
  } catch (error) {
    return next(error);
  }
}
export { createClient, listClients, updateClient, deleteClient, deactivateClient, reactivateClient, listClientsPage };
