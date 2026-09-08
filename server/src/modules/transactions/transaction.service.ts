import { transactionRepository } from './transaction.repository.js';
import {
  CreateTransactionInput,
  TransactionData,
  UpdateTransactionInput,
} from './transaction.types.js';

const validateTransaction = (input: TransactionData) => {
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

  async update(id: string, input: UpdateTransactionInput) {
    const existingTransaction = await transactionRepository.findById(id);

    if (!existingTransaction) {
      throw new Error('Transaction not found');
    }

    const updatedTransaction: TransactionData = {
      type: input.type ?? existingTransaction.type,
      amount: input.amount ?? existingTransaction.amount,
      accountId: input.accountId ?? existingTransaction.accountId,
      targetAccountId:
        input.targetAccountId ??
        existingTransaction.targetAccountId ??
        undefined,
      categoryId:
        input.categoryId ?? existingTransaction.categoryId ?? undefined,
      date: input.date ? new Date(input.date) : existingTransaction.date,
      description:
        input.description ?? existingTransaction.description ?? undefined,
    };

    validateTransaction(updatedTransaction);

    return transactionRepository.update(id, updatedTransaction);
  },
  async delete(id: string) {
    return transactionRepository.delete(id);
  },
};
