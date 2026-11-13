/**
 * Сумма: целое число минимальных единиц валюты вместе с валютой, 350,50 ₽ —
 * это `{ amount: 35050, currency: 'RUB' }` (`GLOSSARY.md`). Тип структурный:
 * кит не знает типов GraphQL, а `Money` приложения подходит к нему как есть.
 */
export interface Money {
  amount: number;
  /** Код ISO 4217: `RUB`, `USD`, `EUR`. */
  currency: string;
}

const digitsCache = new Map<string, number>();

/** Сколько знаков после запятой у валюты: 2 у рубля, 0 у иены. */
export function fractionDigits(currency: string): number {
  let digits = digitsCache.get(currency);
  if (digits === undefined) {
    try {
      digits = new Intl.NumberFormat('en', {
        style: 'currency',
        currency,
      }).resolvedOptions().maximumFractionDigits;
    } catch {
      // Неизвестный код валюты.
    }
    // Как у большинства валют, если `Intl` не знает код.
    digits ??= 2;
    digitsCache.set(currency, digits);
  }
  return digits;
}

/** Сумма для чтения: «1 234,56 $». */
export function formatMoney(
  { amount, currency }: Money,
  signDisplay: 'auto' | 'always' | 'exceptZero' = 'auto',
): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    signDisplay,
  }).format(amount / 10 ** fractionDigits(currency));
}

/**
 * Разбирает ввод пользователя в минимальные единицы: «350,50» RUB → 35050.
 * Понимает запятую и точку, пробелы между разрядами и неполную дробную
 * часть («350,5»). Не число, лишние знаки после запятой и минус без
 * `allowNegative` дают `null`.
 */
export function parseAmount(
  text: string,
  currency: string,
  allowNegative: boolean,
): number | null {
  const normalized = text.replace(/\s/g, '').replace('−', '-');
  const match = /^(-)?(\d+)(?:[.,](\d*))?$/.exec(normalized);
  if (!match) return null;

  const [, minus, whole = '', fraction = ''] = match;
  const digits = fractionDigits(currency);
  if ((minus && !allowNegative) || fraction.length > digits) return null;

  const minor =
    Number(whole) * 10 ** digits + Number(fraction.padEnd(digits, '0') || 0);
  if (!Number.isSafeInteger(minor)) return null;
  return minus && minor !== 0 ? -minor : minor;
}

/** Текст поля для суммы: 120050 EUR → «1200,50», 35000 RUB → «350». */
export function amountToText(amount: number, currency: string): string {
  const digits = fractionDigits(currency);
  const scale = 10 ** digits;
  const absolute = Math.abs(amount);
  const whole = Math.floor(absolute / scale);
  const fraction = absolute % scale;
  const sign = amount < 0 ? '-' : '';
  return fraction === 0
    ? `${sign}${whole}`
    : `${sign}${whole},${String(fraction).padStart(digits, '0')}`;
}
