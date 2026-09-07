import { transactionRepository } from './transaction.repository.js';

export const transactionService = {
  getAll() {
    return transactionRepository.findAll();
  },

  create(input: {
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
  }) {
    return transactionRepository.create({
      ...input,
      date: new Date(input.date),
    });
  },
};
