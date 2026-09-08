export const typeDefs = `#graphql
  type Transaction {
    id: ID!
    type: TransactionType!
    amount: Money!
    accountId: ID!
    targetAccountId: ID
    categoryId: ID
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

  type Query {
    transactions: [Transaction!]!,
    transaction(id: ID!): Transaction
  }

  input CreateTransactionInput {
    type: TransactionType!
    amount: MoneyInput!
    accountId: ID!
    targetAccountId: ID
    categoryId: ID
    date: String!
    description: String
  }

  input UpdateTransactionInput {
    type: TransactionType
    amount: MoneyInput
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
