export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

export type Currency = 'RUB' | 'USD' | 'EUR';

export interface Money {
  amount: number;
  currency: Currency;
}

// Единственный источник правды для полей, которые есть и в доменной модели,
// и во входных данных (кроме date — у неё разное представление на разных
// границах, см. ниже).
export interface TransactionFields {
  type: TransactionType;
  amount: Money;
  accountId: string;
  targetAccountId?: string;
  categoryId?: string;
  description?: string;
}

// Доменная модель — то, что хранится и возвращается наружу
export interface Transaction extends TransactionFields {
  id: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Данные для записи в репозиторий: без служебных id/createdAt/updatedAt,
// но date уже приведена к Date (граница между GraphQL-слоем и доменом)
export type TransactionData = TransactionFields & { date: Date };

// Вход мутации createTransaction: те же поля, но date — ещё строка,
// как её присылает GraphQL-клиент
export interface CreateTransactionInput extends TransactionFields {
  date: string;
}

// Вход мутации updateTransaction: то же самое, но partial-обновление
export type UpdateTransactionInput = Partial<CreateTransactionInput>;
