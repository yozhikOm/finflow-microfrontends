# Module Federation 2.0 с Rspack: манифест, рантайм-регистрация, типы, версии

Исследование к тикету [#4](https://github.com/yozhikOm/finflow-microfrontends/issues/4) (карта [#3](https://github.com/yozhikOm/finflow-microfrontends/issues/3)). Дата: 2026-11-04.

Здесь собраны факты и компромиссы. Решений для проекта в документе нет.

Обозначения:

- **[проверено]** — утверждение взято из первоисточника по ссылке: документация, исходный код, changelog, npm registry.
- **[вывод]** — моё заключение из нескольких фактов. Перед тем как на него опираться, его стоит проверить сборкой.

Ссылки на документацию module-federation.io ведут на исходники страниц в репозитории `module-federation/core` (ветка `main`), потому что сайт собирается из них.

---

## 1. Актуальные версии и что стоит в репозитории

### 1.1 Что сейчас в FinFlow

| Пакет                                           | `package.json` | Установлено (`package-lock.json`) |
| ----------------------------------------------- | -------------- | --------------------------------- |
| `@module-federation/enhanced`                   | `^0.8.9`       | `0.8.12`                          |
| `@rspack/core`, `@rspack/cli`                   | `~1.2.0`       | `1.2.8`                           |
| `@rspack/plugin-react-refresh`                  | `~1.0.1`       | —                                 |
| `react`, `react-dom`                            | `^19.0.0`      | `19.2.8`                          |
| `@module-federation/runtime-core` (транзитивно) | —              | `0.6.20`                          |

**[проверено]** По `shell/package-lock.json` и `transactions/package-lock.json`. `@rspack/core@1.2.8` сам зависит от `@module-federation/runtime-tools@0.8.4` (`npm view @rspack/core@1.2.8 dependencies`).

### 1.2 Актуальные версии на 2026-11-04 (npm registry)

| Пакет                                                                                       | `latest`               | Прочее                            |
| ------------------------------------------------------------------------------------------- | ---------------------- | --------------------------------- |
| `@module-federation/enhanced` (и `runtime`, `dts-plugin`, `bridge-react`, `rsbuild-plugin`) | **2.9.3** (2026-11-03) | версии синхронны во всём монорепо |
| `@rspack/core`, `@rspack/cli`                                                               | **2.3.1** (2026-11-03) | `latest-v1` = **1.7.12**          |
| `@rspack/plugin-react-refresh`                                                              | **2.0.2**              | peer: `@rspack/core ^2.0.0`       |
| `@rsbuild/core`                                                                             | 2.3.1                  | `latest-v1` = 1.7.6               |
| `react`                                                                                     | 19.3.1                 |                                   |

**[проверено]** Источник: `npm view <pkg> dist-tags` и `npm view <pkg> time`.

Хронология релизов:

- **`@module-federation/enhanced`.** `0.8.0` вышел 2024-11, `0.9`…`0.24` шли с 2025-02 по 2026-02. `2.0.0` вышел 2026-02-06, за ним `2.1`…`2.9` (`2.9.0` — 2026-08-24). Версий `1.x` у пакета нет: после `0.24.1` сразу идёт `2.0.0`.
- **`@rspack/core`.** `1.2.0` вышел 2025-01, `1.3`…`1.7` — с 2025-03 по 2025-12. `2.0.0` вышел 2026-04-22, `2.3.0` — 2026-10-29.

Получается, что проект отстаёт на 16 минорных версий MF (`0.8` → `0.24`), одну мажорную (`0.24` → `2.0`) и ещё 9 минорных (`2.0` → `2.9`). По Rspack отставание такое: 5 минорных версий `1.x` и одна мажорная.

### 1.3 Совместимость пакетов

| Связка                                           | Факт                                                                                                      | Источник                                                                                                                                   |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `@module-federation/rspack@2.9.3` ↔ Rspack       | peer `@rspack/core: ^0.7.0 \|\| ^1.0.0 \|\| ^2.0.0-0`. MF 2.9 официально работает и с Rspack 1.x, и с 2.x | [проверено] `npm view @module-federation/rspack@2.9.3 peerDependencies`                                                                    |
| `@rspack/core@2.3.1` ↔ MF runtime                | `@module-federation/runtime-tools: ^0.24.1 \|\| ^2.0.0` — **optional** peer. С Rspack 2 нужен MF ≥ 0.24.1 | [проверено] `npm view @rspack/core@2.3.1 peerDependencies peerDependenciesMeta`                                                            |
| `@module-federation/enhanced@2.9.3` ↔ TypeScript | peer `typescript ^4.9 \|\| ^5 \|\| ^6 \|\| ^7` (optional). В `0.8.x` было `^4.9 \|\| ^5`                  | [проверено] npm registry; TS 7 поддержан в [v2.8.0](https://github.com/module-federation/core/releases/tag/v2.8.0)                         |
| `@module-federation/bridge-react@2.9.3` ↔ React  | peer `react >=16.9.0`. В документации заявлены React 16–19                                                | [проверено] npm; [Bridge Overview](https://github.com/module-federation/core/blob/main/apps/website-new/docs/en/guide/bridge/overview.mdx) |
| Rspack 2 ↔ Node.js                               | `engines.node: ^20.19.0 \|\| >=22.12.0`                                                                   | [проверено] npm; [Rspack: Upgrading from v1 to v2](https://rspack.rs/guide/migration/rspack_1.x)                                           |

---

## 2. Что такое «MF 2.0» и как он связан с Rspack

- **«MF 2.0» как набор возможностей** — это `@module-federation/enhanced` поверх встроенного в Rspack MF v1.5. Rspack различает три варианта. MF v2.0 ставится отдельным пакетом `@module-federation/enhanced` и импортируется из `@module-federation/enhanced/rspack`. MF v1.5 встроен в Rspack (`rspack.container.ModuleFederationPlugin`). MF v1.0 перенесён из webpack и больше не развивается. **[проверено]** [Rspack: Module Federation](https://rspack.rs/guide/advanced/module-federation). FinFlow уже использует вариант v2.0: `shell/rspack.config.ts` импортирует `@module-federation/enhanced/rspack`.
- **Плагин `enhanced` для Rspack — обёртка.** Он подключает `DtsPlugin` (типы) и `StatsPlugin` (манифест), а затем вызывает встроенный `compiler.webpack.container.ModuleFederationPlugin` из Rspack. **[проверено]** [packages/rspack/src/ModuleFederationPlugin.ts](https://github.com/module-federation/core/blob/main/packages/rspack/src/ModuleFederationPlugin.ts).
- **«MF 2.0 stable» и npm-версия `2.0.0`** вышли в феврале 2026. Авторы пишут, что «this upgrade contains no breaking changes». Перечислены только два минорных изменения: `library.type` по умолчанию сменился с `var` на `global`, а `runtimePlugins` теперь принимают параметры. **[проверено]** [blog: MF 2.0 Stable Release](https://github.com/module-federation/core/blob/main/apps/website-new/docs/en/blog/v2-stable-version.mdx); [release v2.0.1](https://github.com/module-federation/core/releases/tag/v2.0.1). В changelog `@module-federation/rspack` у `2.0.0` записано единственное major-изменение — «upgrade to modern js 3.0». **[проверено]** [packages/rspack/CHANGELOG.md](https://github.com/module-federation/core/blob/main/packages/rspack/CHANGELOG.md).
  - **[вывод]** Смена `library.type` на `global` в исходниках видна только в webpack-ветке (`packages/enhanced/src/lib/container/ContainerPlugin.ts`) и в плагине Modern.js v3. Rspack-обёртка передаёт опции во встроенный плагин Rspack, и явной подмены `library` там не видно. На проекте с Rspack это изменение, скорее всего, незаметно. Проверить можно по полю `metaData.remoteEntry.type` в собранном `mf-manifest.json`. В документации [library](https://github.com/module-federation/core/blob/main/apps/website-new/docs/en/configure/library.mdx) значение по умолчанию до сих пор указано как `'var'`.
- **Что входит в MF 2.0 по заявлению авторов:** tree shaking для `shared`, SSR (через Modern.js), генерация манифеста на Rust, `asyncStartup` на Rust, Side Effect Scanner, расширение Chrome DevTools, поддержка Node.js, Rstest. **[проверено]** blog выше. Tree shaking для `shared` в Rspack появился в версии 2.0. **[проверено]** [Rspack 2.0 blog](https://rspack.rs/blog/announcing-2-0#mf-share-treeshaking).

---

## 3. Манифест (`mf-manifest.json`) против `remoteEntry.js`

### 3.1 Что это

- `remoteEntry.js` — это сам контейнер remote-приложения: JS, который регистрирует глобал с `get`/`init`. Его хватает, чтобы загрузить модули. **[проверено]** [Manifest and Snapshot](https://github.com/module-federation/core/blob/main/apps/website-new/docs/en/guide/basic/manifest-snapshot.mdx), [RUNTIME-001/002](https://github.com/module-federation/core/blob/main/apps/website-new/docs/en/guide/troubleshooting/runtime.mdx).
- `mf-manifest.json` — JSON, который producer выпускает при сборке. В нём описано, что remote экспортирует (`exposes` и их JS/CSS-ассеты), где лежит `remoteEntry` и какого он типа, какие у него `shared` (имя, версия, `singleton`, `requiredVersion`, ассеты), где лежат файлы типов (`metaData.types.zip` / `api`) и какой у него `publicPath` или `getPublicPath`. Документация называет манифест «runtime instruction file», а не просто адресом входа. **[проверено]** [Manifest and Snapshot](https://github.com/module-federation/core/blob/main/apps/website-new/docs/en/guide/basic/manifest-snapshot.mdx), [Manifest Field Reference](https://github.com/module-federation/core/blob/main/apps/website-new/docs/en/guide/advanced/manifest-fields.mdx).
- Рядом с манифестом генерируется `mf-stats.json` — полная статистика для инструментов. Консьюмеру нужен только манифест. **[проверено]** там же.
- **Snapshot** — это манифест, преобразованный рантаймом в удобную для него форму. Без deployment-сервиса цепочка такая: хост запрашивает `mf-manifest.json`, рантайм строит snapshot, затем грузит `remoteEntry`, exposes, shared и preload. Deployment-сервис может отдавать готовый snapshot и сэкономить хосту один запрос. **[проверено]** там же.

### 3.2 Что даёт манифест сверх `remoteEntry.js`

Если `remotes` указывают на манифест, появляются:

- динамические подсказки типов;
- предзагрузка ресурсов (JS/CSS) у exposes и shared;
- Chrome DevTools (граф модулей, панель Shared, проксирование remote на локальную сборку);
- более точная диагностика: видно, на каком шаге сломалась загрузка — манифест, snapshot, `remoteEntry` или expose. Для этого есть коды `RUNTIME-003` (манифест не загрузился), `RUNTIME-013` (невалидный манифест), `RUNTIME-014` (нет такого expose).

**[проверено]** [configure/remotes](https://github.com/module-federation/core/blob/main/apps/website-new/docs/en/configure/remotes.mdx), [Manifest and Snapshot](https://github.com/module-federation/core/blob/main/apps/website-new/docs/en/guide/basic/manifest-snapshot.mdx), [troubleshooting/runtime](https://github.com/module-federation/core/blob/main/apps/website-new/docs/en/guide/troubleshooting/runtime.mdx).

Цена манифеста:

- Лишний сетевой запрос перед `remoteEntry`, если snapshot не приходит с сервера. **[проверено]** Manifest and Snapshot.
- `publicPath` producer'а должен быть абсолютным или вычисляемым: манифест хранит `publicPath`/`getPublicPath`, по которым хост ищет ассеты. **[вывод]** Поэтому в шаблонном `rspack.config.ts` FinFlow стоит комментарий «publicPath must be configured if using manifest» и жёстко прописан `http://localhost:300x/`. Для реального развёртывания каждого remote отдельно нужно решить, откуда брать `publicPath`. Варианты — значение на этапе сборки или `getPublicPath` (строка-функция, которая выполняется через `new Function` у консьюмера) **[проверено]** [configure/getpublicpath](https://github.com/module-federation/core/blob/main/apps/website-new/docs/en/configure/getpublicpath.mdx).
- `experiments.optimization.disableSnapshot: true` уменьшает рантайм, но отключает протокол манифеста. Вместе с ним пропадают синхронизация типов, HMR федеративных модулей, preload и DevTools. **[проверено]** [configure/experiments](https://github.com/module-federation/core/blob/main/apps/website-new/docs/en/configure/experiments.mdx).

### 3.3 Генерация манифеста в Rspack

- В обёртке `@module-federation/enhanced/rspack` манифест включён по умолчанию. Его отключает только `manifest: false`. Сам манифест (`StatsPlugin`) генерируется и у хоста, и у remote. **[проверено]** [packages/rspack/src/ModuleFederationPlugin.ts](https://github.com/module-federation/core/blob/main/packages/rspack/src/ModuleFederationPlugin.ts): `let disableManifest = options.manifest === false`. На странице [configure/manifest](https://github.com/module-federation/core/blob/main/apps/website-new/docs/en/configure/manifest.mdx) значение по умолчанию указано как `undefined`. По коду `undefined` означает «включено».
- Во встроенном Rspack-плагине опция `manifest` есть с версии 1.6.1. **[проверено]** [Rspack: ModuleFederationPlugin](https://rspack.rs/plugins/module-federation-plugin#manifest). В блоге MF 2.0 сказано, что генерация манифеста переписана на Rust. **[проверено]**
- Опции: `fileName` (по умолчанию `mf-manifest.json`; stats-файл получает суффикс `-stats`), `filePath`, `disableAssetsAnalyze`. Последняя убирает из манифеста `shared`/`exposes` и ломает preload. **[проверено]** configure/manifest.
- В FAQ Rspack есть известная проблема: «Multiple assets emit different content to the same filename mf-manifest.json» лечится обновлением `@module-federation/*` до ≥ 0.21.0. **[проверено]** [Rspack: ModuleFederationPlugin FAQ](https://rspack.rs/plugins/module-federation-plugin#faq).
- **[вывод]** Сейчас `shell` ссылается на `transactions@http://localhost:3001/transactions.js`, то есть на JS-вход. Возможности из 3.2 FinFlow сейчас не использует, хотя `transactions` манифест, скорее всего, уже генерирует.

---

## 4. Регистрация remote в рантайме

### 4.1 Два способа, которые можно сочетать

Документация описывает два способа: объявить remotes в плагине сборки (`module-federation.config.ts`) или зарегистрировать их через runtime API. Они не конфликтуют. **[проверено]** [guide/runtime/index](https://github.com/module-federation/core/blob/main/apps/website-new/docs/en/guide/runtime/index.mdx).

Сравнение из документации:

| Регистрация в рантайме                              | Регистрация в плагине                 |
| --------------------------------------------------- | ------------------------------------- |
| Можно добавлять remotes динамически                 | Динамической регистрации нет          |
| Нельзя `import 'remote/x'`, только `loadRemote()`   | Работают и `import`, и `loadRemote()` |
| Для `shared` нужно явно передать версию и экземпляр | Для `shared` достаточно правил        |
| `shared` работает только в одну сторону             | `shared` работает в обе стороны       |
| **Подсказок типов для remote нет**                  | **Подсказки типов есть**              |
| Влиять на загрузку можно через runtime plugins      | —                                     |

**[проверено]** там же. В той же таблице сказано «не поддерживает plugin» для плагинного способа. При этом опция `runtimePlugins` в плагине сборки существует ([configure/runtimeplugins](https://github.com/module-federation/core/blob/main/apps/website-new/docs/en/configure/runtimeplugins.mdx)), так что эта строка таблицы, судя по всему, устарела. **[вывод]**

### 4.2 API (текущий, `@module-federation/enhanced/runtime`)

- **`registerRemotes(remotes, { force? })`** — добавляет remotes в экземпляр по умолчанию, который создал плагин сборки. Элемент: `{ name, entry }` или `{ name, version }` плюс необязательные `alias`, `shareScope`, `type`, `entryGlobalName`. `entry` может указывать на `mf-manifest.json` или на `remoteEntry.js`. `force: true` перезаписывает уже загруженный remote и сбрасывает его кэш; в консоль при этом выводится предупреждение о риске. **[проверено]** [Runtime API: registerRemotes](https://github.com/module-federation/core/blob/main/apps/website-new/docs/en/guide/runtime/runtime-api.mdx). В v2.6.0 исправили баг: после принудительной перерегистрации манифест не запрашивался заново ([v2.6.0](https://github.com/module-federation/core/releases/tag/v2.6.0)). **[проверено]**
- **`loadRemote('name/expose')`** или **`loadRemote('alias/expose')`** возвращает Promise с модулем. Документация показывает его вместе с `React.lazy` и `Suspense`. **[проверено]**
- **`createInstance(options)`** создаёт новый изолированный экземпляр; экземпляр по умолчанию он не заменяет. Это нужно для чистого рантайма без плагина сборки или для нескольких экземпляров. **`getInstance()`** возвращает экземпляр по умолчанию, а без плагина сборки бросает исключение. **[проверено]** Runtime API.
- **`init(options)`** помечен «Use with caution» и **deprecated**. `createInstance` добавили, а `init` объявили устаревшим в `@module-federation/runtime@0.17.0`. Миграция: с плагином сборки — `getInstance()` плюс `registerRemotes`/`registerShared`/`registerPlugins`; без плагина — `createInstance`. **[проверено]** Runtime API; [packages/runtime/CHANGELOG.md](https://github.com/module-federation/core/blob/main/packages/runtime/CHANGELOG.md) (0.17.0: «add createInstance api and deprecate init», «rename FederationHost to ModuleFederation»).
- Рекомендованная точка импорта — `@module-federation/enhanced/runtime`. Плагин подменяет `@module-federation/runtime$` алиасом на свою реализацию, поэтому плагин и ручные вызовы работают с одним экземпляром. **[проверено]** guide/runtime/index; исходник Rspack-плагина (`PatchAliasWebpackPlugin`).
- **[вывод]** В `0.8.x` основным API был `init`, а `createInstance` ещё не было. Код, написанный по старым статьям и примерам, при обновлении придётся переписать.

### 4.3 Устойчивость к падению remote (касается и ADR-0001)

- `shareStrategy: 'version-first'` (значение по умолчанию) **при инициализации загружает `remoteEntry` всех remotes**, чтобы собрать версии shared. Если какой-то remote недоступен, срабатывает `errorLoadRemote` с `lifecycle: 'beforeLoadShare'`. Без обработчика старт приложения может зависнуть или упасть. `'loaded-first'` загружает remotes лениво, и недоступный remote ломает только обращение к нему самому. **[проверено]** [configure/shareStrategy](https://github.com/module-federation/core/blob/main/apps/website-new/docs/en/configure/shareStrategy.mdx); [Rspack: shareStrategy](https://rspack.rs/plugins/module-federation-plugin#sharestrategy).
- Документация рекомендует обрабатывать ошибки на трёх уровнях: `@module-federation/retry-plugin` (сеть), runtime-хук `errorLoadRemote` (загрузка), React error boundary (рендер). **[проверено]** [blog: Error handling for remote module rendering](https://github.com/module-federation/core/blob/main/apps/website-new/docs/en/blog/error-load-remote.mdx).
- В `@module-federation/bridge-react` есть `createLazyComponent` (нужен `lazyLoadComponentPlugin`) со встроенными `Suspense`, error boundary и `fallback({ error, errorType })`, а также `createRemoteAppComponent`/`createBridgeComponent` для загрузки целого приложения с собственным React-корнем и роутингом. **[проверено]** [bridge/overview](https://github.com/module-federation/core/blob/main/apps/website-new/docs/en/guide/bridge/overview.mdx), [bridge/react/load-component](https://github.com/module-federation/core/blob/main/apps/website-new/docs/en/guide/bridge/react/load-component.mdx).
- Плагин Rspack сам включает `ReactBridgePlugin`, если находит `@module-federation/bridge-react` в зависимостях. Включением управляет `bridge.enableBridgeRouter`. **[проверено]** исходник Rspack-плагина.
- Начиная с v2.5.0 в рантайме есть opt-in observability plugin с диагностикой (`diagnosis.facts`/`actions`). **[проверено]** [packages/runtime/CHANGELOG.md](https://github.com/module-federation/core/blob/main/packages/runtime/CHANGELOG.md), troubleshooting/runtime.

---

## 5. Типы через границу (`@mf-types`)

### 5.1 Как работает

- Опция `dts` включена по умолчанию (`true`). Producer при сборке компилирует свои `exposes` через `tsc` и выпускает `@mf-types.zip` и `@mf-types.d.ts` (типы для `loadRemote`). Консьюмер скачивает zip каждого remote и распаковывает его в `./@mf-types`. **[проверено]** [configure/dts](https://github.com/module-federation/core/blob/main/apps/website-new/docs/en/configure/dts.mdx), [guide/basic/type-prompt](https://github.com/module-federation/core/blob/main/apps/website-new/docs/en/guide/basic/type-prompt.mdx).
- Консьюмеру нужен `tsconfig.json` с `"paths": { "*": ["./@mf-types/*"] }`. Для типизированного `loadRemote` в `include` добавляют `./@mf-types/*`. Порядок запуска producer и консьюмера не важен. **[проверено]** type-prompt. В FinFlow `shell/tsconfig.json` уже содержит этот `paths`, но `include` — только `["src"]`.
- В dev-режиме работает горячая перезагрузка типов: консьюмер подтягивает новые типы, когда producer меняется. Отключается через `dev.disableHotTypesReload` и `dev.disableDynamicRemoteTypeHints`. **[проверено]** [configure/dev](https://github.com/module-federation/core/blob/main/apps/website-new/docs/en/configure/dev.mdx).
- **В production (`NODE_ENV=production`) консьюмер типы по умолчанию не скачивает.** Это включает `dts.consumeTypes.typesOnBuild: true`. **[проверено]** configure/dts.
- Откуда берётся адрес архива типов. Если remote подключён через манифест, адрес берётся из `metaData.types` (`zip`, `api`). Если через `remoteEntry.js`, имя JS-файла заменяется на `@mf-types.zip`. Когда типы лежат в другом месте, задают `consumeTypes.remoteTypeUrls` (объект или async-функцию). **[проверено]** configure/dts; [mf-manifest-stats-common](https://github.com/module-federation/core/blob/main/apps/website-new/docs/en/_components/configure/mf-manifest-stats-common.mdx).
- Remotes, которые зарегистрированы только в рантайме (`registerRemotes`), подсказок типов не получают: см. таблицу в 4.1. Обойти это можно через `remoteTypeUrls`. **[проверено]** guide/runtime/index; configure/dts (сценарий «Only the runtime API is used…»).

### 5.2 Полезные опции и подводные камни

- `generateTypes`: `extractThirdParty` (если в типах exposes есть сторонние пакеты, которых нет у консьюмера), `extractRemoteTypes` (если remote реэкспортирует свои remotes), `abortOnError` (по умолчанию `false`, то есть ошибки типов не ломают сборку), `compilerInstance: 'tsc' | 'tsgo' | 'vue-tsc' | 'tspc'`, `outputDir` (с v2.2.0), `afterGenerate` (с v2.3.0). **[проверено]** configure/dts; релизы [v2.2.0](https://github.com/module-federation/core/releases/tag/v2.2.0) и [v2.3.0](https://github.com/module-federation/core/releases/tag/v2.3.0).
- `TYPE-001` означает, что exposes не скомпилировались с `tsconfig` producer'а. Ключ и значение в `exposes` должны начинаться с `./`; ошибки проверки типов можно игнорировать через `compilerOptions.noCheck` (TS 5.5+). Если в сгенерированных типах остались path-алиасы, нужны `typescript-transform-paths` и `ts-patch` (`compilerInstance: 'tspc'`). **[проверено]** [troubleshooting/type](https://github.com/module-federation/core/blob/main/apps/website-new/docs/en/guide/troubleshooting/type.mdx).
- Бесконечная пересборка лечится добавлением `**/@mf-types/**` в `watchOptions.ignored`. **[проверено]** type-prompt (FAQ).
- Для отладки генерации: `FEDERATION_DEBUG=true`, `dts.displayErrorInTerminal`, лог `.mf/typesGenerate.log`. **[проверено]** type-prompt.
- Исправления в dts-plugin, которые произошли после `0.8.x` и касаются Windows (разработка FinFlow идёт на Windows): «fix Windows type generation» в [v2.0.1](https://github.com/module-federation/core/releases/tag/v2.0.1), «Fix Windows manifest type URL resolution» в `2.5.1` ([dts-plugin CHANGELOG](https://github.com/module-federation/core/blob/main/packages/dts-plugin/CHANGELOG.md)). **[проверено]**
- Dev-сервер типов в v2.1.0 переписан с Koa на нативный HTTP. **[проверено]** [v2.1.0](https://github.com/module-federation/core/releases/tag/v2.1.0).
- **Факт о репозитории.** `shell/@mf-types/**` (`index.d.ts`, `transactions/TransactionsPage.d.ts`, `apis.d.ts`, `compiled-types/...`) **закоммичен в git** (`git ls-files shell/@mf-types`). **[вывод]** Это артефакт, который генерируется на машине разработчика. Если его не обновлять, он расходится с реальным remote. Если его не коммитить, `tsc --noEmit` в CI не найдёт типов `transactions/*`: в CI remote не запущен, а в production-режиме типы не качаются (см. `typesOnBuild`).

---

## 6. `shared` и синглтоны

### 6.1 Настройки

`shared` принимает массив имён или объект `{ [pkg]: SharedConfig }`. Поля `SharedConfig`: `singleton`, `requiredVersion`, `eager`, `shareScope`, `import`, `shareKey`, `request`, `allowNodeModulesSuffixMatch`, `treeShaking`. **[проверено]** [configure/shared](https://github.com/module-federation/core/blob/main/apps/website-new/docs/en/configure/shared.mdx). Вдобавок рантайм понимает `strictVersion` (`false` по умолчанию). **[проверено]** [runtime-core/src/utils/share.ts](https://github.com/module-federation/core/blob/main/packages/runtime-core/src/utils/share.ts). Эта опция упоминается в RUNTIME-015, но в списке полей на странице configure/shared её нет.

- `singleton` (по умолчанию `false`) оставляет в share scope одну версию пакета.
- `requiredVersion` по умолчанию берётся из `package.json` приложения. В рантайме, если версия не передана, используется `^${version}`. **[проверено]** configure/shared; share.ts.
- `eager: true` кладёт пакет в стартовый чанк. Иначе нужен асинхронный вход: `import('./bootstrap')`, как в FinFlow (`shell/src/index.ts` — `import('./App')`), или `experiments.asyncStartup`. Без этого получаем `RUNTIME-005`. **[проверено]** configure/shared; troubleshooting/runtime (RUNTIME-005); [configure/experiments](https://github.com/module-federation/core/blob/main/apps/website-new/docs/en/configure/experiments.mdx) (`asyncStartup` по умолчанию `false`; когда включён, ручной `import('./bootstrap')` не нужен). Опция `asyncStartup` пришла на смену `federationRuntime` в `enhanced@0.11.0`. **[проверено]** [enhanced CHANGELOG](https://github.com/module-federation/core/blob/main/packages/enhanced/CHANGELOG.md).
- `import: false` означает «не класть пакет в свою сборку, брать у хоста». Если хост его не дал, получаем `RUNTIME-012`. **[проверено]** troubleshooting/runtime.
- `shareScope` позволяет держать несколько пулов: например, React в `default`, а дизайн-систему в отдельном scope. **[проверено]** configure/remotes, configure/shared; [multiple-shared-scope](https://github.com/module-federation/core/blob/main/apps/website-new/docs/en/guide/advanced/multiple-shared-scope.mdx).
- `include`/`exclude` (фильтры по версии и request) появились в `enhanced@0.18.0`. `nodeModulesReconstructedLookup` переименован в `allowNodeModulesSuffixMatch` в `0.20.0`. **[проверено]** enhanced CHANGELOG.

### 6.2 Подпути: `react-dom/client`, `react/jsx-runtime`

Ключ `'react-dom'` перехватывает только `import 'react-dom'`. Импорты вида `react-dom/client` и `react/jsx-runtime` **не участвуют в шаринге**: они попадают в бандл и грузят вторую копию. Документация называет это причиной ошибок «Invalid hook call» и hydration. Решение — ключ с завершающим слэшем, который включает сопоставление по префиксу: `'react/'`, `'react-dom/'`. **[проверено]** configure/shared («Prefix matching with trailing slash»); troubleshooting/runtime («Subpath imports are not shared»). Документацию об этом дополнили в [v2.6.0](https://github.com/module-federation/core/releases/tag/v2.6.0).

**[вывод]** В FinFlow `shared: ['react', 'react-dom']`, при этом `shell/src/App.tsx` импортирует `react-dom/client`, а SWC с `runtime: 'automatic'` генерирует импорты `react/jsx-runtime` (или `jsx-dev-runtime`). По документации эти подпути сейчас в shared не попадают. Проверить можно через DevTools MF (панель Shared) или в Network.

### 6.3 Что происходит при несовпадении версий

Ниже — поведение рантайма по исходнику `runtime-core/src/utils/share.ts` (функция поиска shared).

| Конфигурация                                            | Версия в scope не удовлетворяет `requiredVersion`                                                                                                                                            | Источник                                                                                                                          |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `singleton: true`, `strictVersion` не задан или `false` | Берётся выбранная версия, в консоли **warning**: «Version X from … of shared singleton module … does not satisfy the requirement of … which needs …». Код продолжает работать с этой версией | [проверено] share.ts (`warn(msg)`)                                                                                                |
| `singleton: true`, `strictVersion: true`                | **Исключение** (`error()` бросает `Error`)                                                                                                                                                   | [проверено] share.ts + [logger.ts](https://github.com/module-federation/core/blob/main/packages/runtime-core/src/utils/logger.ts) |
| `singleton: false`                                      | Ищется другая версия из scope, которая удовлетворяет диапазону. Если такой нет, используется своя локальная копия (fallback) — **в странице окажутся две копии**                             | [проверено] share.ts; configure/shared («each side will load its own dependencies»)                                               |
| `requiredVersion: false` или `'*'`                      | Берётся любая версия                                                                                                                                                                         | [проверено] share.ts                                                                                                              |

Какая версия выбирается:

- `shareStrategy: 'version-first'` (по умолчанию) выбирает **самую высокую** версию среди зарегистрированных. Ради этого при старте загружаются `remoteEntry` всех remotes.
- `'loaded-first'` берёт уже загруженную версию. **[проверено]** configure/shareStrategy; share.ts (`findSingletonVersionOrderByVersion` / `…ByLoaded`).

Документация также говорит: «if one party sets `requiredVersion` and the other sets `singleton`, the dependency with `requiredVersion` will be loaded». **[проверено]** configure/shared.

Последствия для React:

- Если у React не включён `singleton`, а версии в хосте и remote различаются так, что ни одна не удовлетворяет `^` другой (`18` против `19`), загрузятся две копии React. Документация говорит, что тогда хуки падают с «Invalid hook call» / «Cannot read properties of null (reading 'useState')». **[проверено]** troubleshooting/runtime.
- **[вывод]** С `singleton: true` хост на `19.2` и remote на `19.3` получат одну копию — самую высокую по `version-first` — и обойдутся предупреждением. Хост на `19` и remote на `18` тоже получат одну копию, но с предупреждением о несоответствии; работоспособность в этом случае гарантирует уже совместимость API React, а не MF.
- Когда remote не загрузился на этапе инициализации shared (`version-first`), получаем `RUNTIME-015` (ошибка `init` контейнера). Документация советует сверить `shareScope`, `singleton`, `strictVersion`, `requiredVersion` и `eager` у хоста и remote. **[проверено]** troubleshooting/runtime.

### 6.4 Tree shaking для `shared` (новое в MF 2.0 и Rspack 2.0)

`shared[pkg].treeShaking = { mode: 'runtime-infer' | 'server-calc', usedExports?: string[] }`. Режим `runtime-infer` берёт урезанную сборку у producer, если её `usedExports` покрывают потребности консьюмера. Иначе используется своя копия, а в крайнем случае полный пакет. Rspack — рекомендуемый бандлер для этой функции. **[проверено]** configure/shared; [Rspack 2.0 blog](https://rspack.rs/blog/announcing-2-0#mf-share-treeshaking). **[вывод]** Для React-синглтона это вряд ли пригодится: React не тришейкается по экспортам. Функция полезнее для UI-кита или утилит.

---

## 7. Что меняется при обновлении

### 7.1 `@module-federation/enhanced` `0.8.x` → `2.9.x`

Список собран по changelog пакетов (`enhanced`, `runtime`, `runtime-core`, `sdk`, `dts-plugin`, `manifest`) после `0.8.12`. **[проверено]**: [enhanced](https://github.com/module-federation/core/blob/main/packages/enhanced/CHANGELOG.md), [runtime](https://github.com/module-federation/core/blob/main/packages/runtime/CHANGELOG.md), [runtime-core](https://github.com/module-federation/core/blob/main/packages/runtime-core/CHANGELOG.md), [sdk](https://github.com/module-federation/core/blob/main/packages/sdk/CHANGELOG.md), [releases](https://github.com/module-federation/core/releases).

| Версия    | Изменение                                                                                                                                                                                                  | Касается FinFlow?                                                          |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 0.11.0    | `experiments.federationRuntime` убран, вместо него `experiments.asyncStartup`                                                                                                                              | [вывод] Нет: опция не используется                                         |
| 0.12.0    | Пакеты по умолчанию стали ESM; поддержка layers и нескольких share scope; `request` в shared                                                                                                               | [вывод] Косвенно                                                           |
| 0.14.0    | `experiments.optimization` (`disableSnapshot`, `target`)                                                                                                                                                   | Нет (опционально)                                                          |
| 0.17.0    | **`createInstance`, `init` deprecated**; `FederationHost` → `ModuleFederation`; `FederationRuntimePlugin` → `ModuleFederationRuntimePlugin`                                                                | Да, если писать runtime-код или runtime-плагины                            |
| 0.18.0    | `include`/`exclude` для shared                                                                                                                                                                             | Нет (опционально)                                                          |
| 0.20.0    | `nodeModulesReconstructedLookup` → `allowNodeModulesSuffixMatch`; в runtime убран synthetic default import                                                                                                 | [вывод] Проверить, как импортируется `@module-federation/enhanced/runtime` |
| 0.21.0    | Rspack FAQ: начиная с этой версии исправлен конфликт `mf-manifest.json`                                                                                                                                    | [проверено] Rspack FAQ                                                     |
| 0.23.0    | runtime-core умеет загружать манифест в Node                                                                                                                                                               | Нет                                                                        |
| 0.24.0    | Node 20 в тулчейне; peer-зависимости подготовлены под Rspack и Rsbuild v2                                                                                                                                  | Да, при переходе на Rspack 2                                               |
| **2.0.0** | «MF 2.0 stable». Заявлено «no breaking changes»; `library.type` по умолчанию `var` → `global` (см. раздел 2), параметры у `runtimePlugins`; у `@module-federation/rspack` major «upgrade to modern js 3.0» | [вывод] Для Rspack-проекта без Modern.js ломающих изменений не ожидается   |
| 2.1.0     | Убрана функция «remote ip strategy»; dts dev server без Koa                                                                                                                                                | Нет                                                                        |
| 2.4.0     | **Удалён Data Prefetch** (пакет, поля манифеста, хуки)                                                                                                                                                     | Нет: не используется                                                       |
| 2.5.0     | Observability plugin (opt-in)                                                                                                                                                                              | Опционально                                                                |
| 2.6.0     | Исправлен повторный запрос манифеста после `registerRemotes(..., { force: true })`                                                                                                                         | Да, если перерегистрировать remotes                                        |
| 2.7.0     | В sdk убран fallback на `node-fetch`; TypeScript 6                                                                                                                                                         | Нет                                                                        |
| 2.8.0     | TypeScript 7 в dts-plugin; поддержка идентификаторов модулей Rspack                                                                                                                                        | Нет                                                                        |
| 2.9.0     | Runtime-плагины привязываются к экземпляру один раз; расширены shared-хуки (`resolveShare` и др.)                                                                                                          | Да, если писать runtime-плагины                                            |

**[вывод]** Конфигурация FinFlow (`name`, `remotes`, `exposes`, `shared` массивом) — это стабильное API, которое пережило все эти версии. Затронуты в основном runtime-API (`init`) и экзотические опции. Явного migration guide с `0.x` на `2.x` у MF нет: блог объявляет релиз без ломающих изменений.

### 7.2 `@rspack/core` `1.2` → `1.7` (без смены мажора)

- `1.5` — runtime MF поднят в рантайм Rspack (меньше бандл в multi-entry, исправлены ошибки инициализации); встроенная поддержка TS-конфига в CLI (`--configLoader=auto`: нативный загрузчик или jiti); прекращена поддержка Node 16. **[проверено]** [Rspack 1.5 blog](https://rspack.rs/blog/announcing-1-5#module-federation-runtime-hoisting); [Rspack: config](https://rspack.rs/config/#typescript-configuration-file).
- `1.6.1` — опция `manifest` во встроенном MF-плагине. **[проверено]** Rspack: ModuleFederationPlugin.
- Ветка `1.x` по-прежнему получает релизы: тег `latest-v1` = `1.7.12`. **[проверено]** npm.

### 7.3 `@rspack/core` `1.x` → `2.x` (мажор)

Полный список — [Upgrading from v1 to v2](https://rspack.rs/guide/migration/rspack_1.x). Ниже только пункты, которые пересекаются с конфигурацией FinFlow (`shell/rspack.config.ts`, `transactions/rspack.config.ts`). **[проверено]** — по migration guide; соответствие нашему конфигу — **[вывод]**.

| Изменение в Rspack 2                                                                                                                                                                   | Где в FinFlow                                                                                                                                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node.js **20.19+ / 22.12+**                                                                                                                                                            | CI и локальная машина                                                                                                                                                                                                                                |
| `@rspack/core`, `@rspack/cli`, `@rspack/dev-server`, `@rspack/plugin-react-refresh` — **чистый ESM** (CJS-сборок нет)                                                                  | `rspack.config.ts` использует `__dirname` и `import * as RefreshPlugin`, в `tsconfig` есть блок `ts-node` с `module: CommonJS`. [вывод] Нужно проверить, как CLI 2.x загрузит такой конфиг (jiti или нативный загрузчик) и есть ли в нём `__dirname` |
| `@rspack/cli` больше не тянет `@rspack/dev-server`: его ставят отдельно для `rspack serve`; изменились `devServer.proxy` и **`devServer.watchFiles`**; Express заменён на connect-next | Скрипты `start` и `build:start`; в конфиге задан `devServer.watchFiles`                                                                                                                                                                              |
| **`experiments.css` удалён**: CSS включён всегда, `type` задаётся в `module.rules`                                                                                                     | В конфиге `experiments: { css: true }` и правило `type: 'css'`                                                                                                                                                                                       |
| `targets` для `builtin:swc-loader` и `LightningCssMinimizerRspackPlugin` по умолчанию выводятся из `target`                                                                            | Свой `targets` задан явно, его можно оставить                                                                                                                                                                                                        |
| `LightningCssMinimizerRspackPlugin`: `draft` → `drafts`, `cssHeadDataCompression` удалён                                                                                               | Используется только `minimizerOptions.targets`                                                                                                                                                                                                       |
| `HtmlRspackPlugin`: опция `sri` удалена                                                                                                                                                | Не используется                                                                                                                                                                                                                                      |
| `module.parser.javascript.exportsPresence`: `warn` → **`error`**                                                                                                                       | Импорт несуществующего экспорта теперь ломает сборку                                                                                                                                                                                                 |
| `output.chunkLoadingGlobal` по умолчанию `rspackChunk${uniqueName}` (было `webpackChunk…`)                                                                                             | [вывод] Безопасно, пока все приложения собраны одной мажорной версией; `uniqueName` у каждого свой                                                                                                                                                   |
| `@module-federation/runtime-tools` стал **optional peer**: при использовании MF его нужно поставить явно; требуется `^0.24.1 \|\| ^2.0.0`                                              | [вывод] Переход на Rspack 2 **требует** MF ≥ 0.24.1, на `0.8.x` с Rspack 2 не уехать                                                                                                                                                                 |
| `@rspack/plugin-react-refresh@2` требует `@rspack/core ^2`                                                                                                                             | devDependency                                                                                                                                                                                                                                        |
| `--analyze` убран из CLI (вместо него Rsdoctor)                                                                                                                                        | Не используется                                                                                                                                                                                                                                      |

**[вывод] Порядок обновления по peer-зависимостям.** MF `2.9` работает и с Rspack `1.x`, и с `2.x`. Rspack 2, наоборот, требует MF ≥ `0.24.1`. Значит, обновлять можно в два шага: сначала MF при Rspack 1.x, потом Rspack. Обратный порядок — сначала Rspack 2 при MF `0.8` — по peer-зависимостям не поддерживается.

**[вывод] Смешение мажорных версий между remote и хостом.** Каждое приложение — отдельный npm-пакет со своим lockfile, а развёртывание независимое. Возможна ситуация, когда хост собран одной версией MF или Rspack, а remote другой. Формат `remoteEntry` (глобал `get`/`init`) и протокол share scope общие для всех версий MF-рантайма. В первоисточниках я не нашёл гарантий совместимости между версиями рантайма. Если независимое развёртывание будет предполагать разные версии тулчейна, это нужно проверить прототипом.

---

## 8. Компромиссы, которые понадобятся для решений

Здесь только варианты, без выбора.

1. **Чем подключать remotes: `mf-manifest.json` или `remoteEntry.js`.** Манифест даёт preload, DevTools, точные коды ошибок и автоматический адрес типов, но добавляет запрос и требует корректного `publicPath`. JS-вход проще, но этих возможностей не даёт.
2. **Где задавать адреса remotes: в плагине сборки или через `registerRemotes` в рантайме.** Плагин даёт статические `import`, двустороннее `shared` и типы. Рантайм позволяет брать адреса из конфига или JSON при развёртывании, но без типов (только через `remoteTypeUrls`) и с `shared` в одну сторону. Способы можно сочетать: например, в сборке хоста объявить remotes с адресами-заглушками, а во время развёртывания переопределить их через `registerRemotes(..., { force: true })`. **[вывод]**
3. **`shareStrategy`.** `version-first` выбирает лучшую версию, но при старте загружает все remotes, и падение любого из них затрагивает старт. `loaded-first` устойчивее к недоступным remotes, но берёт первую загруженную версию.
4. **Строгость синглтонов.** `singleton` без `strictVersion` даёт предупреждение и продолжает работу. `strictVersion: true` бросает исключение. `requiredVersion` можно задать явно или взять из `package.json`.
5. **Подпути React** (`react/`, `react-dom/`) в `shared`: подробности в 6.2.
6. **Типы в CI.** Варианты: коммитить `@mf-types`, качать их при сборке (`typesOnBuild`, нужен доступный remote) или публиковать типы remote отдельно. Сейчас `shell/@mf-types` закоммичен.
7. **Объём обновления.** Можно ограничиться MF `2.9` на Rspack `1.7`: мажорной миграции Rspack нет, `latest-v1` поддерживается. Можно перейти на MF `2.9` и Rspack `2.3`: это Node 20.19+, чистый ESM, правка `experiments.css`, отдельный `@rspack/dev-server` и явный `@module-federation/runtime-tools`.
8. **`@module-federation/bridge-react` против ручных `React.lazy`, error boundary и `loadRemote`.** Bridge даёт готовый fallback и отдельный React-корень на каждое remote-приложение, но это ещё один слой абстракции и роутер-интеграция, которая включается автоматически, если пакет установлен.

---

## 9. Что ещё имеет смысл проверить руками

Это не установленные факты, а места, где документация расходится с кодом или молчит.

- Какой `library.type` получает `remoteEntry` в Rspack после обновления (`var` или `global`). Смотреть `metaData.remoteEntry.type` в `mf-manifest.json`.
- Генерирует ли `transactions` уже сейчас `mf-manifest.json` (по коду обёртки — должен) и что в нём лежит в `metaData.publicPath` и `types`.
- Попадают ли `react/jsx-runtime` и `react-dom/client` в shared при текущем `shared: ['react', 'react-dom']`.
- Загружается ли `rspack.config.ts` (с `__dirname` и `import * as RefreshPlugin`) в `@rspack/cli@2` без правок.
- Работают ли вместе хост и remote, собранные разными мажорными версиями MF-рантайма.
- Rstest умеет тестировать настоящие remote-модули (`@module-federation/rstest`; Node, JSDOM и Browser Mode). **[проверено]** [Rspack 2.2 blog](https://rspack.rs/blog/announcing-2-2#rstest-module-federation). Это относится к теме тестирования на границах, а не к этому тикету.
