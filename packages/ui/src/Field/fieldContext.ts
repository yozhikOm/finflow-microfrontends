import { createContext, useContext } from 'react';

/** Что `Field` сообщает элементу ввода внутри себя. */
export interface FieldContextValue {
  /** `id` элемента ввода, на него ссылается подпись. */
  id: string;
  /** `id` ошибки и подсказки через пробел, если они есть. */
  describedBy: string | undefined;
  invalid: boolean;
}

export const FieldContext = createContext<FieldContextValue | null>(null);

interface ControlAria {
  id?: string | undefined;
  'aria-describedby'?: string | undefined;
  'aria-invalid'?:
    boolean | 'true' | 'false' | 'grammar' | 'spelling' | undefined;
}

/**
 * Атрибуты элемента ввода: свои `id` и `aria-*` из props, иначе — из `Field`
 * вокруг него. Без `Field` элемент работает сам по себе, подпись ему дают
 * через `aria-label`.
 */
export function useFieldControl(props: ControlAria) {
  const field = useContext(FieldContext);
  const describedBy = [field?.describedBy, props['aria-describedby']]
    .filter(Boolean)
    .join(' ');
  return {
    id: props.id ?? field?.id,
    'aria-describedby': describedBy || undefined,
    'aria-invalid': props['aria-invalid'] ?? (field?.invalid || undefined),
  };
}
