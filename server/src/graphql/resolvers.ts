import { TransactionModel } from '../models/transaction.model.js';

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
    transactions: async () => {
      return TransactionModel.find().sort({ date: -1 });
    },
  },

  Mutation: {
    createTransaction: async (_: unknown, { input }: { input: any }) => {
      const transaction = await TransactionModel.create({
        ...input,
        date: new Date(input.date),
      });

      return transaction;
    },
  },
};
