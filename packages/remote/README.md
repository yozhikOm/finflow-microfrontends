# @yozhikom/finflow-remote

Загрузка remote-модулей FinFlow и то, что видит пользователь при сбое (ADR-0010). Через пакет `shell` и `transactions` подключают модули соседей. Если модуль не загрузился, на его месте появляется рендер сбоя с «Повторить», а не белый экран.

О домене пакет не знает и `ui` не импортирует (ADR-0013). Заглушку загрузки и рендер сбоя передаёт потребитель.

## Runtime-плагин

```ts
// module-federation.config.ts
import { fileURLToPath } from 'node:url';

export const mfConfig = {
  // …
  shareStrategy: 'loaded-first',
  runtimePlugins: [
    fileURLToPath(
      import.meta.resolve('@yozhikom/finflow-remote/runtime-plugin'),
    ),
  ],
};
```

Путь должен быть абсолютным: Module Federation считает строку в `runtimePlugins` путём относительно каталога сборки, а не именем пакета.

Плагин делает две вещи:

- повторяет сетевые сбои манифеста и `remoteEntry` через `@module-federation/retry-plugin`: два повтора с паузой 0,5 секунды, без запасных доменов;
- в `errorLoadRemote` пишет в консоль remote-приложение, модуль и код ошибки Module Federation (`RUNTIME-003`…) и ничего не возвращает. Поэтому исходная ошибка доходит до обёртки.

## Обёртка

```tsx
import { remoteComponent } from '@yozhikom/finflow-remote';

const AccountPicker = remoteComponent(
  () =>
    import('accounts/AccountPicker').then((m) => ({
      default: m.AccountPicker,
    })),
  {
    loading: <FieldSkeleton />,
    failure: ({ retry }) => (
      <ErrorState text="Счета временно недоступны" onRetry={retry} />
    ),
  },
);

<AccountPicker value={accountId} onChange={setAccountId} />;
```

`remoteComponent` возвращает компонент с пропсами загруженного модуля. Создавайте его один раз на уровне модуля, а не в рендере: загрузка общая для всех мест, где он стоит.

- Пока модуль грузится, показывается `loading`: заглушка формы модуля без текста.
- Загрузка дольше 10 секунд, с учётом повторов плагина, — сбой.
- Сбой загрузки и ошибка рендера загруженного модуля дают один и тот же `failure`. Различие видно только в консоли.
- `retry` создаёт новый `lazy` и грузит модуль снова без перезагрузки страницы: `React.lazy` запоминает отклонённый промис, а Module Federation неудачную загрузку не кэширует.
- Если повтор без перезагрузки не помог, следующий `retry` перезагружает страницу.
- Если повтор помог, следующий сбой в этом месте снова начинается с повтора без перезагрузки.
- Место, которое появилось на странице после сбоя, пробует загрузить модуль заново.

Тип пропсов рендера сбоя — `RemoteFailureProps`. Опция `reload` подменяет перезагрузку страницы. По умолчанию это `window.location.reload()`, в тестах потребителя её можно заменить на `vi.fn()`.

## Какая версия нужна

- Новая опция или возможность — `feat`, минорная версия.
- Переименование или удаление экспорта или опции — `feat!`, мажорная версия.

## Первый выпуск

Пакет публикуется из workflow `release-please.yml` через trusted publishing, без `NPM_TOKEN` (ADR-0013). Trusted publisher на npmjs.com можно настроить только у пакета, который уже есть в реестре. Поэтому версию `1.0.0` публикуют один раз вручную:

1. Влить release PR пакета. Release-please создаст тег `remote-v1.0.0`. Job `publish` упадёт с ошибкой «ещё нет на npmjs»: так и должно быть.
2. Собрать и опубликовать сборку тега:

   ```sh
   git checkout remote-v1.0.0
   cd packages/remote
   npm ci && npm run typecheck && npm test && npm run build
   npm publish --access public
   ```

3. На npmjs.com в настройках пакета добавить trusted publisher: GitHub Actions, репозиторий `yozhikOm/finflow-microfrontends`, workflow `release-please.yml`. Имя файла должно совпадать точно.

Перезапускать упавший job не нужно: версия `1.0.0` уже опубликована. Следующие версии публикует workflow.
