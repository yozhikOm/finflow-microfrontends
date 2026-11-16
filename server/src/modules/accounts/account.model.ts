import { Schema, model } from 'mongoose';

import { CURRENCIES } from '../../money.js';
import { ACCOUNT_TYPES, type StoredAccount } from './account.types.js';

const accountSchema = new Schema<StoredAccount>(
  {
    // Имя уникально среди всех счетов, включая архивные (GLOSSARY.md).
    // Сервис проверяет его сам, индекс страхует от двух одновременных
    // созданий с одним именем.
    name: {
      type: String,
      required: true,
      unique: true,
    },

    type: {
      type: String,
      enum: ACCOUNT_TYPES,
      required: true,
    },

    currency: {
      type: String,
      enum: CURRENCIES,
      required: true,
    },

    // Минимальные единицы валюты счёта, может быть отрицательным.
    initialBalance: {
      type: Number,
      required: true,
    },

    archived: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

export const AccountModel = model('Account', accountSchema);
