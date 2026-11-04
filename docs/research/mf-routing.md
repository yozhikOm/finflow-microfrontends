# Маршрутизация между хостом и remote-приложениями в Module Federation

Исследование к задаче [#5](https://github.com/yozhikOm/finflow-microfrontends/issues/5) (карта [#3](https://github.com/yozhikOm/finflow-microfrontends/issues/3)). Дата: 2026-11-04.

**Вопрос.** Какие паттерны маршрутизации применяют в Module Federation с React Router? Как в каждом из них работают ссылки между микрофронтендами, ленивая загрузка, отдельный запуск remote-приложения и обработка ошибки загрузки? Что рекомендуют документации React Router и Module Federation?

Здесь только факты и компромиссы. Решения по проекту в документ не входят.

## Обозначения

- **[проверено]**: утверждение есть в первоисточнике (документация, исходный код, официальный пример), ссылка рядом.
- **[вывод]**: следует из проверенных фактов, но прямо в источнике не написано. Перед тем как на это опираться, стоит проверить прототипом.

## Коротко

1. Встречаются три паттерна, и для каждого есть первоисточник:
   - **A. Хост владеет всеми маршрутами.** Remote-приложение отдаёт страницы-компоненты или описания маршрутов.
   - **B. Remote-приложение отдаёт вложенный набор маршрутов** под `/accounts/*` и работает внутри роутера хоста.
   - **C. У каждого приложения свой роутер.** Это официальный путь Module Federation, React Bridge (`@module-federation/bridge-react`).
2. Module Federation как вариант по умолчанию для «приложения с маршрутами» документирует только паттерн C. Bridge сам подставляет `basename`, перехватывает импорт `react-router(-dom)` и при навигации хоста посылает remote-приложению синтетический `popstate`. При этом `react-router-dom` нельзя делать shared. [проверено]
3. Своего руководства по микрофронтендам у React Router нет. Module Federation упоминается в его документации в одном месте: в описании `patchRoutesOnNavigation` (Data Mode). Этот API подгружает части дерева маршрутов в рантайме, и там прямо написано, что в некоторых архитектурах на Module Federation полное дерево маршрутов заранее не получить. [проверено]
4. Совместимость версий. Текущий React Router — v8.5.1, в нём нет пакета `react-router-dom`. `@module-federation/bridge-react@2.9.3` в peer-зависимостях объявляет `react-router` только `^6 || ^7`, а адаптеры роутера у него есть для v5, v6 и v7. [проверено]
5. Сбой загрузки remote-приложения Module Federation предлагает обрабатывать на трёх уровнях: повтор запроса (`retry-plugin`), runtime-хук `errorLoadRemote` и React `ErrorBoundary`. Маршрутные `ErrorBoundary` в React Router есть только в Data и Framework Mode, в Declarative Mode их нет. [проверено]

## Исходное состояние проекта

[проверено по репозиторию]

- `shell/module-federation.config.ts`: один remote `transactions`, `shared: ['react', 'react-dom']`.
- `transactions` экспортирует `./TransactionsPage`. `shell/src/App.tsx` рендерит его напрямую, без роутера и без `Suspense` или `ErrorBoundary`.
- Версии: `@module-federation/enhanced ^0.8.9`, `@rspack/core ~1.2.0`, React 19. Роутер не установлен. На 2026-11-04 актуальны `@module-federation/enhanced 2.9.3` и `@rspack/core 2.3.1` (`npm view`).
- В `shell/rspack.config.ts` уже стоит `devServer.historyApiFallback: true`. Без этой опции не работают глубокие ссылки при History API, см. раздел о Rspack ниже.

---

## Паттерн A. Хост владеет всеми маршрутами

Хост держит одну таблицу маршрутов и один роутер. Remote-приложение отдаёт либо **страницы-компоненты**, которые хост вешает на свои маршруты (A1), либо **описания маршрутов**, которые хост добавляет в своё дерево (A2).

### A1. Remote-приложение отдаёт страницы

Официальный пример [`shared-routing`](https://github.com/module-federation/module-federation-examples/tree/master/shared-routing). Хост лениво импортирует страницы и вешает их на маршруты со splat-сегментом [проверено, [`shell/src/Shell.js`](https://github.com/module-federation/module-federation-examples/blob/master/shared-routing/shell/src/Shell.js)]:

```jsx
const OrderService = React.lazy(() => import('order/OrderService'));
// ...
<React.Suspense fallback={'Loading'}>
  <Routes>
    <Route path="orders/*" element={<OrderService />} />
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
</React.Suspense>;
```

- **Ссылки между микрофронтендами.** История и роутер одни на всё приложение, поэтому любой `<Link to="/accounts/…">` просто работает, если remote-приложение использует тот же экземпляр React Router, что и хост. [вывод] Для этого React Router у них должен быть общим (`shared`, `singleton`): контекст роутера — это React-контекст, а у второй копии модуля будет свой контекст. Bridge сам определяет, есть ли вокруг роутер, вызывая `useLocation()` в `try/catch` ([исходник](https://github.com/module-federation/core/blob/main/packages/bridge/bridge-react/src/remote/router-component/component.tsx)), то есть вне контекста роутера `useLocation()` бросает исключение. [проверено] В примере `shared-routing` `react-router` в `shared` не указан, но страницы remote-приложений и не пользуются хуками роутера. [проверено, [`order/webpack.config.js`](https://github.com/module-federation/module-federation-examples/blob/master/shared-routing/order/webpack.config.js), [`OrderService.js`](https://github.com/module-federation/module-federation-examples/blob/master/shared-routing/order/src/OrderService.js)]
- **Ленивая загрузка.** `React.lazy(() => import('remote/Page'))` и `Suspense` в хосте. [проверено]
- **Отдельный запуск remote-приложения.** В `shared-routing` remote-приложение `order` при отдельном запуске само грузит `shell/Shell` от хоста (`React.lazy(() => import('shell/Shell'))`). Поэтому, по README, «each of the above URLs will look exactly same», но без запущенного хоста remote-приложение не стартует. [проверено, [`order/src/App.js`](https://github.com/module-federation/module-federation-examples/blob/master/shared-routing/order/src/App.js), [README](https://github.com/module-federation/module-federation-examples/blob/master/shared-routing/README.md)] Другой вариант: локальный bootstrap remote-приложения оборачивает страницу в свой `<BrowserRouter>`. Так remote-приложение запускается без хоста. [вывод]
- **Ошибка загрузки.** Неудачный `import()` отклоняет промис `React.lazy`, и ошибку ловит ближайший React `ErrorBoundary`. Без него падает всё дерево. [проверено: [блог Module Federation об обработке ошибок](https://module-federation.io/blog/error-load-remote.html), раздел «Set ErrorBoundary for component»] В Declarative Mode маршрутных error boundary нет, страница error boundary помечена «Not available with Declarative». [проверено, [React Router: Error Boundaries](https://reactrouter.com/how-to/error-boundary)]

### A2. Remote-приложение отдаёт описания маршрутов

**Статический импорт массива маршрутов.** Официальный пример [`shared-routes2`](https://github.com/module-federation/module-federation-examples/tree/master/shared-routes2) на React Router v5, webpack. `app2` экспортирует `./routes`, массив `{ path, component }` с `React.lazy` внутри. `app1` склеивает его со своими маршрутами: `import remoteRoutes from 'app2/routes'; const routes = [...localRoutes, ...remoteRoutes];`. [проверено, [`app1/src/App.js`](https://github.com/module-federation/module-federation-examples/blob/master/shared-routes2/app1/src/App.js), [`app2/src/routes.js`](https://github.com/module-federation/module-federation-examples/blob/master/shared-routes2/app2/src/routes.js)]

- Статический импорт делает remote-приложение обязательным при старте хоста. В примере это обойдено promise-remote: при ошибке загрузки `remoteEntry.js` он подставляет заглушку `get: () => () => []`, то есть пустой список маршрутов. [проверено, [`app1/webpack.config.js`](https://github.com/module-federation/module-federation-examples/blob/master/shared-routes2/app1/webpack.config.js)]
- В этом примере в `shared` попадают все `dependencies`, включая `react-router-dom` (`shared: { ...deps, … }`). [проверено, там же]

**Data Mode React Router: `route.lazy`.** Описание маршрута (`path`) известно заранее, а реализацию (`Component`, `loader`, …) можно загрузить лениво. [проверено, [route object → `lazy`](https://reactrouter.com/start/data/route-object)] Загрузка remote-модуля внутри `lazy` (`lazy: () => import('transactions/route')`) в документации React Router не описана. [вывод] Есть ли тогда у маршрута ленивая обработка ошибок, тоже не проверено. Страница error boundary перечисляет источники ошибок «loaders, actions, components, headers, links, and meta», про `lazy` там ничего нет.

**Data Mode: `patchRoutesOnNavigation`.** Это единственное место в документации React Router, где говорится о Module Federation [проверено, [`createBrowserRouter` → `opts.patchRoutesOnNavigation`](https://reactrouter.com/api/data-routers/createBrowserRouter); поиск по `remix-run/react-router` находит упоминания только в `createBrowserRouter.md`, `createHashRouter.md` и `lib/dom/lib.tsx`]:

> «it might not even be possible to provide all route definitions up front in certain Micro-Frontend or Module-Federation architectures.»

Функция вызывается, когда роутер не смог сопоставить путь, и получает `path`, частичные `matches` и `patch(routeId | null, children)`. Документация показывает, как при `path.startsWith("/dashboard")` загрузить целое поддерево (`await import("./dashboard")`) и пропатчить его. Если путь содержит параметры, функция вызывается и при совпадении, на случай если есть ещё не обнаруженный маршрут с более высоким рангом. Поэтому документация советует кешировать уже обработанные пути. [проверено, там же]

[вывод] С `patchRoutesOnNavigation` хост может не знать маршрутов remote-приложения заранее: при первом заходе на `/accounts/...` он подгружает `accounts/routes` через Module Federation. Что делать, если загрузка в `patchRoutesOnNavigation` упала, в документации не сказано.

---

## Паттерн B. Remote-приложение отдаёт вложенный набор маршрутов (`/accounts/*`)

Хост монтирует компонент remote-приложения на `path="accounts/*"`, а внутри компонента свои `<Routes>` с относительными путями (descendant routes).

- Splat `/*` совпадает с любым хвостом URL, остаток доступен как `params["*"]`. [проверено, [Declarative: Routing → Splats](https://reactrouter.com/start/declarative/routing)]
- Ограничение React Router v8: `<Routes>` «do not participate in data loading, action, code splitting, or any other route module features». То есть маршруты внутри `<Routes>` remote-приложения не получают `loader`, `action` и `lazy` даже под data-роутером хоста. [проверено, [`<Routes>`](https://reactrouter.com/api/components/Routes)]
- Компонент remote-приложения работает в контексте роутера хоста, поэтому `react-router` должен быть общим синглтоном. [вывод, см. A1] В Module Federation `singleton: true` означает «only one version of shared module allowed». При расхождении версий загружается более высокая, а сторона с более низкой версией получает предупреждение. [проверено, [MF: shared → singleton](https://module-federation.io/configure/shared.html)]
- **Ссылки.** Внутри remote-приложения работают относительные ссылки, ссылки в другой микрофронтенд — абсолютные (`/transactions/...`). История одна. [вывод]
- **Ленивая загрузка.** `React.lazy` и `Suspense` на маршруте хоста, как в A1. [проверено, `shared-routing`]
- **Отдельный запуск.** Локальный bootstrap remote-приложения оборачивает экспортируемый компонент в свой роутер и монтирует его на тот же префикс. [вывод]
- **Ошибка загрузки.** Как в A1: `ErrorBoundary` вокруг ленивого компонента. Под data-роутером хоста можно навесить `ErrorBoundary` на маршрут `accounts/*` хоста. Он ловит ошибки компонентов маршрута («components» есть в списке источников ошибок). [проверено, [Error Boundaries](https://reactrouter.com/how-to/error-boundary)] Ловит ли он отклонённый `React.lazy` внутри компонента, в документации не сказано. [вывод: скорее да, это ошибка рендера, но нужно проверить]
- **Несовместимость с Bridge Router:** «When enabling Bridge Router, do not configure `react-router-dom` as a shared dependency, otherwise it will cause routing functionality issues». Плагин сборки бросает ошибку, если `react-router-dom` указан в `shared` (`'React-router-dom cannot be set to shared after react bridge is used'`). [проверено, [Export Applications](https://module-federation.io/guide/bridge/react/export-app.html), [`bridge-react-webpack-plugin/src/index.ts`](https://github.com/module-federation/core/blob/main/packages/bridge/bridge-react-webpack-plugin/src/index.ts)] Значит, паттерн B (общий роутер) и паттерн C (Bridge Router) в одной сборке не сочетаются. [вывод из проверенного]

---

## Паттерн C. У каждого приложения свой роутер (Module Federation React Bridge)

Bridge описан как решение для «application-level modules»: «Unlike traditional component-level sharing, Bridge handles complete application modules that include routing systems and business logic». В таблице сравнения со «Traditional Component Sharing» строка «Routing» заполнена так: «Not supported» против «Full support». [проверено, [Bridge Overview](https://module-federation.io/guide/bridge/overview.html)]

### Как это устроено

[проверено по документации и исходникам `module-federation/core@main`, `@module-federation/bridge-react@2.9.3`]

1. **Remote-приложение** оборачивает своё приложение, у которого собственный `<BrowserRouter>`: `export default createBridgeComponent({ rootComponent: App })`, и экспортирует этот файл (`exposes: { './export-app': … }`). [Export Applications](https://module-federation.io/guide/bridge/react/export-app.html)
2. **Хост** создаёт компонент `createRemoteAppComponent({ loader: () => loadRemote('remote1/export-app'), loading, fallback })` и вешает его на маршрут `path="/remote1/*"`. [Loading Applications](https://module-federation.io/guide/bridge/react/load-app.html)
3. **Подмена роутера.** Плагин сборки ставит алиасы `react-router$` и `react-router-dom$` на обёртку Bridge. Обёрточный `BrowserRouter` берёт `basename` из контекста, который передал хост, либо рендерит `MemoryRouter`, если задан `memoryRoute`. Обёрточный `RouterProvider` пересоздаёт `createBrowserRouter`/`createMemoryRouter` с этим `basename`. [[`router-alias.ts`](https://github.com/module-federation/core/blob/main/packages/bridge/bridge-react-webpack-plugin/src/router-alias.ts), [`router/v7.tsx`](https://github.com/module-federation/core/blob/main/packages/bridge/bridge-react/src/router/v7.tsx)]
4. **Вычисление `basename`.** Если хост не передал `basename` явно, Bridge берёт `useHref('/')` и добавляет `pathnameBase` последнего совпавшего маршрута хоста. Для `/remote1/*` получается `/remote1`. [[`router-component/component.tsx`](https://github.com/module-federation/core/blob/main/packages/bridge/bridge-react/src/remote/router-component/component.tsx)]
5. **Синхронизация хост → remote-приложение.** При каждой смене `location` в хосте Bridge вызывает `dispatchPopstateEnv()`, то есть `window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }))`. Роутер remote-приложения слушает `popstate` и перечитывает URL. [[`bridge-shared/src/env.ts`](https://github.com/module-federation/core/blob/main/packages/bridge/bridge-shared/src/env.ts), `component.tsx`]
6. Remote-приложение рендерится в **отдельный React-корень** (`createRoot` на DOM-узле, `destroy` → `unmount`). [проверено, [Bridge Overview → Implementation Principles](https://module-federation.io/guide/bridge/overview.html)] Обзор называет это «Framework Isolation: Ensures React contexts and component trees between different applications are isolated».

### По осям вопроса

- **Ссылки внутри remote-приложения.** Пишутся от его корня: `<Link to="/detail">` в `router-remote1` при `basename="/remote1"` ведёт на `/remote1/detail`. [проверено: [`router-remote1-2001/src/App.tsx`](https://github.com/module-federation/core/blob/main/apps/router-demo/router-remote1-2001/src/App.tsx) и [хост `router-host-2000/src/App.tsx`](https://github.com/module-federation/core/blob/main/apps/router-demo/router-host-2000/src/App.tsx)]
- **Ссылки из remote-приложения в другой микрофронтенд.** Готового механизма в документации нет. [проверено: в load-app и export-app такого раздела нет] Абсолютный `<Link to="/accounts">` внутри remote-приложения разрешится относительно его `basename`, то есть в `/transactions/accounts`. [вывод из семантики `basename`] Синхронизация в Bridge односторонняя: `dispatchPopstateEnv` в `bridge-react` вызывается только на стороне потребителя (хоста), поиск по `module-federation/core` других мест в bridge-react не находит. [проверено] При этом `history.pushState()` сам по себе `popstate` не порождает, цитата: «just calling `history.pushState()` or `history.replaceState()` won't trigger a `popstate` event». [проверено, [MDN: popstate](https://developer.mozilla.org/en-US/docs/Web/API/Window/popstate_event)] [вывод] Отсюда:
  - навигация внутри remote-приложения не обновляет `location` в роутере хоста. Всё, что в хосте зависит от `location` (подсветка активного пункта меню), может отставать;
  - для перехода между микрофронтендами есть такие варианты: хост передаёт в remote-приложение callback навигации через props (Bridge пробрасывает произвольные props: «Pass props directly (e.g. `userId="123"`)», [проверено, load-app]); remote-приложение делает `history.pushState` и само шлёт `popstate`; полная перезагрузка через `<a href>`.
- **`memoryRoute`.** Remote-приложение можно отрендерить с `MemoryRouter` (`memoryRoute={{ entryPath: '/detail' }}`). Тогда его навигация не попадает в URL. В демо так несколько remote-приложений показаны на одной странице. [проверено, `router-host-2000/src/App.tsx`, `Wraper3`]
- **Ленивая загрузка.** `createRemoteAppComponent` внутри — это `React.lazy` + `Suspense` (`loading`). Remote-приложение загружается при первом рендере маршрута. [проверено, [`remote/createHelpers.tsx`](https://github.com/module-federation/core/blob/main/packages/bridge/bridge-react/src/remote/createHelpers.tsx)]
- **Отдельный запуск.** Remote-приложение — полноценное приложение со своим `<BrowserRouter basename="/">`. Вне хоста `basename` никто не подставляет, и роутер работает от корня. [проверено, `router-remote1-2001/src/App.tsx` + `router/v7.tsx`: `basename={routerContextProps?.basename || basename}`]
- **Ошибка загрузки.** `createRemoteAppComponent` оборачивает ленивый компонент в собственный `ErrorBoundary` с `FallbackComponent = fallback`. По документации `fallback` — «UI shown when loading/rendering fails; receives `error`». [проверено, `createHelpers.tsx`, [load-app](https://module-federation.io/guide/bridge/react/load-app.html)] В демо есть отдельные маршруты для ошибки рендера (`/remote-render-error/*`) и ошибки ресурса (`/remote-resource-error/*`), а также для `ErrorBoundary` из `react-error-boundary` с `resetErrorBoundary`. [проверено, `router-host-2000/src/App.tsx`]

### Ограничения и требования Bridge

[проверено]

- Поддерживаются React Router v5, v6, v7. `@tanstack/react-router` не поддерживается, для других роутеров нужно `enableBridgeRouter: false` и своя интеграция. [Export Applications](https://module-federation.io/guide/bridge/react/export-app.html)
- `react-router-dom` нельзя делать shared, см. паттерн B.
- `bridge-react/v18` и `/v19` импортируют `createRoot` из `react-dom/client`. Нужен shared с ключом-префиксом `'react-dom/'` (`singleton: true`), иначе возможна ошибка рассогласования версий React. [Getting Started](https://module-federation.io/guide/bridge/react/getting-started.html)
- Если роутер не нужен, `enableBridgeRouter: false` переключает импорт на `@module-federation/bridge-react/base` без `react-router-dom` (около 3 КБ gzip). [Loading Applications](https://module-federation.io/guide/bridge/react/load-app.html)
- В `@module-federation/enhanced@0.8.9` (версия проекта) алиас Bridge уже подключается, но выключается старой опцией `bridge.disableAlias`. В актуальных версиях она deprecated в пользу `enableBridgeRouter: false`. [[`rspack/src/ModuleFederationPlugin.ts@v0.8.9`](https://github.com/module-federation/core/blob/v0.8.9/packages/rspack/src/ModuleFederationPlugin.ts), [`enhanced/src/wrapper/ModuleFederationPlugin.ts@main`](https://github.com/module-federation/core/blob/main/packages/enhanced/src/wrapper/ModuleFederationPlugin.ts)]

---

## Совместимость версий: React Router v8 и Bridge

- Актуальный `react-router` — **8.5.1**, `react-router-dom` последний раз выходил как **7.18.5** (`npm view`). [проверено]
- «React Router v8 removes the `react-router-dom` re-export package». Импорт DOM-специфичных API идёт из `react-router/dom`, остального — из `react-router`. v8 требует `react@19.2.7+` и `react-dom@19.2.7+`. [проверено, [Upgrading from v7](https://reactrouter.com/upgrading/v7)]
- `@module-federation/bridge-react@2.9.3` объявляет peer-зависимости `react-router: ^6 || ^7` и `react-router-dom: ^4 || ^5 || ^6 || ^7`. [проверено, `npm view`] Алиас-плагин для неизвестной мажорной версии пишет в лог `Unsupported React Router version: N. Defaulting to v7.` и подставляет v7-алиасы на `react-router$` и `react-router-dom$`. Алиаса на `react-router/dom` в нём нет. [проверено, `router-alias.ts`]
- [вывод] Связка Bridge Router и React Router v8 официально не заявлена. Работает ли она, в частности подменяется ли `RouterProvider` из `react-router/dom`, нужно проверять прототипом. Для паттернов A и B, где Bridge не используется, этого ограничения нет.

## Rspack: глубокие ссылки в dev-режиме

При HTML5 History API «the `index.html` page will likely have to be served in place of any `404` responses». Для этого есть `devServer.historyApiFallback: true`. [проверено, [Rspack: devServer](https://rspack.rs/config/dev-server)] Это нужно каждому приложению с `BrowserRouter`, которое запускают отдельно: и хосту, и remote-приложению. В официальных примерах `shared-routing` опция включена и у `shell`, и у `order`. [проверено, `webpack.config.js` обоих]

## Сводная таблица

|                                                           | A1: хост — маршруты, remote — страницы                                     | A2: remote отдаёт описания маршрутов                    | B: remote отдаёт `/x/*` с `<Routes>`     | C: свой роутер у каждого (Bridge)                                                       |
| --------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------- |
| Роутеров в рантайме                                       | 1                                                                          | 1                                                       | 1                                        | 1 + по одному на remote-приложение                                                      |
| React Router в `shared`                                   | нужен singleton, если remote-приложение использует хуки или `Link` [вывод] | да (в `shared-routes2` через `...deps`)                 | нужен singleton [вывод]                  | **запрещено** [проверено]                                                               |
| Знание хоста о маршрутах remote-приложения                | все пути                                                                   | все пути (или лениво через `patchRoutesOnNavigation`)   | только префикс                           | только префикс                                                                          |
| Ссылки в другой микрофронтенд                             | обычный `Link`                                                             | обычный `Link`                                          | абсолютный `Link`                        | нет штатного механизма: props-callback, `pushState` + `popstate` или `<a href>` [вывод] |
| Data API (`loader`, `lazy`) для страниц remote-приложения | да, если хост в Data Mode                                                  | да (`route.lazy`, `patchRoutesOnNavigation`)            | нет: `<Routes>` не участвует [проверено] | внутри remote-приложения, своим роутером                                                |
| Отдельный запуск remote-приложения                        | нужен свой bootstrap с роутером или хост, как в `shared-routing`           | то же                                                   | то же                                    | из коробки                                                                              |
| Ошибка загрузки                                           | `ErrorBoundary` вокруг `lazy` или маршрутный `ErrorBoundary` (Data Mode)   | при статическом импорте ломает старт хоста без заглушки | как A1                                   | встроенный `fallback` в `createRemoteAppComponent`                                      |
| Изоляция React-контекста                                  | нет, общее дерево                                                          | нет                                                     | нет                                      | отдельный корень [проверено]                                                            |

Во всех паттернах можно добавить уровни Module Federation, которые от роутинга не зависят: `@module-federation/retry-plugin` (повторы, запасные домены) и runtime-хук `errorLoadRemote`. Хук различает стадию по `args.lifecycle`: `afterResolve` — ошибка загрузки манифеста или entry, `onLoad` — ошибка загрузки модуля. Он может вернуть запасной компонент или запасной манифест. [проверено, [блог: Error handling for remote module rendering](https://module-federation.io/blog/error-load-remote.html)]

## Что рекомендуют документации

- **Module Federation.** Для «приложения с маршрутами» рекомендует Bridge: `createBridgeComponent` + `createRemoteAppComponent`, хост вешает remote-приложение на `path="/x/*"`. Пример — [`apps/router-demo`](https://github.com/module-federation/core/tree/main/apps/router-demo). Для обработки сбоя рекомендует сочетать retry, `errorLoadRemote` и `ErrorBoundary`. [проверено] Паттерны A и B есть в репозитории официальных примеров (`shared-routing`, `shared-routes2`), но основная документация их как рекомендацию не описывает. [проверено: в `module-federation/core/apps/website-new/docs/en` про роутинг есть только раздел Bridge]
- **React Router.** Отдельного руководства по микрофронтендам нет. Единственная отсылка — `patchRoutesOnNavigation` в Data Mode как API «for advanced use-cases where you are unable to provide the full route tree up-front». [проверено]

## Что осталось непроверенным

- Работа Bridge Router с React Router v8, где нет `react-router-dom`, а `RouterProvider` лежит в `react-router/dom`.
- Попадают ли ошибки `route.lazy` и `patchRoutesOnNavigation`, загружающих remote-модуль, в маршрутный `ErrorBoundary`.
- Поведение кнопок «назад» и «вперёд», когда remote-приложение в паттерне C сделало `pushState`, а хост об этом не знал.
- Bridge-примеры в документации написаны под Rsbuild. Для голого Rspack заявлен `@module-federation/enhanced/rspack`, но отдельного Rspack-примера с Bridge не найдено.

## Источники

Первоисточники, по которым проверялись факты:

- Module Federation, документация (исходники в `module-federation/core/apps/website-new/docs/en`):
  [Bridge Overview](https://module-federation.io/guide/bridge/overview.html),
  [React Bridge: Getting Started](https://module-federation.io/guide/bridge/react/getting-started.html),
  [Export Applications](https://module-federation.io/guide/bridge/react/export-app.html),
  [Loading Applications](https://module-federation.io/guide/bridge/react/load-app.html),
  [shared](https://module-federation.io/configure/shared.html),
  [Error handling for remote module rendering](https://module-federation.io/blog/error-load-remote.html).
- Module Federation, исходный код (`module-federation/core`, ветка `main`):
  [`bridge-react/src/router/v7.tsx`](https://github.com/module-federation/core/blob/main/packages/bridge/bridge-react/src/router/v7.tsx),
  [`bridge-react/src/remote/router-component/component.tsx`](https://github.com/module-federation/core/blob/main/packages/bridge/bridge-react/src/remote/router-component/component.tsx),
  [`bridge-react/src/remote/createHelpers.tsx`](https://github.com/module-federation/core/blob/main/packages/bridge/bridge-react/src/remote/createHelpers.tsx),
  [`bridge-shared/src/env.ts`](https://github.com/module-federation/core/blob/main/packages/bridge/bridge-shared/src/env.ts),
  [`bridge-react-webpack-plugin/src/index.ts`](https://github.com/module-federation/core/blob/main/packages/bridge/bridge-react-webpack-plugin/src/index.ts),
  [`bridge-react-webpack-plugin/src/router-alias.ts`](https://github.com/module-federation/core/blob/main/packages/bridge/bridge-react-webpack-plugin/src/router-alias.ts),
  [`apps/router-demo`](https://github.com/module-federation/core/tree/main/apps/router-demo).
- Официальные примеры (`module-federation/module-federation-examples`, ветка `master`):
  [`shared-routing`](https://github.com/module-federation/module-federation-examples/tree/master/shared-routing),
  [`shared-routes2`](https://github.com/module-federation/module-federation-examples/tree/master/shared-routes2).
- React Router (документация v8.5.1):
  [Picking a Mode](https://reactrouter.com/start/modes),
  [Declarative: Routing](https://reactrouter.com/start/declarative/routing),
  [`<Routes>`](https://reactrouter.com/api/components/Routes),
  [Route Object](https://reactrouter.com/start/data/route-object),
  [`createBrowserRouter`](https://reactrouter.com/api/data-routers/createBrowserRouter),
  [Error Boundaries](https://reactrouter.com/how-to/error-boundary),
  [Upgrading from v7](https://reactrouter.com/upgrading/v7).
- Rspack: [Dev server](https://rspack.rs/config/dev-server).
- MDN: [Window: popstate event](https://developer.mozilla.org/en-US/docs/Web/API/Window/popstate_event).
- npm registry (`npm view`, 2026-11-04): `react-router`, `react-router-dom`, `@module-federation/bridge-react`, `@module-federation/enhanced`, `@rspack/core`.
