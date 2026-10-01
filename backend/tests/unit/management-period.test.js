import { jest } from '@jest/globals';

import { getManagementSummary } from '../../src/controllers/management.js';
import { getPeriodStart } from '../../src/services/management.js';

describe('getPeriodStart', () => {
  test('usa o início do mês, dos últimos 3 meses e do ano no horário de Brasília', () => {
    const now = new Date('2026-10-15T12:00:00-03:00');

    expect(getPeriodStart('month', now).toISOString()).toBe('2026-10-01T03:00:00.000Z');
    expect(getPeriodStart('quarter', now).toISOString()).toBe('2026-08-01T03:00:00.000Z');
    expect(getPeriodStart('year', now).toISOString()).toBe('2026-01-01T03:00:00.000Z');
    expect(getPeriodStart('all', now)).toBeNull();
  });

  test('os últimos 3 meses voltam ao ano anterior em janeiro e fevereiro', () => {
    expect(getPeriodStart('quarter', new Date('2026-02-10T12:00:00-03:00')).toISOString()).toBe('2025-12-01T03:00:00.000Z');
  });

  test('no início do dia 1º em Brasília já conta o novo mês', () => {
    expect(getPeriodStart('month', new Date('2026-11-01T01:00:00-03:00')).toISOString()).toBe('2026-11-01T03:00:00.000Z');
  });
});

describe('validação do período', () => {
  test('rejeita período desconhecido e parâmetros extras', async () => {
    const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await getManagementSummary({ query: { period: 'week', userId: 'outro' }, authenticatedUser: { id: 'user-1' } }, response, jest.fn());

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
      details: [
        { field: 'userId', message: 'Este parâmetro não é permitido.' },
        { field: 'period', message: 'Informe month, quarter, year ou all.' },
      ],
    }));
  });
});
