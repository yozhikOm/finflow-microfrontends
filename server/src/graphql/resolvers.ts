import { transactionService } from '../modules/transactions/transaction.service.js';
import { CreateTransactionInput, UpdateTransactionInput } from '../modules/transactions/transaction.types.js';

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
};
