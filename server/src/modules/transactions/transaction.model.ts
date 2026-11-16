import { Schema, model } from 'mongoose';

import { CURRENCIES } from '../../money.js';
import { TRANSACTION_TYPES, type Transaction } from './transaction.types.js';

const moneySchema = new Schema(
  {
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      enum: CURRENCIES,
      required: true,
    },
  },
  {
    _id: false,
  },
);

const transactionSchema = new Schema<Transaction>(
  {
    type: {
      type: String,
      enum: TRANSACTION_TYPES,
      required: true,
    },

    amount: {
      type: moneySchema,
      required: true,
    },

    targetAmount: {
      type: moneySchema,
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

    // Календарный день `YYYY-MM-DD` (ADR-0003): строка сортируется так же,
    // как дата, поэтому сортировка и диапазоны работают без преобразований.
    date: {
      type: String,
      required: true,
    },

    description: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

export const TransactionModel = model('Transaction', transactionSchema);
