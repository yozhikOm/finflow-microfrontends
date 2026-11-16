import { calendarDayIn, isCalendarDay } from '../../calendar-day.js';
import { userTimeZone } from '../../config.js';
import { badUserInput } from '../../errors/bad-user-input.js';
import { ruleViolation } from '../../errors/rule-violation.js';
import { transactionRepository } from './transaction.repository.js';
import {
  TransactionFields,
  UpdateTransactionInput,
} from './transaction.types.js';

// Правила проверяются по порядку, наружу уходит первое нарушение (ADR-0015).
const validateTransaction = (input: TransactionFields) => {
  // Ошибка самого клиента — сбой, а не отказ (ADR-0015), поэтому до правил.
  if (!input.accountId) {
    throw badUserInput('Account is required');
  }

  if (input.amount.amount <= 0) {
    throw ruleViolation(
      'AMOUNT_NOT_POSITIVE',
      'Transaction amount must be greater than zero',
      'amount',
    );
  }

  if (input.type === 'INCOME' || input.type === 'EXPENSE') {
    if (!input.categoryId) {
      throw ruleViolation(
        'CATEGORY_REQUIRED',
        'Category is required for income and expense',
        'categoryId',
      );
    }

    if (input.targetAccountId) {
      throw ruleViolation(
        'TARGET_ACCOUNT_NOT_ALLOWED',
        'Target account is not allowed for income and expense',
        'targetAccountId',
      );
    }

    if (input.targetAmount) {
      throw ruleViolation(
        'TARGET_AMOUNT_NOT_ALLOWED',
        'Target amount is not allowed for income and expense',
        'targetAmount',
      );
    }
  }

  if (input.type === 'TRANSFER') {
    if (!input.targetAccountId) {
      throw ruleViolation(
        'TARGET_ACCOUNT_REQUIRED',
        'Target account is required for transfer',
        'targetAccountId',
      );
    }

    if (input.categoryId) {
      throw ruleViolation(
        'CATEGORY_NOT_ALLOWED',
        'Category is not allowed for transfer',
        'categoryId',
      );
    }

    if (input.accountId === input.targetAccountId) {
      throw ruleViolation(
        'SAME_ACCOUNT',
        'Source and target accounts must be different',
        'targetAccountId',
      );
    }

    if (!input.targetAmount) {
      throw ruleViolation(
        'TARGET_AMOUNT_REQUIRED',
        'Target amount is required for transfer',
        'targetAmount',
      );
    }

    if (input.targetAmount.amount <= 0) {
      throw ruleViolation(
        'AMOUNT_NOT_POSITIVE',
        'Target amount must be greater than zero',
        'targetAmount',
      );
    }

    // Валюты счетов сервер пока не знает (нет модуля счетов), поэтому
    // одинаковые валюты видны только по самим суммам.
    if (
      input.targetAmount.currency === input.amount.currency &&
      input.targetAmount.amount !== input.amount.amount
    ) {
      throw ruleViolation(
        'TARGET_AMOUNT_MISMATCH',
        'Target amount must equal the amount for a transfer in one currency',
        'targetAmount',
      );
    }
  }
};

// Дата — календарный день `YYYY-MM-DD`. Другой формат или несуществующий
// день — ошибка клиента: форма шлёт дату только в этом виде.
const validateDate = (date: string) => {
  if (!isCalendarDay(date)) {
    throw badUserInput(`Transaction date must be a calendar day YYYY-MM-DD`);
  }

  // Транзакция — то, что уже произошло. «Сегодня» — в поясе пользователя,
  // поэтому поздно вечером по Москве сегодняшний день ещё допустим.
  if (date > calendarDayIn(new Date(), userTimeZone())) {
    throw ruleViolation(
      'DATE_IN_FUTURE',
      'Transaction date cannot be later than today',
      'date',
    );
  }
};

export const transactionService = {
  getAll() {
    return transactionRepository.findAll();
  },

  async getById(id: string) {
    return transactionRepository.findById(id);
  },

  create(input: TransactionFields) {
    validateDate(input.date);
    validateTransaction(input);

    return transactionRepository.create(input);
  },

  async update(id: string, input: UpdateTransactionInput) {
    const existingTransaction = await transactionRepository.findById(id);

    if (!existingTransaction) {
      throw ruleViolation('NOT_FOUND', 'Transaction not found');
    }

    // Вид транзакции не меняется (GLOSSARY.md). `type` пока остаётся во входе
    // правки: совпадающий пропускается, другой — отказ (ADR-0015).
    if (input.type && input.type !== existingTransaction.type) {
      throw ruleViolation(
        'TYPE_IMMUTABLE',
        'Transaction type cannot be changed',
        'type',
      );
    }

    const updatedTransaction: TransactionFields = {
      type: existingTransaction.type,
      amount: input.amount ?? existingTransaction.amount,
      targetAmount: input.targetAmount ?? existingTransaction.targetAmount,
      accountId: input.accountId ?? existingTransaction.accountId,
      targetAccountId:
        input.targetAccountId ?? existingTransaction.targetAccountId,
      categoryId: input.categoryId ?? existingTransaction.categoryId,
      date: input.date ?? existingTransaction.date,
      description: input.description ?? existingTransaction.description,
    };

    validateDate(updatedTransaction.date);
    validateTransaction(updatedTransaction);

    return transactionRepository.update(id, updatedTransaction);
  },
  async delete(id: string) {
    return transactionRepository.delete(id);
  },
};
