export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type CreateTransactionInput = {
  accountId: Scalars['ID']['input'];
  amount: MoneyInput;
  categoryId?: InputMaybe<Scalars['ID']['input']>;
  date: Scalars['String']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  targetAccountId?: InputMaybe<Scalars['ID']['input']>;
  targetAmount?: InputMaybe<MoneyInput>;
  type: TransactionType;
};

export type Currency =
  | 'EUR'
  | 'RUB'
  | 'USD';

export type Money = {
  __typename?: 'Money';
  amount: Scalars['Int']['output'];
  currency: Currency;
};

export type MoneyInput = {
  amount: Scalars['Int']['input'];
  currency: Currency;
};

export type Mutation = {
  __typename?: 'Mutation';
  createTransaction: Transaction;
  deleteTransaction: Scalars['Boolean']['output'];
  updateTransaction: Transaction;
};


export type MutationCreateTransactionArgs = {
  input: CreateTransactionInput;
};


export type MutationDeleteTransactionArgs = {
  id: Scalars['ID']['input'];
};


export type MutationUpdateTransactionArgs = {
  id: Scalars['ID']['input'];
  input: UpdateTransactionInput;
};

export type Query = {
  __typename?: 'Query';
  transaction?: Maybe<Transaction>;
  transactions: Array<Transaction>;
};


export type QueryTransactionArgs = {
  id: Scalars['ID']['input'];
};

/**
 * Доменное правило, нарушение которого server возвращает ошибкой
 * с extensions { code: RULE_VIOLATION, rule, field } (ADR-0015).
 * Ни одно поле его не возвращает: enum входит в контракт ради codegen.
 */
export type RuleViolation =
  | 'AMOUNT_NOT_POSITIVE'
  | 'CATEGORY_NOT_ALLOWED'
  | 'CATEGORY_REQUIRED'
  | 'DATE_IN_FUTURE'
  | 'NOT_FOUND'
  | 'SAME_ACCOUNT'
  | 'TARGET_ACCOUNT_NOT_ALLOWED'
  | 'TARGET_ACCOUNT_REQUIRED'
  | 'TARGET_AMOUNT_MISMATCH'
  | 'TARGET_AMOUNT_NOT_ALLOWED'
  | 'TARGET_AMOUNT_REQUIRED'
  | 'TYPE_IMMUTABLE';

export type Transaction = {
  __typename?: 'Transaction';
  accountId: Scalars['ID']['output'];
  amount: Money;
  categoryId?: Maybe<Scalars['ID']['output']>;
  createdAt: Scalars['String']['output'];
  /** Календарный день YYYY-MM-DD без времени и пояса, не позже сегодня. */
  date: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  targetAccountId?: Maybe<Scalars['ID']['output']>;
  /** Сумма зачисления: только у перевода, в валюте счёта зачисления. */
  targetAmount?: Maybe<Money>;
  type: TransactionType;
  updatedAt: Scalars['String']['output'];
};

export type TransactionType =
  | 'EXPENSE'
  | 'INCOME'
  | 'TRANSFER';

export type UpdateTransactionInput = {
  accountId?: InputMaybe<Scalars['ID']['input']>;
  amount?: InputMaybe<MoneyInput>;
  categoryId?: InputMaybe<Scalars['ID']['input']>;
  date?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  targetAccountId?: InputMaybe<Scalars['ID']['input']>;
  targetAmount?: InputMaybe<MoneyInput>;
  type?: InputMaybe<TransactionType>;
};
