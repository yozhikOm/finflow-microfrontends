// Значения enum из GraphQL-схемы. Каждый список объявлен один раз: из него
// строятся и enum схемы, и проверка `enum` в модели Mongoose, и тип ниже.
export const TRANSACTION_TYPES = ['INCOME', 'EXPENSE', 'TRANSFER'] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const CURRENCIES = ['RUB', 'USD', 'EUR'] as const;

export type Currency = (typeof CURRENCIES)[number];

export interface Money {
  amount: number;
  currency: Currency;
}

// Поля транзакции без служебных id/createdAt/updatedAt. Одни и те же на входе
// мутации createTransaction, при записи в репозиторий и в доменной модели.
export interface TransactionFields {
  type: TransactionType;
  amount: Money;
  // Сумма зачисления: только у перевода, в валюте счёта зачисления (ADR-0004).
  targetAmount?: Money;
  accountId: string;
  targetAccountId?: string;
  categoryId?: string;
  // Календарный день `YYYY-MM-DD` без времени и пояса (ADR-0003). Одинаков
  // на входе, в MongoDB и на выходе.
  date: string;
  description?: string;
}

// Доменная модель — то, что хранится и возвращается наружу
export interface Transaction extends TransactionFields {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// Вход мутации updateTransaction: partial-обновление
export type UpdateTransactionInput = Partial<TransactionFields>;
