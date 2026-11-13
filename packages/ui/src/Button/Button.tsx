import type { ButtonHTMLAttributes } from 'react';

import * as styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'md' | 'sm';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** `primary` — главное действие формы, `secondary` — остальные, `ghost` — действие в строке. */
  variant?: ButtonVariant;
  /** `sm` — для строки списка и компактного `ErrorState`. */
  size?: ButtonSize;
}

/** Кнопка. По умолчанию `type="button"`: отправку формы задают явно. */
export function Button({
  variant = 'secondary',
  size = 'md',
  type = 'button',
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={[styles.button, styles[variant], styles[size], className]
        .filter(Boolean)
        .join(' ')}
    />
  );
}
