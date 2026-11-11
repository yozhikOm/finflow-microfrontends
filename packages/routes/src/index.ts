export const currencies = ['RUB', 'USD', 'EUR'] as const;
export type Currency = (typeof currencies)[number];

export interface TransactionsParams {
  category?: string;
  month?: string;
  currency?: Currency;
  account?: string;
}

const BASE = 'http://finflow.invalid';
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

const isId = (value: string) => value !== '';
const isMonth = (value: string) => MONTH.test(value);
const isCurrency = (value: string): value is Currency =>
  (currencies as readonly string[]).includes(value);

/** Path segments without the leading and the optional trailing slash. */
function segments(pathname: string): string[] {
  return pathname.replace(/^\/|\/$/g, '').split('/');
}

function parseTransactions(url: string): TransactionsParams | null {
  const { pathname, searchParams: query } = new URL(url, BASE);
  const path = segments(pathname);
  if (path.length !== 1 || path[0] !== 'transactions') return null;
  const params: TransactionsParams = {};
  const category = query.get('category');
  if (category !== null && isId(category)) params.category = category;
  const month = query.get('month');
  if (month !== null && isMonth(month)) params.month = month;
  const currency = query.get('currency');
  if (currency !== null && isCurrency(currency)) params.currency = currency;
  const account = query.get('account');
  if (account !== null && isId(account)) params.account = account;
  return params;
}

/** Joins a path with the query built from the defined values, in the given order. */
function withQuery(
  path: string,
  query: Record<string, string | undefined> = {},
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') search.append(key, value);
  }
  const text = search.toString();
  return text ? `${path}?${text}` : path;
}

function buildTransactions(params: TransactionsParams = {}): string {
  const { category, month, currency, account } = params;
  return withQuery('/transactions', { category, month, currency, account });
}

export interface NewTransactionParams {
  account?: string;
}

function buildNewTransaction(params: NewTransactionParams = {}): string {
  return withQuery('/transactions/new', { account: params.account });
}

function parseNewTransaction(url: string): NewTransactionParams | null {
  const { pathname, searchParams: query } = new URL(url, BASE);
  const path = segments(pathname);
  if (path.length !== 2 || path[0] !== 'transactions' || path[1] !== 'new') {
    return null;
  }
  const params: NewTransactionParams = {};
  const account = query.get('account');
  if (account !== null && isId(account)) params.account = account;
  return params;
}

export interface AccountParams {
  id: string;
}

function buildAccount({ id }: AccountParams): string {
  return `/accounts/${encodeURIComponent(id)}`;
}

function parseAccount(url: string): AccountParams | null {
  const path = segments(new URL(url, BASE).pathname);
  if (path.length !== 2 || path[0] !== 'accounts') return null;
  let id: string;
  try {
    id = decodeURIComponent(path[1]);
  } catch {
    return null;
  }
  return isId(id) ? { id } : null;
}

/** Parameters of an address that has none. */
export type NoParams = Record<string, never>;

function buildAnalytics(): string {
  return '/analytics';
}

function parseAnalytics(url: string): NoParams | null {
  const path = segments(new URL(url, BASE).pathname);
  return path.length === 1 && path[0] === 'analytics' ? {} : null;
}

export const prefixes = {
  transactions: 'transactions',
  accounts: 'accounts',
  analytics: 'analytics',
} as const;

export const routes = {
  transactions: { build: buildTransactions, parse: parseTransactions },
  newTransaction: { build: buildNewTransaction, parse: parseNewTransaction },
  account: { build: buildAccount, parse: parseAccount },
  analytics: { build: buildAnalytics, parse: parseAnalytics },
};
