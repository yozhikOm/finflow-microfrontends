export const mfConfig = {
  name: 'shell',
  remotes: {
    transactions: 'transactions@http://localhost:3001/transactions.js',
  },
  exposes: {},
  shared: ['react', 'react-dom'],
};
