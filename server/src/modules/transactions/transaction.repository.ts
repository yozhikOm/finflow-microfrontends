import { TransactionModel } from './transaction.model.js';

import type { TransactionData } from './transaction.types.js';

export const transactionRepository = {
  async findAll() {
    return TransactionModel.find().sort({ date: -1 });
  },

  async findById(id: string) {
    return TransactionModel.findById(id).exec();
  },

  create(data: TransactionData) {
    return TransactionModel.create(data);
  },

  async update(id: string, data: TransactionData) {
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
