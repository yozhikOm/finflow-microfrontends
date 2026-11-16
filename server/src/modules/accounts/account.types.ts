import type { Currency, Money } from '../../money.js';

// Тип счёта — только ярлык для отображения, правила учёта от него не зависят
// (GLOSSARY.md). Список — источник enum схемы и проверки в модели Mongoose.
export const ACCOUNT_TYPES = [
  'CASH',
  'BANK_ACCOUNT',
  'CREDIT_CARD',
  'SAVINGS',
] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

// Вход мутации createAccount. Начальный остаток — в минимальных единицах
// валюты счёта, поэтому своей валюты у него нет и разойтись ей не с чем.
export interface CreateAccountInput {
  name: string;
  type: AccountType;
  currency: Currency;
  initialBalance: number;
}

// То, что хранится в MongoDB. Баланс не хранится: он вычисляется при
// запросе из начального остатка и транзакций счёта (ADR-0006).
export interface StoredAccount extends CreateAccountInput {
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Счёт, каким его отдаёт API.
export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: Currency;
  initialBalance: Money;
  archived: boolean;
  balance: Money;
  createdAt: Date;
  updatedAt: Date;
}
