import {
  Component,
  Suspense,
  lazy,
  useState,
  type ComponentType,
  type JSX,
  type LazyExoticComponent,
  type ReactNode,
} from 'react';

export interface RemoteComponentOptions {
  /** Заглушка формы модуля без текста, пока он грузится. */
  loading: ReactNode;
  /** Что показать при сбое. */
  failure: (props: { retry: () => void }) => ReactNode;
  /** Перезагрузка страницы, крайняя мера «Повторить». */
  reload?: () => void;
}

class ErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Загрузка дольше этого, с учётом повторов retry-plugin, — сбой (ADR-0010). */
const LOAD_TIMEOUT_MS = 10_000;

class RemoteTimeoutError extends Error {
  constructor() {
    super(`Remote-модуль не загрузился за ${LOAD_TIMEOUT_MS / 1000} секунд`);
    this.name = 'RemoteTimeoutError';
  }
}

/** Загрузка, которая отклоняется, если модуль не пришёл за `LOAD_TIMEOUT_MS`. */
function withTimeout<T>(load: () => Promise<T>): () => Promise<T> {
  return () => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new RemoteTimeoutError()),
        LOAD_TIMEOUT_MS,
      );
    });
    return Promise.race([load(), timeout]).finally(() => clearTimeout(timer));
  };
}

/** Одна попытка загрузить модуль: свой `lazy` и номер для ключа. */
interface Attempt<P> {
  id: number;
  Lazy: LazyExoticComponent<ComponentType<P>>;
  /** Загрузка этой попытки отклонена. */
  failed: boolean;
}

export function remoteComponent<P extends object>(
  load: () => Promise<{ default: ComponentType<P> }>,
  options: RemoteComponentOptions,
): ComponentType<P> {
  const { loading, failure, reload = () => window.location.reload() } = options;

  let count = 0;
  const newAttempt = (): Attempt<P> => {
    const loadInTime = withTimeout(load);
    const attempt: Attempt<P> = {
      id: ++count,
      failed: false,
      Lazy: lazy(() =>
        loadInTime().catch((error: unknown) => {
          attempt.failed = true;
          throw error;
        }),
      ),
    };
    return attempt;
  };

  // Попытка общая для всех мест, где стоит компонент: модуль грузится один раз.
  // `lazy` кэширует и отклонённый промис, поэтому повтор — только новый `lazy`.
  let shared = newAttempt();

  /** Следующая попытка вместо `stale`. Её могло уже создать другое место. */
  const nextAttempt = (stale: Attempt<P>) => {
    if (shared === stale) shared = newAttempt();
    return shared;
  };

  /** Попытка для нового места: упавшую загрузку оно не наследует. */
  const currentAttempt = () => (shared.failed ? nextAttempt(shared) : shared);

  return function RemoteComponent(props: P) {
    const [state, setState] = useState(() => ({
      attempt: currentAttempt(),
      retried: false,
    }));
    const { attempt, retried } = state;

    // Если повтор без перезагрузки уже был и не помог, перезагружаем страницу.
    const retry = () => {
      if (retried) reload();
      else setState({ attempt: nextAttempt(attempt), retried: true });
    };

    return (
      <ErrorBoundary key={attempt.id} fallback={failure({ retry })}>
        <Suspense fallback={loading}>
          <attempt.Lazy {...(props as P & JSX.IntrinsicAttributes)} />
        </Suspense>
      </ErrorBoundary>
    );
  };
}
