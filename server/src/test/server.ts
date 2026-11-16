import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach } from 'vitest';

import { startServer } from '../app.js';

// Отдельная база, чтобы локальный прогон не трогал данные разработки.
// В CI MONGODB_URI задаётся в workflow.
process.env.MONGODB_URI ??= 'mongodb://localhost:27017/finflow-test';

export interface GraphQLResponse {
  // Тест читает ответ API как есть: его форма и проверяется.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: Record<string, any> | null;
  errors?: { message: string; extensions?: Record<string, unknown> }[];
}

/** Запрос к GraphQL API тестового server. */
export type Gql = (
  query: string,
  variables?: Record<string, unknown>,
) => Promise<GraphQLResponse>;

/** Коллекция транзакций напрямую, мимо схемы Mongoose. */
export const transactionsCollection = () =>
  mongoose.connection.collection('transactions');

/**
 * Поднимает server на свободном порту на время тестового файла и чистит
 * все коллекции перед каждым тестом. Возвращает функцию запроса к его
 * GraphQL API.
 */
export const setupTestServer = (): Gql => {
  let server: Awaited<ReturnType<typeof startServer>>;

  beforeAll(async () => {
    server = await startServer({ port: 0 });
  });

  afterAll(async () => {
    await server?.stop();
  });

  // deleteMany, а не drop: индексы (уникальность имени счёта) остаются.
  beforeEach(async () => {
    const collections = await mongoose.connection.db?.collections();

    await Promise.all(
      (collections ?? []).map((collection) => collection.deleteMany({})),
    );
  });

  return async (
    query: string,
    variables: Record<string, unknown> = {},
  ): Promise<GraphQLResponse> => {
    const response = await fetch(server.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });

    return response.json();
  };
};
