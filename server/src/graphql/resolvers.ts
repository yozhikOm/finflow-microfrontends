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

const transactions: Transaction[] = [];

export const resolvers = {
  Query: {
    transactions: () => transactions,
  },

  Mutation: {
    createTransaction: (
      _: unknown,
      { input }: { input: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> }
    ): Transaction => {
      const now = new Date().toISOString();

      const transaction: Transaction = {
        id: crypto.randomUUID(),
        ...input,
        createdAt: now,
        updatedAt: now,
      };

      transactions.push(transaction);

      return transaction;
    },
  },
};
