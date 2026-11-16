// Адрес remote-приложения задаётся при сборке, по умолчанию локальный (ADR-0009).
const transactionsUrl = (
  process.env.FINFLOW_TRANSACTIONS_URL || 'http://localhost:3001'
).replace(/\/+$/, '');

export const mfConfig = {
  name: 'shell',
  remotes: {
    transactions: `transactions@${transactionsUrl}/mf-manifest.json`,
  },
  exposes: {},
  // Типы remote-модулей скачиваются с адреса производителя и при `rspack build`,
  // а не только в dev: `@mf-types` в git нет (ADR-0009). Локально это
  // локальный производитель, поэтому до typecheck его нужно запустить.
  dts: {
    consumeTypes: { typesOnBuild: true },
  },
  // Ключ с завершающим `/` шарит подпути: `react/jsx-runtime`, `react-dom/client`,
  // `react-router/dom`. Роутер один на страницу (ADR-0007).
  shared: {
    react: { singleton: true },
    'react/': { singleton: true },
    'react-dom': { singleton: true },
    'react-dom/': { singleton: true },
    'react-router': { singleton: true },
    'react-router/': { singleton: true },
  },
};
