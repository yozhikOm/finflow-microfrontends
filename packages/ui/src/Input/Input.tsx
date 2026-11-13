import type { InputHTMLAttributes } from 'react';

import { useFieldControl } from '../Field/fieldContext';
import * as styles from './Input.module.css';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

/** Однострочное поле ввода. Внутри `Field` связывается с подписью и ошибкой. */
export function Input({ className, ...props }: InputProps) {
  const control = useFieldControl(props);
  return (
    <input
      type="text"
      {...props}
      {...control}
      className={[styles.input, className].filter(Boolean).join(' ')}
    />
  );
}
