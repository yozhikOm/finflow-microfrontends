export const mfConfig = {
  name: "transactions",
  exposes: {
    "./Transactions": "./src/Transactions.tsx",
  },
  shared: ["react", "react-dom"],
};
