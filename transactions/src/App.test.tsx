import { cleanup, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';

import App from './App';

/** `./App` на своём префиксе, как его монтирует `shell` (ADR-0008). */
function renderAt(path: string) {
  const router = createMemoryRouter(
    [{ path: '/transactions/*', element: <App /> }],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
}

afterEach(cleanup);

describe('./App', () => {
  it('на префиксе показывает список транзакций', () => {
    renderAt('/transactions');

    expect(screen.getByRole('heading', { name: 'Транзакции' })).toBeDefined();
  });

  it('на неизвестном пути внутри префикса показывает свою 404', () => {
    renderAt('/transactions/no-such-page');

    expect(
      screen.getByRole('heading', { name: 'Страница не найдена' }),
    ).toBeDefined();
    expect(screen.queryByRole('heading', { name: 'Транзакции' })).toBeNull();
  });
});
