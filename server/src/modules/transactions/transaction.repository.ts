import { TransactionModel } from './transaction.model.js';

import type { TransactionFields } from './transaction.types.js';

export const transactionRepository = {
  async findAll() {
    // Внутри одного дня сверху последняя введённая транзакция.
    return TransactionModel.find().sort({ date: -1, createdAt: -1 });
  },

  async findById(id: string) {
    return TransactionModel.findById(id).exec();
  },

  create(data: TransactionFields) {
    return TransactionModel.create(data);
  },

  async update(id: string, data: TransactionFields) {
    return TransactionModel.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    }).exec();
  },

  async delete(id: string) {
    const result = await TransactionModel.findByIdAndDelete(id).exec();

    return result !== null;
  },
};
