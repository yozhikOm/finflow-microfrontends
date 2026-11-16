import { expect } from 'vitest';

import { calendarDayIn } from '../calendar-day.js';
import { userTimeZone } from '../config.js';

import type { Gql } from './server.js';

const FIELDS = `
  id type accountId targetAccountId categoryId date description
  amount { amount currency }
  targetAmount { amount currency }
`;

export const rub = (amount: number) => ({ amount, currency: 'RUB' });
export const usd = (amount: number) => ({ amount, currency: 'USD' });

export const transfer = (overrides: Record<string, unknown> = {}) => ({
  type: 'TRANSFER',
  amount: rub(900000),
  targetAmount: usd(10000),
  accountId: 'account-rub',
  targetAccountId: 'account-usd',
  date: '2026-11-01',
  ...overrides,
});

export const expense = (overrides: Record<string, unknown> = {}) => ({
  type: 'EXPENSE',
  amount: rub(50000),
  accountId: 'account-rub',
  categoryId: 'category-food',
  date: '2026-11-01',
  ...overrides,
});

export const income = (overrides: Record<string, unknown> = {}) => ({
  type: 'INCOME',
  amount: rub(100000),
  accountId: 'account-rub',
  categoryId: 'category-salary',
  date: '2026-11-01',
  ...overrides,
});

/** Мутации транзакций через GraphQL API тестового server. */
export const transactionApi = (gql: Gql) => {
  const create = (input: Record<string, unknown>) =>
    gql(
      `mutation ($input: CreateTransactionInput!) {
        createTransaction(input: $input) { ${FIELDS} }
      }`,
      { input },
    );

  const update = (id: string, input: Record<string, unknown>) =>
    gql(
      `mutation ($id: ID!, $input: UpdateTransactionInput!) {
        updateTransaction(id: $id, input: $input) { ${FIELDS} }
      }`,
      { id, input },
    );

  // Создаёт транзакцию и возвращает её id: для тестов правки и баланса.
  const created = async (input: Record<string, unknown>): Promise<string> => {
    const { data, errors } = await create(input);

    expect(errors).toBeUndefined();

    return data?.createTransaction.id;
  };

  return { create, update, created };
};

// «Сегодня» и дата через год считаются так же, как на сервере: в поясе
// пользователя, поэтому тест не зависит от часа запуска.
export const today = () => calendarDayIn(new Date(), userTimeZone());
export const nextYear = () =>
  calendarDayIn(
    new Date(Date.now() + 366 * 24 * 60 * 60 * 1000),
    userTimeZone(),
  );
