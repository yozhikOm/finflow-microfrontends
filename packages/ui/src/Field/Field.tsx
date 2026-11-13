import { useId, useMemo, type ReactNode } from 'react';

import * as styles from './Field.module.css';
import { FieldContext } from './fieldContext';
import { FieldError } from './FieldError';

export interface FieldProps {
  /** Подпись поля. */
  label: ReactNode;
  /** Один элемент ввода кита: `Input`, `Select`, `MoneyInput`. */
  children: ReactNode;
  /** Текст ошибки у поля, например отказ `server` по правилу. */
  error?: ReactNode;
  /** Подсказка под полем. */
  hint?: ReactNode;
  className?: string;
}

/**
 * Поле формы: подпись, элемент ввода, подсказка и ошибка. Связывает их по
 * `id`, поэтому элемент ввода находится по подписи, а ошибка и подсказка
 * читаются как его описание.
 */
export function Field({ label, children, error, hint, className }: FieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const invalid = Boolean(error);

  const describedBy =
    [invalid && errorId, hint && hintId].filter(Boolean).join(' ') || undefined;
  const context = useMemo(
    () => ({ id, describedBy, invalid }),
    [id, describedBy, invalid],
  );

  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <FieldContext.Provider value={context}>{children}</FieldContext.Provider>
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {invalid && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}
