import { AccountModel } from './account.model.js';

import type { CreateAccountInput } from './account.types.js';

export const accountRepository = {
  async findAll() {
    // Счета идут в том порядке, в каком их заводили.
    return AccountModel.find().sort({ createdAt: 1 }).exec();
  },

  async findById(id: string) {
    return AccountModel.findById(id).exec();
  },

  async existsWithName(name: string) {
    return (await AccountModel.exists({ name })) !== null;
  },

  create(data: CreateAccountInput) {
    return AccountModel.create(data);
  },
};
