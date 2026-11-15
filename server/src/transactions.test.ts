import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { startServer } from './app.js';
import { calendarDayIn } from './calendar-day.js';
import { userTimeZone } from './config.js';

process.env.MONGODB_URI ??= 'mongodb://localhost:27017/finflow-test';

let server: Awaited<ReturnType<typeof startServer>>;

beforeAll(async () => {
  server = await startServer({ port: 0 });
});

afterAll(async () => {
  await server?.stop();
});

beforeEach(async () => {
  await mongoose.connection.collection('transactions').deleteMany({});
});

interface GraphQLResponse {
  // Тест читает ответ API как есть: его форма и проверяется.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: Record<string, any> | null;
  errors?: { message: string; extensions?: Record<string, unknown> }[];
}

const gql = async (
  query: string,
  variables: Record<string, unknown> = {},
): Promise<GraphQLResponse> => {
  const response = await fetch(server.url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  return response.json();
};

const FIELDS = `
  id type accountId targetAccountId categoryId date description
  amount { amount currency }
  targetAmount { amount currency }
`;

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

// Создаёт транзакцию и возвращает её id: для тестов правки.
const created = async (input: Record<string, unknown>): Promise<string> => {
  const { data, errors } = await create(input);

  expect(errors).toBeUndefined();

  return data?.createTransaction.id;
};

const rub = (amount: number) => ({ amount, currency: 'RUB' });
const usd = (amount: number) => ({ amount, currency: 'USD' });

const transfer = (overrides: Record<string, unknown> = {}) => ({
  type: 'TRANSFER',
  amount: rub(900000),
  targetAmount: usd(10000),
  accountId: 'account-rub',
  targetAccountId: 'account-usd',
  date: '2026-11-01',
  ...overrides,
});

const expense = (overrides: Record<string, unknown> = {}) => ({
  type: 'EXPENSE',
  amount: rub(50000),
  accountId: 'account-rub',
  categoryId: 'category-food',
  date: '2026-11-01',
  ...overrides,
});

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

// «Сегодня» и дата через год считаются так же, как на сервере: в поясе
// пользователя, поэтому тест не зависит от часа запуска.
const today = () => calendarDayIn(new Date(), userTimeZone());
const nextYear = () =>
  calendarDayIn(
    new Date(Date.now() + 366 * 24 * 60 * 60 * 1000),
    userTimeZone(),
  );

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
