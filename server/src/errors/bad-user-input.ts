import { ApolloServerErrorCode } from '@apollo/server/errors';
import { GraphQLError } from 'graphql';

// Ошибка самого клиента: ввод подходит под схему, но смысла не имеет
// (пустой id, дата не в формате YYYY-MM-DD). Это не отказ по доменному
// правилу, а сбой по ADR-0014, поэтому код тот же, что Apollo даёт вводу,
// который не подходит под схему (ADR-0015).
export const badUserInput = (message: string) =>
  new GraphQLError(message, {
    extensions: { code: ApolloServerErrorCode.BAD_USER_INPUT },
  });
