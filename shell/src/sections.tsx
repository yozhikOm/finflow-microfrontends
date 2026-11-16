import { lazy, type ComponentType } from 'react';
import { prefixes, routes } from '@yozhikom/finflow-routes';

export interface Section {
  /** Префикс из пакета `routes`: под ним раздел распоряжается путями сам. */
  prefix: string;
  /** Название раздела в шапке: его даёт `shell` (ADR-0008). */
  title: string;
  /** Адрес ссылки в шапке, построенный через `routes`. */
  href: string;
  /** `./App` remote-приложения: компонент без props со своими `<Routes>`. */
  App: ComponentType;
}

/**
 * Разделы FinFlow в порядке шапки. Раздел попадает сюда, когда его
 * remote-приложение отдаёт `./App`.
 */
export const sections: Section[] = [
  {
    prefix: prefixes.transactions,
    title: 'Транзакции',
    href: routes.transactions.build(),
    App: lazy(() => import('transactions/App')),
  },
];
