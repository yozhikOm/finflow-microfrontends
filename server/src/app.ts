import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

import { connectToDatabase, disconnectFromDatabase } from './db/connection.js';
import { typeDefs } from './graphql/schema.js';
import { resolvers } from './graphql/resolvers.js';

// Запуск вынесен из index.ts, чтобы тесты могли поднять сервер на свободном
// порту (port: 0) и остановить его после себя.
export const startServer = async ({ port }: { port: number }) => {
  await connectToDatabase();

  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  const { url } = await startStandaloneServer(server, {
    listen: {
      port,
    },
  });

  const stop = async () => {
    await server.stop();
    await disconnectFromDatabase();
  };

  return { url, stop };
};
