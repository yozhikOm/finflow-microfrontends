import { useId } from 'react';
import { useLocation } from 'react-router';
import { routes } from '@yozhikom/finflow-routes';

import * as styles from './standalone.module.css';

/** Локальный `shell`: адрес по умолчанию из ADR-0009. */
const LOCAL_SHELL_URL = 'http://localhost:3000';

type PublicAddress = {
  parse(url: string): Record<string, string | undefined> | null;
};

const publicAddresses = Object.entries(routes) as [string, PublicAddress][];

/** Первый публичный адрес из `routes`, который разбирает `url`. */
function parsePublicAddress(url: string) {
  for (const [name, address] of publicAddresses) {
    const params = address.parse(url);
    if (params) return { name, params };
  }
  return null;
}

/**
 * Место чужого раздела при отдельном запуске (решение #19): видно, какой адрес
 * построила ссылка и как его разбирает пакет `routes`.
 */
export function ForeignSection({ prefix }: { prefix: string }) {
  const { pathname, search, hash } = useLocation();
  const url = `${pathname}${search}${hash}`;
  const parsed = parsePublicAddress(url);
  const headingId = useId();
  const paramId = useId();

  return (
    <section className={styles.foreign} aria-labelledby={headingId}>
      <h1 id={headingId} className={styles.title}>
        Здесь был бы раздел {prefix}
      </h1>
      <p>
        Адрес: <code>{url}</code>
      </p>
      {parsed ? (
        <>
          <p>
            Публичный адрес <code>routes.{parsed.name}</code>, параметры:
          </p>
          <dl className={styles.params}>
            {Object.entries(parsed.params).map(([key, value], index) => (
              <div key={key}>
                <dt id={`${paramId}-${index}`}>{key}</dt>
                <dd aria-labelledby={`${paramId}-${index}`}>{value}</dd>
              </div>
            ))}
          </dl>
        </>
      ) : (
        <p>Публичного адреса с таким путём в routes нет.</p>
      )}
      <a href={`${LOCAL_SHELL_URL}${url}`}>Открыть в локальном shell</a>
    </section>
  );
}
