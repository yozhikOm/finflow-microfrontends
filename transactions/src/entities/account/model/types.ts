type AccountType = 'cash' | 'bank' | 'creditCard' | 'savings';

type Currency = 'RUB' | 'USD' | 'EUR';

interface Money {
  amount: number;
  currency: Currency;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: Currency;
  initialBalance: Money;
}
