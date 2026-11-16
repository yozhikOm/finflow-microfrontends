import { Outlet, redirect, type RouteObject } from 'react-router';
import { prefixes, routes } from '@yozhikom/finflow-routes';

import App from '../App';
import { ForeignSection } from './ForeignSection';
import * as styles from './standalone.module.css';

const ownPrefix = prefixes.transactions;

function StandaloneLayout() {
  return (
    <>
      <div className={styles.strip}>отдельный запуск: {ownPrefix}</div>
      <Outlet />
    </>
  );
}

/**
 * Маршруты отдельного запуска (решение #19): `./App` на своём префиксе, как в
 * `shell` (ADR-0008), и заглушки на месте соседей. Каркас `shell` не повторяется.
 */
export const standaloneRoutes: RouteObject[] = [
  {
    path: '/',
    element: <StandaloneLayout />,
    children: [
      { index: true, loader: () => redirect(routes.transactions.build()) },
      { path: `${ownPrefix}/*`, element: <App /> },
      ...Object.values(prefixes)
        .filter((prefix) => prefix !== ownPrefix)
        .map((prefix) => ({
          path: `${prefix}/*`,
          element: <ForeignSection prefix={prefix} />,
        })),
      {
        path: '*',
        element: <p className={styles.note}>Такого раздела в FinFlow нет.</p>,
      },
    ],
  },
];
