export const mfConfig = {
  name: "transactions",
  exposes: {
    "./TransactionsPage": "./src/pages/transactions/TransactionsPage.tsx",
  },
  shared: ["react", "react-dom"],
};
