import { formatMoney, type Money } from '../money';
import * as styles from './MoneyText.module.css';

export interface MoneyTextProps {
  /** Сумма в минимальных единицах валюты. */
  value: Money;
  /** Когда показывать знак, как `signDisplay` у `Intl.NumberFormat`. */
  signDisplay?: 'auto' | 'always' | 'exceptZero';
  /** Красить по знаку: плюс зелёным, минус красным. */
  colored?: boolean;
  className?: string;
}

/** Сумма для чтения в валюте суммы: 35050 RUB → «350,50 ₽». */
export function MoneyText({
  value,
  signDisplay = 'auto',
  colored = false,
  className,
}: MoneyTextProps) {
  const tone =
    colored && value.amount > 0
      ? styles.positive
      : colored && value.amount < 0
        ? styles.negative
        : undefined;
  return (
    <span className={[styles.money, tone, className].filter(Boolean).join(' ')}>
      {formatMoney(value, signDisplay)}
    </span>
  );
}
