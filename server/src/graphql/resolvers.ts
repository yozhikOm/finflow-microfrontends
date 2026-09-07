import { transactionService } from '../modules/transactions/transaction.service.js';

type Transaction = {
  id: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  amount: {
    amount: number;
    currency: 'RUB' | 'USD' | 'EUR';
  };
  accountId: string;
  targetAccountId?: string;
  categoryId?: string;
  date: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
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
      { input }: { input: Parameters<typeof transactionService.create>[0] }
    ) => {
      return transactionService.create(input);
    },
    deleteTransaction: (_: unknown, { id }: { id: string }) => {
      return transactionService.delete(id);
    },
  },
};
