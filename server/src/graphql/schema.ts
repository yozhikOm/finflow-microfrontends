export const typeDefs = `#graphql
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
    INCOME
    EXPENSE
    TRANSFER
  }

  type Money {
    amount: Int!
    currency: Currency!
  }

  enum Currency {
    RUB
    USD
    EUR
  }

  """
  Доменное правило, нарушение которого server возвращает ошибкой
  с extensions { code: RULE_VIOLATION, rule, field } (ADR-0015).
  Ни одно поле его не возвращает: enum входит в контракт ради codegen.
  """
  enum RuleViolation {
    AMOUNT_NOT_POSITIVE
    DATE_IN_FUTURE
    CATEGORY_REQUIRED
    CATEGORY_NOT_ALLOWED
    TARGET_ACCOUNT_REQUIRED
    TARGET_ACCOUNT_NOT_ALLOWED
    SAME_ACCOUNT
    TYPE_IMMUTABLE
    TARGET_AMOUNT_REQUIRED
    TARGET_AMOUNT_NOT_ALLOWED
    TARGET_AMOUNT_MISMATCH
    NOT_FOUND
  }

  type Query {
    transactions: [Transaction!]!,
    transaction(id: ID!): Transaction
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
