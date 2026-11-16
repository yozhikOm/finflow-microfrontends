import type { SelectHTMLAttributes } from 'react';

import { useFieldControl } from '../Field/fieldContext';
import * as styles from './Select.module.css';

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

/**
 * Выбор из списка на нативном `<select>`, варианты — дочерние `<option>`.
 * Внутри `Field` связывается с подписью и ошибкой.
 */
export function Select({ className, ...props }: SelectProps) {
  const control = useFieldControl(props);
  return (
    <select
      {...props}
      {...control}
      className={[styles.select, className].filter(Boolean).join(' ')}
    />
  );
}
