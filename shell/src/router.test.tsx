import { cleanup, render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';

import { appRoutes } from './router';

function renderAt(path: string) {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

afterEach(cleanup);

describe('маршруты shell', () => {
  it('в шапке ссылки на готовые разделы', async () => {
    renderAt('/transactions');

    const nav = await screen.findByRole('navigation', { name: 'Разделы' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual(['Транзакции']);
    expect(links[0].getAttribute('href')).toBe('/transactions');
  });

  it('с корня перенаправляет на транзакции', async () => {
    const router = renderAt('/');

    expect(
      await screen.findByText('remote-приложение на /transactions'),
    ).toBeDefined();
    expect(router.state.location.pathname).toBe('/transactions');
  });

  it('отдаёт remote-приложению любой путь внутри его префикса', async () => {
    renderAt('/transactions/no-such-page');

    expect(
      await screen.findByText(
        'remote-приложение на /transactions/no-such-page',
      ),
    ).toBeDefined();
    expect(
      screen.queryByRole('heading', { name: 'Страница не найдена' }),
    ).toBeNull();
  });

  it('на неизвестный префикс показывает 404 с шапкой', async () => {
    renderAt('/no-such-section');

    expect(
      await screen.findByRole('heading', { name: 'Страница не найдена' }),
    ).toBeDefined();
    expect(screen.getByRole('navigation', { name: 'Разделы' })).toBeDefined();
    expect(screen.queryByText(/remote-приложение/)).toBeNull();
  });
});
