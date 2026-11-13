import { Children, type HTMLAttributes, type ReactNode } from 'react';

import * as styles from './List.module.css';

export interface ListProps extends HTMLAttributes<HTMLUListElement> {
  /** Строки списка: `ListItem`. */
  children?: ReactNode;
  /** Текст вместо пустого списка: «Счетов пока нет». */
  emptyText?: ReactNode;
}

/** Список строк. Без строк показывает `emptyText`, если он задан. */
export function List({ children, emptyText, className, ...props }: ListProps) {
  if (emptyText !== undefined && Children.count(children) === 0) {
    return <p className={styles.empty}>{emptyText}</p>;
  }
  return (
    // `role` явно: без маркеров Safari перестаёт считать `<ul>` списком.
    <ul
      role="list"
      {...props}
      className={[styles.list, className].filter(Boolean).join(' ')}
    >
      {children}
    </ul>
  );
}
