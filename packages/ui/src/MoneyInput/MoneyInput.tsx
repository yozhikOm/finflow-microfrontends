import { useState, type InputHTMLAttributes } from 'react';

import { useFieldControl } from '../Field/fieldContext';
import { amountToText, parseAmount } from '../money';
import * as styles from './MoneyInput.module.css';

/**
 * Значение `MoneyInput`: `Money`, у которого `amount` — `null`, пока в поле
 * пусто или не число. `Money` приложения подходит сюда как есть.
 */
export interface MoneyInputValue {
  /** Минимальные единицы валюты: «350,50» RUB — 35050. */
  amount: number | null;
  /** Код ISO 4217. */
  currency: string;
}

export interface MoneyInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'defaultValue' | 'onChange' | 'type'
> {
  value: MoneyInputValue;
  onChange: (value: MoneyInputValue) => void;
  /** Из каких валют выбирать. С одной валютой выбора нет, код стоит рядом. */
  currencies: readonly string[];
  /** Разрешить минус, например для начального остатка кредитки. */
  allowNegative?: boolean;
  /** Подпись выбора валюты для экранного диктора. */
  currencyLabel?: string;
}

/**
 * Ввод суммы и выбор её валюты. Пользователь пишет сумму как привык
 * («1 200,50»), потребитель получает минимальные единицы.
 */
export function MoneyInput({
  value,
  onChange,
  currencies,
  allowNegative = false,
  currencyLabel = 'Валюта',
  className,
  disabled,
  ...props
}: MoneyInputProps) {
  const control = useFieldControl(props);
  const [text, setText] = useState(() =>
    value.amount === null ? '' : amountToText(value.amount, value.currency),
  );

  // Сумму сменили снаружи, например сбросили форму: поле показывает её,
  // если она не совпадает с тем, что в нём уже написано.
  const [shownAmount, setShownAmount] = useState(value.amount);
  if (value.amount !== shownAmount) {
    setShownAmount(value.amount);
    if (value.amount !== parseAmount(text, value.currency, allowNegative)) {
      setText(
        value.amount === null ? '' : amountToText(value.amount, value.currency),
      );
    }
  }

  const change = (nextText: string, currency: string) => {
    const amount = parseAmount(nextText, currency, allowNegative);
    setText(nextText);
    setShownAmount(amount);
    onChange({ amount, currency });
  };

  const [onlyCurrency] = currencies;
  return (
    <div className={[styles.moneyInput, className].filter(Boolean).join(' ')}>
      <input
        {...props}
        {...control}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        disabled={disabled}
        className={styles.amount}
        value={text}
        onChange={(event) => change(event.target.value, value.currency)}
      />
      {currencies.length > 1 ? (
        <select
          aria-label={currencyLabel}
          disabled={disabled}
          className={styles.currency}
          value={value.currency}
          onChange={(event) => change(text, event.target.value)}
        >
          {currencies.map((currency) => (
            <option key={currency} value={currency}>
              {currency}
            </option>
          ))}
        </select>
      ) : (
        <span className={styles.currencyCode}>
          {onlyCurrency ?? value.currency}
        </span>
      )}
    </div>
  );
}
