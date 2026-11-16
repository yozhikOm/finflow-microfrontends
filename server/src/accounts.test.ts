import { describe, expect, it } from 'vitest';

import { accountApi, rubCard } from './test/accounts.js';
import { setupTestServer } from './test/server.js';
import {
  expense,
  income,
  rub,
  transactionApi,
  transfer,
  usd,
} from './test/transactions.js';

const gql = setupTestServer();
const { createAccount, createdAccount, account, accounts } = accountApi(gql);
const { created } = transactionApi(gql);

describe('account', () => {
  it('is created with its name, type, currency and initial balance', async () => {
    const { data, errors } = await createAccount({
      name: 'Наличные',
      type: 'CASH',
      currency: 'USD',
      initialBalance: 25000,
    });

    expect(errors).toBeUndefined();

    const id = data?.createAccount.id;
    const expected = {
      id,
      name: 'Наличные',
      type: 'CASH',
      currency: 'USD',
      initialBalance: { amount: 25000, currency: 'USD' },
      archived: false,
    };

    expect(data?.createAccount).toMatchObject(expected);
    expect(await account(id)).toMatchObject(expected);
    expect(await accounts()).toMatchObject([expected]);
  });

  it('records its creation and last change as ISO moments', async () => {
    const { data } = await createAccount(rubCard());
    const { createdAt, updatedAt } = data?.createAccount ?? {};

    expect(new Date(createdAt).toISOString()).toBe(createdAt);
    expect(updatedAt).toBe(createdAt);
  });

  it('keeps its name without surrounding spaces', async () => {
    const { data } = await createAccount(rubCard({ name: '  Карта ' }));

    expect(data?.createAccount.name).toBe('Карта');
  });

  it.each(['', '   '])(
    'rejects the blank name %j as a client error',
    async (name) => {
      const { data, errors } = await createAccount(rubCard({ name }));

      expect(data ?? null).toBeNull();
      expect(errors?.[0].extensions?.code).toBe('BAD_USER_INPUT');
    },
  );

  it('is absent when no account has the id', async () => {
    expect(await account('6560000000000000000000ff')).toBeNull();
  });
});

describe('balance', () => {
  it('is the initial balance while the account has no transactions', async () => {
    const id = await createdAccount(rubCard({ initialBalance: 120000 }));

    expect((await account(id)).balance).toEqual(rub(120000));
  });

  it('adds income and subtracts expense', async () => {
    const id = await createdAccount(rubCard({ initialBalance: 100000 }));

    await created(income({ accountId: id, amount: rub(50000) }));
    await created(expense({ accountId: id, amount: rub(30000) }));
    await created(expense({ accountId: id, amount: rub(5000) }));

    // 1000 ₽ + 500 ₽ − 300 ₽ − 50 ₽ = 1150 ₽.
    expect((await account(id)).balance).toEqual(rub(115000));
  });

  it('moves a transfer in one currency from one account to the other', async () => {
    const card = await createdAccount(rubCard({ initialBalance: 100000 }));
    const savings = await createdAccount(
      rubCard({ name: 'Накопительный', type: 'SAVINGS', initialBalance: 0 }),
    );

    await created(
      transfer({
        accountId: card,
        targetAccountId: savings,
        amount: rub(40000),
        targetAmount: rub(40000),
      }),
    );

    expect((await account(card)).balance).toEqual(rub(60000));
    expect((await account(savings)).balance).toEqual(rub(40000));
  });

  it('takes the amount sent and adds the amount received between currencies', async () => {
    const card = await createdAccount(rubCard({ initialBalance: 1000000 }));
    const dollars = await createdAccount(
      rubCard({ name: 'Доллары', currency: 'USD', initialBalance: 5000 }),
    );

    // Покупка 100 $ за 9000 ₽ и обратно 20 $ за 1700 ₽.
    await created(
      transfer({
        accountId: card,
        targetAccountId: dollars,
        amount: rub(900000),
        targetAmount: usd(10000),
      }),
    );
    await created(
      transfer({
        accountId: dollars,
        targetAccountId: card,
        amount: usd(2000),
        targetAmount: rub(170000),
      }),
    );

    // 10 000 ₽ − 9000 ₽ + 1700 ₽ и 50 $ + 100 $ − 20 $.
    expect((await account(card)).balance).toEqual(rub(270000));
    expect((await account(dollars)).balance).toEqual(usd(13000));
  });

  it('goes below zero from a negative initial balance', async () => {
    const credit = await createdAccount(
      rubCard({
        name: 'Кредитка',
        type: 'CREDIT_CARD',
        initialBalance: -150000,
      }),
    );

    await created(expense({ accountId: credit, amount: rub(20000) }));

    const { initialBalance, balance } = await account(credit);

    expect(initialBalance).toEqual(rub(-150000));
    expect(balance).toEqual(rub(-170000));
  });

  it('counts only the transactions of each account in the list', async () => {
    const card = await createdAccount(rubCard({ initialBalance: 100000 }));
    const cash = await createdAccount(
      rubCard({ name: 'Наличные', type: 'CASH', initialBalance: 30000 }),
    );

    await created(expense({ accountId: card, amount: rub(10000) }));
    await created(income({ accountId: cash, amount: rub(2000) }));

    expect(await accounts()).toMatchObject([
      { id: card, balance: rub(90000) },
      { id: cash, balance: rub(32000) },
    ]);
  });
});
