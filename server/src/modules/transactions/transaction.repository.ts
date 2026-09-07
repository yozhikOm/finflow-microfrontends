import { TransactionModel } from './transaction.model.js';

export const transactionRepository = {
  async findAll() {
    return TransactionModel.find().sort({ date: -1 });
  },

  create(data: Parameters<typeof TransactionModel.create>[0]) {
    return TransactionModel.create(data);
  },
};
