import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';

import { accountApi, rubCard } from './test/accounts.js';
import { setupTestServer, type GraphQLResponse } from './test/server.js';
import {
  expense,
  nextYear,
  rub,
  transactionApi,
  transfer,
  usd,
} from './test/transactions.js';

const gql = setupTestServer();
const { create, update, created } = transactionApi(gql);
const { createAccount, createdAccount } = accountApi(gql);

// Отказ по доменному правилу (ADR-0015): одна ошибка GraphQL с
// `extensions: { code: 'RULE_VIOLATION', rule, field? }`.
const violation = ({ data, errors }: GraphQLResponse) => {
  expect(data ?? null).toBeNull();
  expect(errors).toHaveLength(1);

  return errors?.[0].extensions;
};

interface ViolationCase {
  name: string;
  act: () => Promise<GraphQLResponse>;
  field?: string;
}

// Тест поведения на каждое значение `enum RuleViolation` (ADR-0015).
const violationCases: Record<string, ViolationCase[]> = {
  AMOUNT_NOT_POSITIVE: [
    {
      name: 'zero amount',
      act: () => create(expense({ amount: rub(0) })),
      field: 'amount',
    },
    {
      name: 'zero target amount',
      act: () => create(transfer({ targetAmount: usd(0) })),
      field: 'targetAmount',
    },
    {
      name: 'negative target amount',
      act: () => create(transfer({ targetAmount: usd(-10000) })),
      field: 'targetAmount',
    },
  ],
  CATEGORY_REQUIRED: [
    {
      name: 'expense without a category',
      act: () => create(expense({ categoryId: undefined })),
      field: 'categoryId',
    },
  ],
  CATEGORY_NOT_ALLOWED: [
    {
      name: 'transfer with a category',
      act: () => create(transfer({ categoryId: 'category-food' })),
      field: 'categoryId',
    },
  ],
  TARGET_ACCOUNT_REQUIRED: [
    {
      name: 'transfer without a target account',
      act: () => create(transfer({ targetAccountId: undefined })),
      field: 'targetAccountId',
    },
  ],
  TARGET_ACCOUNT_NOT_ALLOWED: [
    {
      name: 'expense with a target account',
      act: () => create(expense({ targetAccountId: 'account-usd' })),
      field: 'targetAccountId',
    },
  ],
  SAME_ACCOUNT: [
    {
      name: 'transfer to the same account',
      act: () =>
        create(
          transfer({
            targetAccountId: 'account-rub',
            targetAmount: rub(900000),
          }),
        ),
      field: 'targetAccountId',
    },
  ],
  NOT_FOUND: [
    {
      name: 'edit of a deleted transaction',
      act: () =>
        update(new mongoose.Types.ObjectId().toString(), {
          description: 'Кофе',
        }),
    },
  ],
  DATE_IN_FUTURE: [
    {
      name: 'expense dated next year',
      act: () => create(expense({ date: nextYear() })),
      field: 'date',
    },
    {
      name: 'edit of the date to next year',
      act: async () => update(await created(expense()), { date: nextYear() }),
      field: 'date',
    },
  ],
  TYPE_IMMUTABLE: [
    {
      name: 'edit of an expense into income',
      act: async () => update(await created(expense()), { type: 'INCOME' }),
      field: 'type',
    },
  ],
  TARGET_AMOUNT_REQUIRED: [
    {
      name: 'transfer without a target amount',
      act: () => create(transfer({ targetAmount: undefined })),
      field: 'targetAmount',
    },
  ],
  TARGET_AMOUNT_NOT_ALLOWED: [
    {
      name: 'expense with a target amount',
      act: () => create(expense({ targetAmount: rub(50000) })),
      field: 'targetAmount',
    },
  ],
  ACCOUNT_NAME_TAKEN: [
    {
      name: 'account with the name of another account',
      act: async () => {
        await createdAccount(rubCard({ name: 'Карта' }));

        return createAccount(
          rubCard({ name: 'Карта', type: 'CASH', currency: 'USD' }),
        );
      },
      field: 'name',
    },
    {
      name: 'name that differs only by surrounding spaces',
      act: async () => {
        await createdAccount(rubCard({ name: 'Карта' }));

        return createAccount(rubCard({ name: '  Карта ' }));
      },
      field: 'name',
    },
  ],
  TARGET_AMOUNT_MISMATCH: [
    {
      name: 'transfer in one currency with different amounts',
      act: () =>
        create(transfer({ amount: rub(150000), targetAmount: rub(140000) })),
      field: 'targetAmount',
    },
    {
      name: 'edit of the amount of a transfer in one currency',
      act: async () =>
        update(
          await created(
            transfer({
              amount: rub(150000),
              targetAmount: rub(150000),
              targetAccountId: 'account-rub-savings',
            }),
          ),
          { amount: rub(200000) },
        ),
      field: 'targetAmount',
    },
  ],
};

describe('rule violations', () => {
  it('has a behaviour test for every RuleViolation in the schema', async () => {
    const { data } = await gql(
      '{ __type(name: "RuleViolation") { enumValues { name } } }',
    );
    const rules = data?.__type.enumValues.map(
      ({ name }: { name: string }) => name,
    );

    expect(Object.keys(violationCases).sort()).toEqual(rules.sort());
  });

  const cases = Object.entries(violationCases).flatMap(([rule, list]) =>
    list.map((testCase) => ({ rule, ...testCase })),
  );

  it.each(cases)('$rule: $name', async ({ rule, act, field }) => {
    expect(violation(await act())).toEqual({
      code: 'RULE_VIOLATION',
      rule,
      ...(field && { field }),
    });
  });
});
