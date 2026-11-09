// Адрес remote-приложения задаётся при сборке, по умолчанию локальный (ADR-0009).
const transactionsUrl = (process.env.FINFLOW_TRANSACTIONS_URL || 'http://localhost:3001').replace(
  /\/+$/,
  '',
);

export const mfConfig = {
  name: 'shell',
  remotes: {
    transactions: `transactions@${transactionsUrl}/mf-manifest.json`,
  },
  exposes: {},
  // Ключ с завершающим `/` шарит подпути: `react/jsx-runtime`, `react-dom/client`.
  shared: {
    react: { singleton: true },
    'react/': { singleton: true },
    'react-dom': { singleton: true },
    'react-dom/': { singleton: true },
  },
};
