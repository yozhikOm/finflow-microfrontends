
    export type RemoteKeys = 'transactions/TransactionsPage';
    type PackageType<T> = T extends 'transactions/TransactionsPage' ? typeof import('transactions/TransactionsPage') :any;