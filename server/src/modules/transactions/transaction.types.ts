type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

type Currency = 'RUB' | 'USD' | 'EUR';

interface Money {
  amount: number;
  currency: Currency;
}

// Доменная модель
export interface Transaction {
  id: string;
  type: TransactionType;
  amount: Money;
  accountId: string;
  targetAccountId?: string;
  categoryId?: string;
  date: Date;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Типы входных данных
export interface CreateTransactionInput {
  type: TransactionType;
  amount: Money;
  accountId: string;
  targetAccountId?: string;
  categoryId?: string;
  date: string;
  description?: string;
}

export interface UpdateTransactionInput {
  type?: TransactionType;
  amount?: Money;
  accountId?: string;
  targetAccountId?: string;
  categoryId?: string;
  date?: string;
  description?: string;
}

export interface TransactionData {
  type: TransactionType;
  amount: Money;
  accountId: string;
  targetAccountId?: string;
  categoryId?: string;
  date: string | Date;
  description?: string;
}

