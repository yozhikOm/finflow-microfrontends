// Выгружает GraphQL-схему в `schema.graphql`: из этого файла микрофронтенды
// генерируют типы, а CI сверяет его с `typeDefs` (ADR-0002).
// `npm run schema`.
import { writeFileSync } from 'node:fs';

import { buildSchema, printSchema } from 'graphql';

import { typeDefs } from './schema.js';

const file = new URL('../../schema.graphql', import.meta.url);

writeFileSync(file, `${printSchema(buildSchema(typeDefs))}\n`);

console.log(`GraphQL schema written to ${file.pathname}`);
