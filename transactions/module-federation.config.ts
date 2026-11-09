export const mfConfig = {
  name: 'transactions',
  exposes: {
    './TransactionsPage': './src/pages/transactions/TransactionsPage.tsx',
  },
  // Ключ с завершающим `/` шарит подпути: `react/jsx-runtime`, `react-dom/client`.
  shared: {
    react: { singleton: true },
    'react/': { singleton: true },
    'react-dom': { singleton: true },
    'react-dom/': { singleton: true },
  },
};
