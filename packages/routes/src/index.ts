/** Префиксы remote-приложений: маршруты `shell` и первый сегмент их адресов. */
export const prefixes = {
  transactions: 'transactions',
  accounts: 'accounts',
  analytics: 'analytics',
} as const;

/**
 * Валюты FinFlow. Повторяют `enum Currency` схемы `server`: пакеты ни от чего
 * не зависят (ADR-0013), поэтому список ведётся руками. Новая валюта — minor.
 */
const currencies = ['RUB', 'USD', 'EUR'] as const;
export type Currency = (typeof currencies)[number];

/** Фильтры списка транзакций, все необязательны и комбинируются. */
export interface TransactionsParams {
  category?: string;
  /** `YYYY-MM` */
  month?: string;
  currency?: Currency;
  account?: string;
}

export interface NewTransactionParams {
  account?: string;
}

export interface AccountParams {
  id: string;
}

/** Параметры адреса, у которого их нет. */
export type NoParams = Record<string, never>;

const isNonEmpty = (value: string): value is string => value !== '';
const isMonth = (value: string): value is string =>
  /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
const isCurrency = (value: string): value is Currency =>
  (currencies as readonly string[]).includes(value);

/** Проверки формы для каждого параметра query: неверная форма отбрасывается. */
type QueryShape<T> = {
  [K in keyof T]-?: (value: string) => value is string & T[K];
};

const transactionsQuery: QueryShape<TransactionsParams> = {
  category: isNonEmpty,
  month: isMonth,
  currency: isCurrency,
  account: isNonEmpty,
};

const newTransactionQuery: QueryShape<NewTransactionParams> = {
  account: isNonEmpty,
};

// База нужна только чтобы `URL` разобрал относительный адрес.
const RELATIVE_URL_BASE = 'http://finflow.invalid';

interface ParsedPath {
  /** Сегменты пути без ведущего и необязательного завершающего `/`. */
  segments: string[];
  query: URLSearchParams;
}

function locate(url: string): ParsedPath {
  const { pathname, searchParams } = new URL(url, RELATIVE_URL_BASE);
  return {
    segments: pathname.replace(/^\/|\/$/g, '').split('/'),
    query: searchParams,
  };
}

const isPath = (segments: string[], ...expected: string[]) =>
  segments.length === expected.length &&
  segments.every((segment, index) => segment === expected[index]);

function readQuery<T>(query: URLSearchParams, shape: QueryShape<T>): T {
  const params: Partial<T> = {};
  for (const key of Object.keys(shape) as (keyof T & string)[]) {
    const value = query.get(key);
    if (value !== null && shape[key](value)) params[key] = value;
  }
  return params as T;
}

/** Путь с query из заданных значений, в порядке ключей `shape`. */
function withQuery<T extends object>(
  path: string,
  shape: QueryShape<T>,
  params: T,
): string {
  const search = new URLSearchParams();
  for (const key of Object.keys(shape) as (keyof T & string)[]) {
    const value = params[key];
    if (typeof value === 'string' && value !== '') search.append(key, value);
  }
  const text = search.toString();
  return text ? `${path}?${text}` : path;
}

const transactions = {
  build: (params: TransactionsParams = {}): string =>
    withQuery(`/${prefixes.transactions}`, transactionsQuery, params),
  parse(url: string): TransactionsParams | null {
    const { segments, query } = locate(url);
    return isPath(segments, prefixes.transactions)
      ? readQuery(query, transactionsQuery)
      : null;
  },
};

const newTransaction = {
  build: (params: NewTransactionParams = {}): string =>
    withQuery(`/${prefixes.transactions}/new`, newTransactionQuery, params),
  parse(url: string): NewTransactionParams | null {
    const { segments, query } = locate(url);
    return isPath(segments, prefixes.transactions, 'new')
      ? readQuery(query, newTransactionQuery)
      : null;
  },
};

const account = {
  build: ({ id }: AccountParams): string =>
    `/${prefixes.accounts}/${encodeURIComponent(id)}`,
  parse(url: string): AccountParams | null {
    const { segments } = locate(url);
    // Второй сегмент — id: подходит любое его значение.
    const [, encodedId = ''] = segments;
    if (!isPath(segments, prefixes.accounts, encodedId)) return null;
    try {
      const id = decodeURIComponent(encodedId);
      return isNonEmpty(id) ? { id } : null;
    } catch {
      return null;
    }
  },
};

const analytics = {
  build: (): string => `/${prefixes.analytics}`,
  parse(url: string): NoParams | null {
    return isPath(locate(url).segments, prefixes.analytics) ? {} : null;
  },
};

/**
 * Публичные адреса (ADR-0008): для каждого пара «построить» и «разобрать».
 * `parse` принимает путь с query или абсолютный URL и возвращает параметры,
 * а для другого адреса — `null`.
 */
export const routes = { transactions, newTransaction, account, analytics };
