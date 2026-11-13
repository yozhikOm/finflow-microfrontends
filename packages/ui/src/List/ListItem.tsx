import type { ReactNode } from 'react';

import * as styles from './List.module.css';

export interface ListItemProps {
  /** Главная строка: имя. */
  title: ReactNode;
  /** Вторая строка под именем, приглушённая. */
  description?: ReactNode;
  /** Значение справа, например `MoneyText`. */
  aside?: ReactNode;
  /** Действия строки справа, например `Button` `ghost` `sm`. */
  actions?: ReactNode;
  /** Под строкой во всю ширину, например компактный `ErrorState`. */
  children?: ReactNode;
  /** Приглушённая строка, например архивная запись. */
  muted?: boolean;
}

/** Строка списка: имя, описание, значение справа и действия. */
export function ListItem({
  title,
  description,
  aside,
  actions,
  children,
  muted = false,
}: ListItemProps) {
  return (
    <li
      className={[styles.item, muted && styles.muted].filter(Boolean).join(' ')}
    >
      <div className={styles.row}>
        <div className={styles.main}>
          <span className={styles.title}>{title}</span>
          {description !== undefined && (
            <span className={styles.description}>{description}</span>
          )}
        </div>
        {aside !== undefined && <div className={styles.aside}>{aside}</div>}
        {actions !== undefined && (
          <div className={styles.actions}>{actions}</div>
        )}
      </div>
      {children}
    </li>
  );
}
