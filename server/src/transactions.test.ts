import { describe, expect, it } from 'vitest';

import { setupTestServer } from './test/server.js';
import {
  expense,
  rub,
  today,
  transactionApi,
  transfer,
  usd,
} from './test/transactions.js';

const gql = setupTestServer();
const { create, update, created } = transactionApi(gql);

describe('transfer', () => {
  it('records a currency purchase with the amount sent and the amount received', async () => {
    const { data, errors } = await create(transfer());

    expect(errors).toBeUndefined();
    expect(data?.createTransaction).toMatchObject({
      type: 'TRANSFER',
      amount: { amount: 900000, currency: 'RUB' },
      targetAmount: { amount: 10000, currency: 'USD' },
    });
  });

  it('records a transfer in one currency with equal amounts', async () => {
    const { data, errors } = await create(
      transfer({
        amount: rub(150000),
        targetAmount: rub(150000),
        targetAccountId: 'account-rub-savings',
      }),
    );

    expect(errors).toBeUndefined();
    expect(data?.createTransaction.targetAmount).toEqual(rub(150000));
  });
});

describe('edit', () => {
  it('changes every field but the type, and accepts the same type', async () => {
    const id = await created(expense());

    const { data, errors } = await update(id, {
      type: 'EXPENSE',
      amount: rub(70000),
      accountId: 'account-card',
      categoryId: 'category-cafe',
      date: '2026-10-31',
      description: 'Кофе',
    });

    expect(errors).toBeUndefined();
    expect(data?.updateTransaction).toMatchObject({
      id,
      type: 'EXPENSE',
      amount: rub(70000),
      accountId: 'account-card',
      categoryId: 'category-cafe',
      date: '2026-10-31',
      description: 'Кофе',
    });
  });

  it('changes both amounts of a transfer together', async () => {
    const id = await created(transfer());

    const { data, errors } = await update(id, {
      amount: rub(1000000),
      targetAmount: usd(11000),
      targetAccountId: 'account-usd-cash',
    });

    expect(errors).toBeUndefined();
    expect(data?.updateTransaction).toMatchObject({
      amount: rub(1000000),
      targetAmount: usd(11000),
      targetAccountId: 'account-usd-cash',
    });
  });
});

describe('transaction date', () => {
  it('comes back as the calendar day it was entered', async () => {
    const { data, errors } = await create(expense({ date: '2026-11-01' }));

    expect(errors).toBeUndefined();
    expect(data?.createTransaction.date).toBe('2026-11-01');
  });

  it('accepts today', async () => {
    const { data, errors } = await create(expense({ date: today() }));

    expect(errors).toBeUndefined();
    expect(data?.createTransaction.date).toBe(today());
  });

  it.each(['2026-02-30', '01.11.2026', '2026-11-01T10:00:00Z', '2026-1-1'])(
    'rejects %s as a client error',
    async (date) => {
      const { data, errors } = await create(expense({ date }));

      expect(data ?? null).toBeNull();
      expect(errors?.[0].extensions?.code).toBe('BAD_USER_INPUT');
    },
  );
});

describe('transaction list', () => {
  it('is sorted by date, newest first, and by entry within a day', async () => {
    // Пауза между созданиями, чтобы createdAt гарантированно различались.
    const entered = async (date: string, description: string) => {
      await created(expense({ date, description }));
      await new Promise((resolve) => setTimeout(resolve, 5));
    };

    await entered('2026-10-30', 'oldest');
    await entered('2026-11-01', 'first of the day');
    await entered('2026-11-01', 'last of the day');
    await entered('2026-10-31', 'middle');

    const { data } = await gql('{ transactions { description } }');

    expect(
      data?.transactions.map(
        ({ description }: { description: string }) => description,
      ),
    ).toEqual(['last of the day', 'first of the day', 'middle', 'oldest']);
  });
});
