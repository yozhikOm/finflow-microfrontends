import type { CodegenConfig } from '@graphql-codegen/cli';

// Типы контракта с server генерируются из файла его схемы (ADR-0002):
// запущенный server и MongoDB не нужны. `npm run codegen`, результат
// коммитится, а CI проверяет, что он не отстал от схемы.
const config: CodegenConfig = {
  schema: '../server/schema.graphql',
  generates: {
    'src/shared/api/graphql.generated.ts': {
      plugins: ['typescript'],
      config: {
        // Значения enum — строковые union-типы, как в схеме: 'INCOME',
        // 'TRANSFER' (ADR-0015 ждёт union для RuleViolation).
        enumsAsTypes: true,
        scalars: { ID: 'string' },
      },
    },
  },
};

export default config;
