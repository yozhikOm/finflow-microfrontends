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
  /**
   * Значение снаружи. Новое значение поле показывает, если оно расходится с
   * написанным. Текст, который не число, при сбросе в `amount: null` остаётся:
   * для него значение не меняется. Чтобы очистить форму целиком, смените ей `key`.
   */
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
  const [text, setText] = useState(() => valueToText(value));

  // Значение сменили снаружи, например сбросили форму или выбрали валюту:
  // поле показывает его, если оно не совпадает с тем, что уже написано.
  // Своё значение, вернувшееся через `onChange`, текст не трогает: иначе
  // «350,» превращалось бы в «350» на ходу.
  const [shown, setShown] = useState(value);
  if (value.amount !== shown.amount || value.currency !== shown.currency) {
    setShown(value);
    if (value.amount !== parseAmount(text, value.currency, allowNegative)) {
      setText(valueToText(value));
    }
  }

  const change = (nextText: string, currency: string) => {
    const next = {
      amount: parseAmount(nextText, currency, allowNegative),
      currency,
    };
    setText(nextText);
    setShown(next);
    onChange(next);
  };

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
        <span className={styles.currencyCode}>{value.currency}</span>
      )}
    </div>
  );
}

const valueToText = ({ amount, currency }: MoneyInputValue) =>
  amount === null ? '' : amountToText(amount, currency);
