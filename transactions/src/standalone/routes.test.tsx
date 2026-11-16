import { cleanup, render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';

import { standaloneRoutes } from './routes';

function renderAt(path: string) {
  const router = createMemoryRouter(standaloneRoutes, {
    initialEntries: [path],
  });
  render(<RouterProvider router={router} />);
  return router;
}

afterEach(cleanup);

describe('маршруты отдельного запуска', () => {
  it('показывает полоску отдельного запуска и ./App на своём префиксе', () => {
    renderAt('/transactions');

    expect(screen.getByText('отдельный запуск: transactions')).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Транзакции' })).toBeDefined();
  });

  it('с корня ведёт на свой префикс', async () => {
    const router = renderAt('/');

    expect(
      await screen.findByRole('heading', { name: 'Транзакции' }),
    ).toBeDefined();
    expect(router.state.location.pathname).toBe('/transactions');
  });

  it('на чужом префиксе показывает адрес, его параметры и ссылку в локальный shell', () => {
    renderAt('/accounts/a%201?from=menu');

    expect(
      screen.getByRole('heading', { name: 'Здесь был бы раздел accounts' }),
    ).toBeDefined();
    expect(screen.getByText('/accounts/a%201?from=menu')).toBeDefined();

    const params = screen.getByRole('definition', { name: 'id' });
    expect(params.textContent).toBe('a 1');

    const link = screen.getByRole('link', {
      name: 'Открыть в локальном shell',
    });
    expect(link.getAttribute('href')).toBe(
      'http://localhost:3000/accounts/a%201?from=menu',
    );
  });

  it('на чужом адресе, которого нет в routes, говорит об этом', () => {
    renderAt('/analytics/2026-03');

    const stub = screen.getByRole('region', {
      name: 'Здесь был бы раздел analytics',
    });
    expect(
      within(stub).getByText('Публичного адреса с таким путём в routes нет.'),
    ).toBeDefined();
  });
});
