import { createClient as createClientService, listClients as listClientsService } from '../services/client.js';

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

export { createClient, listClients };
