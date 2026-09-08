import 'dotenv/config';

import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

import { connectToDatabase } from './db/connection.js';
import { typeDefs } from './graphql/schema.js';
import { resolvers } from './graphql/resolvers.js';

await connectToDatabase();

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const { url } = await startStandaloneServer(server, {
  listen: {
    port: 4000,
  },
});

console.log(`🚀 Server ready at ${url}`);
