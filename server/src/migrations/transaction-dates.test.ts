import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';

import { startServer } from '../app.js';
import { migrateTransactionDates } from './transaction-dates.js';

process.env.MONGODB_URI ??= 'mongodb://localhost:27017/finflow-test';

let server: Awaited<ReturnType<typeof startServer>>;

beforeAll(async () => {
  server = await startServer({ port: 0 });
});

afterAll(async () => {
  await server?.stop();
});

const transactions = () => mongoose.connection.collection('transactions');

beforeEach(async () => {
  await transactions().deleteMany({});
});

const listedDates = async (): Promise<string[]> => {
  const response = await fetch(server.url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: '{ transactions { date } }' }),
  });
  const { data } = await response.json();

  return data.transactions.map(({ date }: { date: string }) => date);
};

// Документ в том виде, в каком его сохраняли до ADR-0003: дата — момент UTC.
// Ночная трата 1 ноября в 01:30 по Москве — это 31 октября 22:30 UTC.
const insertLegacyExpense = () =>
  transactions().insertOne({
    type: 'EXPENSE',
    amount: { amount: 50000, currency: 'RUB' },
    accountId: 'account-rub',
    categoryId: 'category-food',
    date: new Date('2026-10-31T22:30:00.000Z'),
    createdAt: new Date('2026-10-31T22:31:00.000Z'),
    updatedAt: new Date('2026-10-31T22:31:00.000Z'),
  });

it('moves a stored moment to the calendar day the user saw', async () => {
  await insertLegacyExpense();

  const migrated = await migrateTransactionDates({
    timeZone: 'Europe/Moscow',
  });

  expect(migrated).toBe(1);
  expect(await listedDates()).toEqual(['2026-11-01']);
});

it('leaves already migrated transactions alone on a second run', async () => {
  await insertLegacyExpense();
  await migrateTransactionDates({ timeZone: 'Europe/Moscow' });

  const migrated = await migrateTransactionDates({ timeZone: 'UTC' });

  expect(migrated).toBe(0);
  expect(await listedDates()).toEqual(['2026-11-01']);
});
