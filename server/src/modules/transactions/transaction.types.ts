export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

export type Currency = 'RUB' | 'USD' | 'EUR';

export interface Money {
  amount: number;
  currency: Currency;
}

// Единственный источник правды для полей, которые есть и в доменной модели,
// и во входных данных.
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

// Данные для записи в репозиторий: без служебных id/createdAt/updatedAt
export type TransactionData = TransactionFields;

// Вход мутации createTransaction
export type CreateTransactionInput = TransactionFields;

// Вход мутации updateTransaction: partial-обновление
export type UpdateTransactionInput = Partial<TransactionFields>;
