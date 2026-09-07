import { TransactionModel } from './transaction.model.js';

export const transactionRepository = {
  async findAll() {
    return TransactionModel.find().sort({ date: -1 });
  },

  async findById(id: string) {
    return TransactionModel.findById(id).exec();
  },

  create(data: Parameters<typeof TransactionModel.create>[0]) {
    return TransactionModel.create(data);
  },

  async delete(id: string) {
    const result = await TransactionModel.findByIdAndDelete(id).exec();

    return result !== null;
  },
};
