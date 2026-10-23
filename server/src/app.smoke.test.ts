import { afterAll, beforeAll, expect, test } from 'vitest';

import { startServer } from './app.js';

// Отдельная база, чтобы локальный прогон не трогал данные разработки.
// В CI MONGODB_URI задаётся в workflow.
process.env.MONGODB_URI ??= 'mongodb://localhost:27017/finflow-test';

let server: Awaited<ReturnType<typeof startServer>>;

beforeAll(async () => {
  server = await startServer({ port: 0 });
});

afterAll(async () => {
  await server?.stop();
});

// Запрос transactions проходит через HTTP, GraphQL-схему, резолвер и MongoDB,
// поэтому зелёный тест значит, что приложение поднялось целиком.
test('server starts and answers a GraphQL query', async () => {
  const response = await fetch(server.url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: '{ transactions { id } }' }),
  });

  expect(response.status).toBe(200);

  const body = await response.json();

  expect(body.errors).toBeUndefined();
  expect(Array.isArray(body.data.transactions)).toBe(true);
});
