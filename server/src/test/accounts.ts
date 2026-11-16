import { expect } from 'vitest';

import type { Gql } from './server.js';

const FIELDS = `
  id name type currency archived createdAt updatedAt
  initialBalance { amount currency }
  balance { amount currency }
`;

export const rubCard = (overrides: Record<string, unknown> = {}) => ({
  name: 'Карта',
  type: 'BANK_ACCOUNT',
  currency: 'RUB',
  initialBalance: 0,
  ...overrides,
});

/** Запросы и мутации счетов через GraphQL API тестового server. */
export const accountApi = (gql: Gql) => {
  const createAccount = (input: Record<string, unknown>) =>
    gql(
      `mutation ($input: CreateAccountInput!) {
        createAccount(input: $input) { ${FIELDS} }
      }`,
      { input },
    );

  // Создаёт счёт и возвращает его id: для тестов баланса.
  const createdAccount = async (
    input: Record<string, unknown>,
  ): Promise<string> => {
    const { data, errors } = await createAccount(input);

    expect(errors).toBeUndefined();

    return data?.createAccount.id;
  };

  const account = async (id: string) => {
    const { data, errors } = await gql(
      `query ($id: ID!) { account(id: $id) { ${FIELDS} } }`,
      { id },
    );

    expect(errors).toBeUndefined();

    return data?.account;
  };

  const accounts = async () => {
    const { data, errors } = await gql(`{ accounts { ${FIELDS} } }`);

    expect(errors).toBeUndefined();

    return data?.accounts;
  };

  return { createAccount, createdAccount, account, accounts };
};
