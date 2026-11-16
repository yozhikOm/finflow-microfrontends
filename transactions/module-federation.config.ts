export const mfConfig = {
  name: 'transactions',
  exposes: {
    // Раздел целиком: компонент без props со своими `<Routes>` (ADR-0008).
    './App': './src/App.tsx',
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
