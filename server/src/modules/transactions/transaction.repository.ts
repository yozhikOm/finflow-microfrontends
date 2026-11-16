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

  /**
   * Сколько денег пришло на каждый из счетов за все его транзакции, в его
   * валюте: доходы минус расходы, минус суммы исходящих переводов, плюс суммы
   * зачисления входящих. Счёта без транзакций в результате нет.
   */
  async movementsByAccount(ids: string[]): Promise<Map<string, number>> {
    const totals = await TransactionModel.aggregate<{
      _id: string;
      total: number;
    }>([
      {
        $match: {
          $or: [{ accountId: { $in: ids } }, { targetAccountId: { $in: ids } }],
        },
      },
      // Транзакция двигает деньги по двум сторонам: по своему счёту и, у
      // перевода, по счёту зачисления. У дохода и расхода второй стороны нет:
      // её счёт null, и её отбрасывает следующий $match.
      {
        $project: {
          sides: [
            {
              accountId: '$accountId',
              delta: {
                $cond: [
                  { $eq: ['$type', 'INCOME'] },
                  '$amount.amount',
                  { $multiply: ['$amount.amount', -1] },
                ],
              },
            },
            {
              accountId: '$targetAccountId',
              delta: '$targetAmount.amount',
            },
          ],
        },
      },
      { $unwind: '$sides' },
      { $match: { 'sides.accountId': { $in: ids } } },
      { $group: { _id: '$sides.accountId', total: { $sum: '$sides.delta' } } },
    ]);

    return new Map(totals.map(({ _id, total }) => [_id, total]));
  },

  async delete(id: string) {
    const result = await TransactionModel.findByIdAndDelete(id).exec();

    return result !== null;
  },
};
