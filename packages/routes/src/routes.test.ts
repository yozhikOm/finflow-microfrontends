import { describe, expect, it } from 'vitest';
import { prefixes, routes } from './index.js';

describe('routes.transactions', () => {
  it('parses combined filters from the query', () => {
    expect(
      routes.transactions.parse(
        '/transactions?category=c1&month=2026-03&currency=USD&account=a1',
      ),
    ).toEqual({
      category: 'c1',
      month: '2026-03',
      currency: 'USD',
      account: 'a1',
    });
  });

  it('silently drops filters of the wrong shape', () => {
    expect(
      routes.transactions.parse(
        '/transactions?category=c1&month=2026-13&currency=XYZ&account=',
      ),
    ).toEqual({ category: 'c1' });
    expect(routes.transactions.parse('/transactions?month=2026-3')).toEqual({});
    expect(routes.transactions.parse('/transactions?currency=usd')).toEqual({});
  });

  it('does not match other paths', () => {
    expect(routes.transactions.parse('/transactions/new')).toBeNull();
    expect(routes.transactions.parse('/accounts')).toBeNull();
    expect(routes.transactions.parse('/transactionsx')).toBeNull();
  });

  it('builds the list address with or without filters', () => {
    expect(routes.transactions.build()).toBe('/transactions');
    expect(routes.transactions.build({})).toBe('/transactions');
    expect(
      routes.transactions.build({ month: '2026-03', currency: 'RUB' }),
    ).toBe('/transactions?month=2026-03&currency=RUB');
  });

  it('parses what it builds, including ids that need encoding', () => {
    const params = {
      category: 'еда & кафе',
      month: '2026-12',
      currency: 'EUR',
      account: 'a/1?x',
    } as const;
    expect(
      routes.transactions.parse(routes.transactions.build(params)),
    ).toEqual(params);
  });

  it('accepts a trailing slash and an absolute URL', () => {
    expect(routes.transactions.parse('/transactions/')).toEqual({});
    expect(
      routes.transactions.parse(
        'https://finflow.example/transactions?month=2026-01',
      ),
    ).toEqual({ month: '2026-01' });
  });
});

describe('routes.newTransaction', () => {
  it('builds and parses the address with an optional account', () => {
    expect(routes.newTransaction.build()).toBe('/transactions/new');
    expect(routes.newTransaction.build({ account: 'a1' })).toBe(
      '/transactions/new?account=a1',
    );
    expect(routes.newTransaction.parse('/transactions/new?account=a1')).toEqual(
      { account: 'a1' },
    );
    expect(routes.newTransaction.parse('/transactions/new?account=')).toEqual(
      {},
    );
    expect(routes.newTransaction.parse('/transactions/new/')).toEqual({});
  });

  it('does not match other paths', () => {
    expect(routes.newTransaction.parse('/transactions')).toBeNull();
    expect(routes.newTransaction.parse('/transactions/new/x')).toBeNull();
  });
});

describe('routes.account', () => {
  it('builds and parses the account page address', () => {
    expect(routes.account.build({ id: 'a1' })).toBe('/accounts/a1');
    expect(routes.account.parse('/accounts/a1')).toEqual({ id: 'a1' });
    expect(routes.account.parse('/accounts/a1/?tab=x')).toEqual({ id: 'a1' });
  });

  it('encodes the id so that it stays one path segment', () => {
    const url = routes.account.build({ id: 'a/1 б' });
    expect(url).toBe('/accounts/a%2F1%20%D0%B1');
    expect(routes.account.parse(url)).toEqual({ id: 'a/1 б' });
  });

  it('does not match without an id or with extra segments', () => {
    expect(routes.account.parse('/accounts')).toBeNull();
    expect(routes.account.parse('/accounts/')).toBeNull();
    expect(routes.account.parse('/accounts/a1/edit')).toBeNull();
    expect(routes.account.parse('/transactions/a1')).toBeNull();
  });
});

describe('routes.analytics', () => {
  it('builds and parses the analytics address', () => {
    expect(routes.analytics.build()).toBe('/analytics');
    expect(routes.analytics.parse('/analytics')).toEqual({});
    expect(routes.analytics.parse('/analytics/?month=2026-01')).toEqual({});
    expect(routes.analytics.parse('/analytics/2026-01')).toBeNull();
  });
});

describe('prefixes', () => {
  it('declares the prefix of each remote app', () => {
    expect(prefixes).toEqual({
      transactions: 'transactions',
      accounts: 'accounts',
      analytics: 'analytics',
    });
  });
});
