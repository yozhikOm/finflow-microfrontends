import { accountService } from '../modules/accounts/account.service.js';
import type { CreateAccountInput } from '../modules/accounts/account.types.js';
import { transactionService } from '../modules/transactions/transaction.service.js';
import {
  TransactionFields,
  UpdateTransactionInput,
} from '../modules/transactions/transaction.types.js';

// Схема объявляет createdAt/updatedAt как String!, а Mongoose отдаёт
// объекты Date. Дефолтный сериализатор GraphQLString вызывает Date.valueOf()
// и превращает момент в таймстамп ("1699564800000"), а не в читаемую строку.
// Поэтому моменты явно приводим к ISO 8601 на границе GraphQL-резолвера.
// Дата транзакции — уже строка `YYYY-MM-DD` (ADR-0003) и отдаётся как есть.
const toISOInstantString = (value: Date | string): string => {
  const date = value instanceof Date ? value : new Date(value);

  return date.toISOString();
};

// Служебные моменты создания и изменения у всех типов отдаются одинаково.
const instantFields = {
  createdAt: (parent: { createdAt: Date | string }) =>
    toISOInstantString(parent.createdAt),
  updatedAt: (parent: { updatedAt: Date | string }) =>
    toISOInstantString(parent.updatedAt),
};

export const resolvers = {
  Query: {
    accounts: () => {
      return accountService.getAll();
    },
    account: (_: unknown, { id }: { id: string }) => {
      return accountService.getById(id);
    },
    transactions: () => {
      return transactionService.getAll();
    },
    transaction: (_: unknown, { id }: { id: string }) => {
      return transactionService.getById(id);
    },
  },

  Mutation: {
    createAccount: (_: unknown, { input }: { input: CreateAccountInput }) => {
      return accountService.create(input);
    },
    createTransaction: async (
      _: unknown,
      { input }: { input: TransactionFields },
    ) => {
      return transactionService.create(input);
    },
    updateTransaction: (
      _: unknown,
      {
        id,
        input,
      }: {
        id: string;
        input: UpdateTransactionInput;
      },
    ) => {
      return transactionService.update(id, input);
    },
    deleteTransaction: (_: unknown, { id }: { id: string }) => {
      return transactionService.delete(id);
    },
  },

  Account: instantFields,

  Transaction: instantFields,
};
