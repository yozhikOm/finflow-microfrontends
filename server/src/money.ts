// Деньги (GLOSSARY.md): целое число минимальных единиц валюты вместе с
// валютой. Список валют объявлен один раз: из него строятся enum схемы,
// проверка `enum` в моделях Mongoose и тип ниже.
export const CURRENCIES = ['RUB', 'USD', 'EUR'] as const;

export type Currency = (typeof CURRENCIES)[number];

export interface Money {
  amount: number;
  currency: Currency;
}
