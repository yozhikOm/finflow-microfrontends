import { RULE_VIOLATIONS } from '../errors/rule-violation.js';
import { CURRENCIES } from '../money.js';
import { ACCOUNT_TYPES } from '../modules/accounts/account.types.js';
import { TRANSACTION_TYPES } from '../modules/transactions/transaction.types.js';

// Значения enum берутся из тех же списков, что типы и модель Mongoose:
// так схема не расходится с кодом.
const enumValues = (values: readonly string[]) => values.join('\n    ');

export const typeDefs = `#graphql
  "Счёт: место, где лежат деньги в одной валюте (GLOSSARY.md)."
  type Account {
    id: ID!
    name: String!
    type: AccountType!
    currency: Currency!
    "Сумма на счёте до первой транзакции, в его валюте. Может быть отрицательной."
    initialBalance: Money!
    archived: Boolean!
    "Начальный остаток с учётом транзакций счёта. Вычисляется при запросе."
    balance: Money!
    createdAt: String!
    updatedAt: String!
  }

  enum AccountType {
    ${enumValues(ACCOUNT_TYPES)}
  }

  type Transaction {
    id: ID!
    type: TransactionType!
    amount: Money!
    "Сумма зачисления: только у перевода, в валюте счёта зачисления."
    targetAmount: Money
    accountId: ID!
    targetAccountId: ID
    categoryId: ID
    "Календарный день YYYY-MM-DD без времени и пояса, не позже сегодня."
    date: String!
    description: String
    createdAt: String!
    updatedAt: String!
  }

  enum TransactionType {
    ${enumValues(TRANSACTION_TYPES)}
  }

  type Money {
    amount: Int!
    currency: Currency!
  }

  enum Currency {
    ${enumValues(CURRENCIES)}
  }

  """
  Доменное правило, нарушение которого server возвращает ошибкой
  с extensions { code: RULE_VIOLATION, rule, field } (ADR-0015).
  Ни одно поле его не возвращает: enum входит в контракт ради codegen.
  """
  enum RuleViolation {
    ${enumValues(RULE_VIOLATIONS)}
  }

  type Query {
    accounts: [Account!]!
    account(id: ID!): Account
    transactions: [Transaction!]!,
    transaction(id: ID!): Transaction
  }

  input CreateAccountInput {
    name: String!
    type: AccountType!
    currency: Currency!
    "В минимальных единицах валюты счёта. Может быть отрицательным."
    initialBalance: Int!
  }

  input CreateTransactionInput {
    type: TransactionType!
    amount: MoneyInput!
    targetAmount: MoneyInput
    accountId: ID!
    targetAccountId: ID
    categoryId: ID
    date: String!
    description: String
  }

  input UpdateTransactionInput {
    type: TransactionType
    amount: MoneyInput
    targetAmount: MoneyInput
    accountId: ID
    targetAccountId: ID
    categoryId: ID
    date: String
    description: String
  }

  input MoneyInput {
    amount: Int!
    currency: Currency!
  }

  type Mutation {
    createAccount(input: CreateAccountInput!): Account!
    createTransaction(
      input: CreateTransactionInput!
    ): Transaction!
    updateTransaction(
      id: ID!
      input: UpdateTransactionInput!
    ): Transaction!
    deleteTransaction(id: ID!): Boolean!
  }
`;
