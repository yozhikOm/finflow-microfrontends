import { Schema, model } from 'mongoose';

import type { Transaction } from './transaction.types.js';

const moneySchema = new Schema(
  {
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      enum: ['RUB', 'USD', 'EUR'],
      required: true,
    },
  },
  {
    _id: false,
  }
);

const transactionSchema = new Schema<Transaction>(
  {
    type: {
      type: String,
      enum: ['INCOME', 'EXPENSE', 'TRANSFER'],
      required: true,
    },

    amount: {
      type: moneySchema,
      required: true,
    },

    accountId: {
      type: String,
      required: true,
    },

    targetAccountId: {
      type: String,
    },

    categoryId: {
      type: String,
    },

    date: {
      type: Date,
      required: true,
    },

    description: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export const TransactionModel = model('Transaction', transactionSchema);
