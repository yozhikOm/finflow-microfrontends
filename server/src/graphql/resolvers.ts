import { transactionService } from '../modules/transactions/transaction.service.js';
import {
  CreateTransactionInput,
  UpdateTransactionInput,
} from '../modules/transactions/transaction.types.js';

// Схема объявляет date/createdAt/updatedAt как String!, а Mongoose отдаёт
// объекты Date. Дефолтный сериализатор GraphQLString вызывает Date.valueOf()
// и превращает дату в таймстамп ("1699564800000"), а не в читаемую строку.
// Поэтому даты явно приводим к ISO 8601 на границе GraphQL-резолвера.
const toISODateString = (value: Date | string): string => {
  const date = value instanceof Date ? value : new Date(value);

  return date.toISOString();
};

export const resolvers = {
  Query: {
    transactions: () => {
      return transactionService.getAll();
    },
    transaction: (_: unknown, { id }: { id: string }) => {
      return transactionService.getById(id);
    },
  },

  Mutation: {
    createTransaction: async (
      _: unknown,
      { input }: { input: CreateTransactionInput }
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
      }
    ) => {
      return transactionService.update(id, input);
    },
    deleteTransaction: (_: unknown, { id }: { id: string }) => {
      return transactionService.delete(id);
    },
  },

  Transaction: {
    date: (parent: { date: Date | string }) => toISODateString(parent.date),
    createdAt: (parent: { createdAt: Date | string }) =>
      toISODateString(parent.createdAt),
    updatedAt: (parent: { updatedAt: Date | string }) =>
      toISODateString(parent.updatedAt),
  },
};
