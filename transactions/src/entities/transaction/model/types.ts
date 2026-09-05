type TransactionType = 'income' | 'expense' | 'transfer';

type Currency = 'RUB' | 'USD' | 'EUR';

interface Money {
  amount: number;
  currency: Currency;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: Money;
  accountId: string;
  categoryId?: string;
  targetAccountId?: string;
  date: Date;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}
