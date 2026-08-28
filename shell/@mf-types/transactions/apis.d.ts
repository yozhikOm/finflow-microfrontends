
    export type RemoteKeys = 'transactions/Transactions';
    type PackageType<T> = T extends 'transactions/Transactions' ? typeof import('transactions/Transactions') :any;