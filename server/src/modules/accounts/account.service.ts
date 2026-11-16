import { badUserInput } from '../../errors/bad-user-input.js';
import { ruleViolation } from '../../errors/rule-violation.js';
import { transactionRepository } from '../transactions/transaction.repository.js';
import { accountRepository } from './account.repository.js';

import type { HydratedDocument } from 'mongoose';
import type {
  Account,
  CreateAccountInput,
  StoredAccount,
} from './account.types.js';

// Код ошибки MongoDB при нарушении уникального индекса.
const DUPLICATE_KEY = 11000;

// Имя уникально среди всех счетов, включая архивные (GLOSSARY.md).
const nameTaken = () =>
  ruleViolation('ACCOUNT_NAME_TAKEN', 'Account name is already taken', 'name');

type StoredAccountDocument = HydratedDocument<StoredAccount>;

const toAccount = (
  stored: StoredAccountDocument,
  movement: number,
): Account => ({
  id: stored.id,
  name: stored.name,
  type: stored.type,
  currency: stored.currency,
  initialBalance: { amount: stored.initialBalance, currency: stored.currency },
  archived: stored.archived,
  balance: {
    amount: stored.initialBalance + movement,
    currency: stored.currency,
  },
  createdAt: stored.createdAt,
  updatedAt: stored.updatedAt,
});

// Баланс вычисляется при запросе и нигде не хранится (ADR-0006): начальный
// остаток плюс движение денег по транзакциям счёта. Одна агрегация на все
// счета запроса, а не по запросу на счёт.
const withBalances = async (
  stored: StoredAccountDocument[],
): Promise<Account[]> => {
  const movements = await transactionRepository.movementsByAccount(
    stored.map(({ id }) => id),
  );

  return stored.map((account) =>
    toAccount(account, movements.get(account.id) ?? 0),
  );
};

export const accountService = {
  async getAll(): Promise<Account[]> {
    return withBalances(await accountRepository.findAll());
  },

  async getById(id: string): Promise<Account | null> {
    const stored = await accountRepository.findById(id);

    return stored && (await withBalances([stored]))[0];
  },

  async create(input: CreateAccountInput): Promise<Account> {
    const name = input.name.trim();

    // Пустое имя форма не отправит: это ошибка клиента, а не отказ (ADR-0015).
    if (!name) {
      throw badUserInput('Account name is required');
    }

    if (await accountRepository.existsWithName(name)) {
      throw nameTaken();
    }

    try {
      // У нового счёта ещё нет транзакций.
      return toAccount(await accountRepository.create({ ...input, name }), 0);
    } catch (error) {
      // Другой запрос успел занять имя между проверкой и записью.
      if ((error as { code?: unknown }).code === DUPLICATE_KEY) {
        throw nameTaken();
      }

      throw error;
    }
  },
};
