import { expect, test } from 'vitest';

import { setupTestServer } from './test/server.js';

const gql = setupTestServer();

// Запрос transactions проходит через HTTP, GraphQL-схему, резолвер и MongoDB,
// поэтому зелёный тест значит, что приложение поднялось целиком.
test('server starts and answers a GraphQL query', async () => {
  const { data, errors } = await gql('{ transactions { id } }');

  expect(errors).toBeUndefined();
  expect(Array.isArray(data?.transactions)).toBe(true);
});
