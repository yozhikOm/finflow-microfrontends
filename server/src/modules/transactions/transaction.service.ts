import { transactionRepository } from './transaction.repository.js';

type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

interface CreateTransactionInput {
  type: TransactionType;
  amount: {
    amount: number;
    currency: 'RUB' | 'USD' | 'EUR';
  };
  accountId: string;
  targetAccountId?: string;
  categoryId?: string;
  date: string;
  description?: string;
}

const validateTransaction = (input: CreateTransactionInput) => {
  if (input.amount.amount <= 0) {
    throw new Error('Transaction amount must be greater than zero');
  }

  if (!input.accountId) {
    throw new Error('Account is required');
  }

  if (input.type === 'INCOME' || input.type === 'EXPENSE') {
    if (!input.categoryId) {
      throw new Error('Category is required for income and expense');
    }

    if (input.targetAccountId) {
      throw new Error('Target account is not allowed for income and expense');
    }
  }

  if (input.type === 'TRANSFER') {
    if (!input.targetAccountId) {
      throw new Error('Target account is required for transfer');
    }

    if (input.categoryId) {
      throw new Error('Category is not allowed for transfer');
    }

    if (input.accountId === input.targetAccountId) {
      throw new Error('Source and target accounts must be different');
    }
  }
};

export const transactionService = {
  getAll() {
    return transactionRepository.findAll();
  },

  async getById(id: string) {
    return transactionRepository.findById(id);
  },

  create(input: CreateTransactionInput) {
    validateTransaction(input);

    const date = new Date(input.date);

    if (Number.isNaN(date.getTime())) {
      throw new Error('Invalid transaction date');
    }
    return transactionRepository.create({
      ...input,
      date,
    });
  },

  async delete(id: string) {
    return transactionRepository.delete(id);
  },
};
