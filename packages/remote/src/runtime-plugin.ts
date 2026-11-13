import { RetryPlugin } from '@module-federation/retry-plugin';

// Тип плагина берётся у retry-plugin: его объявления ссылаются на CJS-типы
// `@module-federation/runtime`, а импорт отсюда дал бы ESM-копию тех же типов,
// несовместимую с ними.
type RuntimePlugin = ReturnType<typeof RetryPlugin>;
type ErrorLoadRemoteArgs = Parameters<
  NonNullable<RuntimePlugin['errorLoadRemote']>
>[0];

/** Код ошибки Module Federation (`RUNTIME-003`…) из текста сбоя. */
function errorCode(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return /#([A-Z]+-\d+)/.exec(message)?.[1] ?? 'unknown';
}

/** Remote-приложение и модуль из id вида `accounts/AccountPicker`. */
function remoteAndModule({ id, remote, expose }: ErrorLoadRemoteArgs) {
  const slash = id.indexOf('/');
  const remoteName = remote?.name ?? (slash < 0 ? id : id.slice(0, slash));
  const module = expose ?? (slash < 0 ? '.' : `./${id.slice(slash + 1)}`);
  return { remoteName, module };
}

/**
 * Runtime-плагин потребителей remote-модулей (ADR-0010).
 *
 * - Сетевые сбои манифеста и `remoteEntry` повторяет `retry-plugin`: два раза
 *   с короткой паузой, без запасных доменов, ведь домен у приложения один.
 * - `errorLoadRemote` только пишет диагностику в консоль и ничего не
 *   возвращает. Любое truthy-значение подставилось бы вместо модуля, а так
 *   исходная ошибка доходит до `ErrorBoundary` обёртки.
 *
 * Подключается в `runtimePlugins` конфига Module Federation путём к
 * `@yozhikom/finflow-remote/runtime-plugin`.
 */
export default function finflowRemotePlugin(): RuntimePlugin {
  return {
    ...RetryPlugin({ retryTimes: 2, retryDelay: 500 }),
    name: 'finflow-remote',
    errorLoadRemote(args) {
      const { remoteName, module } = remoteAndModule(args);
      console.error(
        `[finflow-remote] Не удалось загрузить ${module} из ${remoteName}: ${errorCode(args.error)}`,
        args.error,
      );
      return undefined;
    },
  };
}
