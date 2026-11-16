import { Suspense } from 'react';
import { redirect, type RouteObject } from 'react-router';
import { routes } from '@yozhikom/finflow-routes';

import { Layout } from './Layout';
import { NotFoundPage } from './NotFoundPage';
import { sections, type Section } from './sections';

function SectionRoute({ section: { App } }: { section: Section }) {
  // Пока раздел загружается, под шапкой пустая область (ADR-0010).
  return (
    <Suspense fallback={null}>
      <App />
    </Suspense>
  );
}

/**
 * Маршруты `shell` (ADR-0008): только префиксы разделов. Пути внутри префикса,
 * включая их 404, — забота remote-приложения.
 */
export const appRoutes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, loader: () => redirect(routes.transactions.build()) },
      ...sections.map((section) => ({
        path: `${section.prefix}/*`,
        element: <SectionRoute section={section} />,
      })),
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
