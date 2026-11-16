import {
  Component,
  Suspense,
  lazy,
  useEffect,
  useState,
  type ComponentType,
  type JSX,
  type LazyExoticComponent,
  type ReactNode,
} from 'react';

export interface RemoteFailureProps {
  /** Загрузить модуль снова, а если это уже не помогло — перезагрузить страницу. */
  retry: () => void;
}

export interface RemoteComponentOptions {
  /** Заглушка формы модуля без текста, пока он грузится. */
  loading: ReactNode;
  /** Что показать при сбое. */
  failure: (props: RemoteFailureProps) => ReactNode;
  /** Перезагрузка страницы, крайняя мера «Повторить». */
  reload?: () => void;
}

class ErrorBoundary extends Component<
  { fallback: () => ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback() : this.props.children;
  }
}

/** Вызывает `onCommit`, когда модуль отрисовался и попал на страницу. */
function Committed({ onCommit }: { onCommit: () => void }) {
  useEffect(onCommit);
  return null;
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

  let attemptCount = 0;
  const newAttempt = (): Attempt<P> => {
    const loadInTime = withTimeout(load);
    const attempt: Attempt<P> = {
      id: ++attemptCount,
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
  let sharedAttempt = newAttempt();

  /**
   * Попытка для места, которому не подошла `stale` (или для нового места).
   * Упавшую загрузку место не наследует. Свежую попытку могло уже начать
   * другое место, тогда она общая.
   */
  const attemptAfter = (stale?: Attempt<P>) => {
    if (sharedAttempt === stale || sharedAttempt.failed) {
      sharedAttempt = newAttempt();
    }
    return sharedAttempt;
  };

  return function RemoteComponent(props: P) {
    const [state, setState] = useState(() => ({
      attempt: attemptAfter(),
      retried: false,
    }));
    const { attempt, retried } = state;

    // Если повтор без перезагрузки уже был и не помог, перезагружаем страницу.
    const retry = () => {
      if (retried) reload();
      else setState({ attempt: attemptAfter(attempt), retried: true });
    };

    // Повтор помог: следующий сбой в этом месте снова начнётся с повтора.
    const settle = () => {
      if (retried) setState({ attempt, retried: false });
    };

    return (
      <ErrorBoundary key={attempt.id} fallback={() => failure({ retry })}>
        <Suspense fallback={loading}>
          <attempt.Lazy {...(props as P & JSX.IntrinsicAttributes)} />
          <Committed onCommit={settle} />
        </Suspense>
      </ErrorBoundary>
    );
  };
}
