import type { HTMLAttributes } from 'react';

import * as styles from './Field.module.css';

/**
 * Текст ошибки у поля. Внутри `Field` его ставит сам `Field` по `error`.
 * Отдельно — для ошибки, которая относится не к одному полю, например
 * «Не удалось сохранить. Попробуйте ещё раз» у кнопки отправки (ADR-0014).
 */
export function FieldError({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      {...props}
      className={[styles.error, className].filter(Boolean).join(' ')}
    />
  );
}
