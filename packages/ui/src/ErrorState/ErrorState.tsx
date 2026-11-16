import { Button } from '../Button/Button';
import * as styles from './ErrorState.module.css';

export interface ErrorStateProps {
  /** Что недоступно или не получилось: «Счета временно недоступны». */
  text: string;
  /**
   * Повторить то, что не получилось. Без него кнопки нет. Имя совпадает с
   * `RemoteFailureProps` из `@yozhikom/finflow-remote`, поэтому рендер сбоя
   * кода пишется как `(props) => <ErrorState text="…" {...props} />`.
   */
  retry?: () => void;
  /** Текст кнопки повтора. */
  retryLabel?: string;
  /** Компактный вариант в одну строку: для строки списка и поля формы. */
  compact?: boolean;
}

/**
 * Сбой на месте блока, строки или поля. Об Apollo и Module Federation не
 * знает, поэтому сбой данных и сбой кода выглядят одинаково (ADR-0014).
 */
export function ErrorState({
  text,
  retry,
  retryLabel = 'Повторить',
  compact = false,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={[
        styles.errorState,
        compact ? styles.compact : styles.block,
      ].join(' ')}
    >
      <span className={styles.text}>{text}</span>
      {retry && (
        <Button size={compact ? 'sm' : 'md'} onClick={retry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
