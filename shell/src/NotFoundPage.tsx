import { Link } from 'react-router';
import { routes } from '@yozhikom/finflow-routes';

import * as styles from './NotFoundPage.module.css';

/** 404 `shell`: неизвестный префикс (ADR-0008). */
export const NotFoundPage = () => (
  <section className={styles.page}>
    <h1 className={styles.title}>Страница не найдена</h1>
    <p>Такого раздела в FinFlow нет. Возможно, ссылка неверная.</p>
    <Link to={routes.transactions.build()}>К транзакциям</Link>
  </section>
);
