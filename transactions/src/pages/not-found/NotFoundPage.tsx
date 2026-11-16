import { Link } from 'react-router';
import { routes } from '@yozhikom/finflow-routes';

import * as styles from './NotFoundPage.module.css';

/** 404 внутри префикса `transactions` (ADR-0008). */
export const NotFoundPage = () => (
  <section className={styles.page}>
    <h1 className={styles.title}>Страница не найдена</h1>
    <p>В разделе транзакций нет такой страницы.</p>
    <Link to={routes.transactions.build()}>К списку транзакций</Link>
  </section>
);
