# GraphQL-клиент в нескольких микрофронтендах: один общий или по клиенту на каждый

Исследование к задаче [#6](https://github.com/yozhikOm/finflow-microfrontends/issues/6) (карта [#3](https://github.com/yozhikOm/finflow-microfrontends/issues/3)). Дата: 2026-11-04.

## Вопрос

Как используют Apollo Client (или другой GraphQL-клиент) в нескольких микрофронтендах Module Federation: один экземпляр через `shared` или провайдер хоста против отдельного клиента в каждом remote-приложении? Как в каждом варианте одно remote-приложение узнаёт, что данные изменились в другом (созданная транзакция меняет баланс счёта)? Какие подводные камни у общего синглтона клиента при независимых версиях?

Решений здесь нет: только факты и компромиссы.

**Обозначения.** **[проверено]** — утверждение прямо есть в первоисточнике по ссылке (документация или исходный код). **[вывод]** — следует из проверенных фактов, но прямо в источнике не написано.

## Версии на дату исследования

- `@apollo/client` — 4.3.6, peer-зависимости: `react ^17 || ^18 || >=19.0.0-rc`, `graphql ^16 || ^17`, `rxjs ^7.3.0`. **[проверено]** `npm view @apollo/client`.
- `@module-federation/enhanced` — 2.9.3 (в репозитории сейчас `^0.8.9`). **[проверено]** `npm view`.
- Для сравнения: `urql` 5.0.4, `@tanstack/react-query` 5.105.3, `graphql-ws` 6.4.1. **[проверено]** `npm view`.
- Документация Apollo на apollographql.com/docs/react не показывает номер версии на страницах, но импортирует хуки из `@apollo/client/react`, а это путь Apollo Client 4. **[вывод]**

## 1. Что в Apollo Client принадлежит одному экземпляру клиента

- Кэш передаётся в конструктор `ApolloClient` (`cache`). Это «кэш, в котором Apollo Client хранит результаты запросов». Рекомендуемый кэш — `InMemoryCache`. **[проверено]** [class ApolloClient](https://www.apollographql.com/docs/react/api/core/ApolloClient)
- Следовательно, у двух экземпляров `ApolloClient` с разными `new InMemoryCache()` два независимых кэша. Запись в один не видна запросам другого. **[вывод]** из того, что кэш — опция конструктора.
- `client.refetchQueries` работает только с запросами, которые наблюдает этот клиент: «Only queries with active subscribers are registered with the client», запросы без подписчиков «cannot be refetched». **[проверено]** [Refetching queries](https://www.apollographql.com/docs/react/data/refetching)
- Значит, `refetchQueries` в мутации remote-приложения A не перезапросит запрос, который выполнен через клиент remote-приложения B. **[вывод]**
- `devtools.name` в конструкторе нужен, «when you instantiate multiple clients and want to be able to identify them by name»: несколько клиентов на странице — штатный сценарий. **[проверено]** [class ApolloClient](https://www.apollographql.com/docs/react/api/core/ApolloClient)

## 2. Как клиент попадает в компоненты: `ApolloProvider`, контекст и `client` в хуках

- `ApolloProvider` кладёт клиент в React-контекст: «a configured Apollo Client instance available throughout a React component tree». **[проверено]** [ApolloProvider](https://www.apollographql.com/docs/react/api/react/ApolloProvider)
- Вложенный `ApolloProvider` наследует родительский контекст и подменяет `client`: `{ ...parentContext, client: client || parentContext.client }`. **[проверено]** [исходник ApolloProvider.tsx](https://github.com/apollographql/apollo-client/blob/main/src/react/context/ApolloProvider.tsx)
- Любой хук берёт клиент из ближайшего провайдера, но опция `client` его переопределяет: «By default, the instance that's passed down via context is used, but you can provide a different instance here». То же у `useMutation`, `useSubscription`, `useBackgroundQuery`. **[проверено]** [useQuery](https://www.apollographql.com/docs/react/api/react/useQuery); `useApolloClient(override)` — `override || context.client` в [исходнике useApolloClient.ts](https://github.com/apollographql/apollo-client/blob/main/src/react/hooks/useApolloClient.ts)
- **Важная деталь для Module Federation.** Apollo создаёт контекст один раз и хранит его как свойство функции `React.createContext` под ключом `Symbol.for("__APOLLO_CONTEXT__")`. Комментарий в коде: это сделано, чтобы не появилось больше одного контекста, когда клиент «added in one context, then attempting to retrieve it from another». **[проверено]** [исходник ApolloContext.ts](https://github.com/apollographql/apollo-client/blob/main/src/react/context/ApolloContext.ts)
- Следствие: контекст привязан к экземпляру React, а не к копии `@apollo/client`. Если `react` общий синглтон (как сейчас в `shell` и `transactions`), то remote-приложение со своей собственной копией `@apollo/client` всё равно увидит клиент, положенный в `ApolloProvider` хоста. Это экземпляр класса из чужой копии библиотеки, возможно другой версии. **[вывод]** из исходника. Чтобы remote-приложение гарантированно работало со своим клиентом, оно должно обернуть своё дерево в собственный `ApolloProvider` (вложенный провайдер подменит `client`) или передавать `client` в хуки явно. **[вывод]**

## 3. `shared` в Module Federation: что даёт синглтон

- `singleton`: в общей области (share scope) допускается только одна версия модуля. «Some libraries use a global internal state (e.g. react, react-dom). Thus, it is critical to have only one instance». При нескольких версиях берётся наибольшая по semver. **[проверено]** [webpack ModuleFederationPlugin](https://webpack.js.org/plugins/module-federation-plugin/)
- Без синглтона share scope может держать несколько версий одновременно: каждый потребитель получает наибольшую, подходящую под его `requiredVersion`. Это позволяет двум сборкам с разными мажорными версиями работать на одной странице ценой загрузки обеих. `singleton: true` от этой гарантии отказывается и только предупреждает, если выбранная версия не подходит потребителю. **[проверено]** [webpack ModuleFederationPlugin](https://webpack.js.org/plugins/module-federation-plugin/), раздел `requiredVersion`
- Документация Module Federation: при `singleton` и расхождении версий «a higher version will be loaded», а стороне с меньшей версией выдаётся предупреждение. Если версия ниже `requiredVersion`, тоже «a warning will be given in the console». **[проверено]** [module-federation.io: shared](https://module-federation.io/configure/shared)
- `strictVersion: true` вместе с `singleton` превращает предупреждение в ошибку рантайма: «Throws a runtime error if the required version is not found»; в примере webpack — «Singleton or modules without fallback will throw». **[проверено]** [webpack ModuleFederationPlugin](https://webpack.js.org/plugins/module-federation-plugin/). На странице module-federation.io поведение `strictVersion` не описано; в [troubleshooting](https://module-federation.io/guide/troubleshooting/runtime) он упоминается среди настроек, которые надо сверить между хостом и remote. **[проверено]**
- По умолчанию webpack делит только корень пакета. Для подпутей нужен ключ с `/` на конце (`"date-fns/"`), и он «has an impact on performance especially in development mode». **[проверено]** [webpack ModuleFederationPlugin](https://webpack.js.org/plugins/module-federation-plugin/), раздел «Sharing libraries»
- `@apollo/client` 4 экспортирует десятки подпутей (`./react`, `./cache`, `./link/http`, `./utilities/internal` …). **[проверено]** `npm view @apollo/client@4.3.6 exports`. Значит, при общем `@apollo/client` в `shared` надо перечислять подпути или делить пакет целиком через `/`, иначе часть модулей останется своей у каждого приложения. **[вывод]**; что `@module-federation/enhanced` ведёт себя здесь так же, как webpack, по документации module-federation.io не проверено.
- Отдельные share scopes позволяют изолировать часть общих зависимостей: «Both sides must list a Scope before a shared dep can really be reused under it». Пример применения из документации webpack: виджет, который «must not adopt the host's version». **[проверено]** [module-federation.io: Multiple Shared Scopes](https://module-federation.io/guide/advanced/multiple-shared-scope), [webpack ModuleFederationPlugin](https://webpack.js.org/plugins/module-federation-plugin/), раздел `shareScope`

## 4. Варианты и как в каждом remote-приложение узнаёт об изменениях

Пример из домена: `transactions` создаёт транзакцию, `accounts` показывает баланс счёта.

### Общие механизмы Apollo, от которых зависят оба варианта

- Нормализованный кэш: id объекта в кэше — `__typename` + `id` (или `_id`). Новые поля объекта с тем же id перезаписывают старые, остальные поля сохраняются. **[проверено]** [Caching overview](https://www.apollographql.com/docs/react/caching/overview)
- Лучшая практика — возвращать из мутации все изменённые объекты: Apollo кладёт их в кэш и обновляет поля существующих. Но новый объект «isn't automatically added to any list fields»: для списков нужен `update` с `cache.modify` / `cache.writeFragment` или `refetchQueries`. **[проверено]** [Mutations](https://www.apollographql.com/docs/react/data/mutations)
- `refetchQueries` / `client.refetchQueries`: `include` принимает имена запросов, `DocumentNode`, `"active"` или `"all"`; `updateCache` меняет поля кэша и перезапрашивает зависящие от них запросы; `onQueryUpdated` решает, какие запросы перезапросить (вернуть `false` — не перезапрашивать). Документация предупреждает, что `"active"` без фильтра через `onQueryUpdated` может быть «ill-advised». **[проверено]** [Refetching queries](https://www.apollographql.com/docs/react/data/refetching)
- Баланс в примере — производное значение на сервере, мутация `createTransaction` возвращает `Transaction`, а не `Account`. Поэтому поле `Account.balance` в нормализованном кэше само не изменится ни в каком варианте: нужно либо вернуть затронутые счета в ответе мутации, либо перезапросить или вытеснить их. **[вывод]** из документации Mutations; типа `Account` в текущей схеме `server/src/graphql/schema.ts` ещё нет.

### Вариант А: один общий клиент (хост создаёт, remote-приложения используют)

Как устроено: `@apollo/client` в `shared` как синглтон, `shell` создаёт `ApolloClient` и `ApolloProvider`, remote-приложения берут клиент из контекста. **[вывод]**: готового официального примера «Apollo + Module Federation» ни у Apollo, ни у module-federation.io не нашлось.

Как узнают об изменениях:

- Кэш один. Если ответ мутации `transactions` содержит обновлённый `Account { id balance }`, запросы `accounts`, читающие этот счёт, обновятся из кэша без сети. **[вывод]** из Caching overview и Mutations.
- `refetchQueries: ['AccountsBalances']` из `transactions` дотянется до запроса `accounts`, потому что оба зарегистрированы в одном клиенте. Но так `transactions` должен знать имя запроса чужого микрофронтенда: это знание о внутренностях `accounts`. **[вывод]**
- Альтернатива без имён: `updateCache` / `cache.evict` для полей счёта и автоматический перезапрос тех, кто их читает. **[вывод]** из описания `updateCache`. Здесь `transactions` знает только схему (`Account`), а не запросы `accounts`; схема и так общий контракт по ADR-0002.

Подводные камни синглтона при независимых версиях:

- Выигрывает наибольшая версия из загруженных, расхождение — лишь предупреждение в консоли (без `strictVersion`). Remote-приложение, собранное и протестированное с Apollo 4.2, на странице может получить 4.3 или наоборот. **[проверено]** поведение `singleton`; **[вывод]** последствия.
- Мажорное обновление Apollo (3 → 4 поменяло пути импорта, например на `@apollo/client/react`) придётся катить согласованно во всех приложениях, иначе `strictVersion` уронит загрузку, а без него приложение получит несовместимый API. **[вывод]**
- Настройки клиента общие: `link`, `typePolicies` кэша, `defaultOptions`, обработка ошибок. Если `typePolicies` для типа нужна одному remote-приложению, её всё равно задаёт владелец клиента (хост) или нужен механизм регистрации. **[вывод]**
- Хост перестаёт быть «пустым»: он знает адрес GraphQL и конфигурацию кэша. ADR-0001 запрещает `shell` знать о домене; знает ли он о домене через `typePolicies` — вопрос проекта. **[вывод]**
- Отдельный запуск remote-приложения без хоста (пункт «Not yet specified» в #3) требует, чтобы у remote был свой клиент на этот случай. **[вывод]**

### Вариант Б: свой клиент в каждом remote-приложении

Как устроено: каждое remote-приложение создаёт свой `ApolloClient` с собственным `InMemoryCache` и оборачивает своё дерево в свой `ApolloProvider` (или передаёт `client` в хуки). `@apollo/client` либо не в `shared`, либо в `shared` без `singleton`. **[вывод]**

Как узнают об изменениях:

- Кэши раздельные, `refetchQueries` одного клиента не видит запросы другого (раздел 1). Нужен канал вне Apollo: событие в браузере (`CustomEvent` на `window`, `BroadcastChannel`) или общий модуль-шина через Module Federation. Получатель по событию вызывает у своего клиента `refetchQueries` / `cache.evict`. **[вывод]**
- В Apollo Client 4.2 появился `RefetchEventManager`: перезапросы по событиям, встроенные источники `windowFocusSource` и `onlineSource`, собственные события через `sources` и метод `emit`, отказ запроса от события через опцию `refetchOn`. Он подключается к одному клиенту через конструктор. **[проверено]** [Event-based refetching](https://www.apollographql.com/docs/react/data/event-based-refetching), [CHANGELOG 4.2.0](https://github.com/apollographql/apollo-client/blob/main/CHANGELOG.md), [исходник RefetchEventManager.ts](https://github.com/apollographql/apollo-client/blob/main/src/core/RefetchEventManager.ts). Его источник событий — функция, возвращающая `Observable`, так что межмикрофронтендное событие можно подать как собственный источник. **[вывод]** из типа `EventSource<T> = () => Observable<T>`.
- `windowFocusSource` даёт грубую страховку: данные обновятся при возврате на вкладку, но не сразу после мутации в соседнем микрофронтенде. **[вывод]**

Компромиссы:

- Плюсы: версия и настройки Apollo у каждого приложения свои, приложение запускается само по себе, хост не знает про GraphQL. **[вывод]**
- Минусы: данные, нужные нескольким приложениям, запрашиваются и хранятся в нескольких кэшах; согласованность держится на событиях, которые надо проектировать как контракт. Если `@apollo/client` не общий, его код грузится в каждом приложении. **[вывод]**
- Ловушка из раздела 2: при общем `react` remote-приложение без своего `ApolloProvider` молча возьмёт клиент хоста, если хост его положил. **[вывод]** из исходника `ApolloContext.ts`.

### Вариант В: подписки (subscriptions)

- Apollo: «In the majority of cases, your client should not use subscriptions to stay up to date with your backend»; лучше опрос или перезапрос по требованию. Подписки — для мелких инкрементальных изменений больших объектов и для низкой задержки (чат). Транспорт — `GraphQLWsLink` на `graphql-ws`. **[проверено]** [Subscriptions](https://www.apollographql.com/docs/react/data/subscriptions)
- Apollo Server: «does not provide built-in support for subscriptions in non-federated graphs», нужны `graphql-ws`, `ws`, отдельный WebSocket-сервер; «Subscriptions are not supported by Apollo Server's `startStandaloneServer`»; встроенный `PubSub` «not recommended for production». **[проверено]** [Apollo Server: Subscriptions](https://www.apollographql.com/docs/apollo-server/data/subscriptions)
- В `server/src/app.ts` сейчас `startStandaloneServer`, то есть подписки потребуют перехода на `expressMiddleware` или другую интеграцию. **[проверено]** по коду репозитория.
- Подписки работают в обоих вариантах А и Б: каждый клиент сам подписывается на событие сервера, и общий клиент для этого не нужен. **[вывод]**

## 5. Альтернативы Apollo (кратко)

- **urql** по умолчанию использует кэш документов: результат запроса хранится по ключу «запрос + переменные». Когда мутация возвращает типы, которые есть в результатах другого запроса, этот результат удаляется из кэша. Пустой список не содержит `__typename`, поэтому для него нужен `additionalTypenames` или нормализованный кэш Graphcache. **[проверено]** [urql: Document Caching](https://github.com/urql-graphql/urql/blob/main/docs/basics/document-caching.md). Инвалидация по типу (`Transaction`) работает внутри одного клиента; между клиентами вопрос тот же, что у Apollo. **[вывод]**
- **TanStack Query** (с любым GraphQL-фетчером): `queryClient.invalidateQueries` помечает запросы устаревшими по префиксу ключа (`['accounts']`), а отображаемые запросы «will also be refetched in the background». **[проверено]** [Query Invalidation](https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation). Нормализованного кэша нет, синхронизация идёт через ключи; `QueryClientProvider` принимает один `client`. **[проверено]** [QueryClientProvider](https://tanstack.com/query/latest/docs/framework/react/reference/QueryClientProvider). Ключи запросов — ещё один контракт между микрофронтендами, если инвалидировать чужие запросы. **[вывод]**

## Сводка компромиссов

|                                    | Один общий клиент                                                        | Клиент на каждое remote-приложение                           |
| ---------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------ |
| Данные между remote-приложениями   | общий нормализованный кэш, `refetchQueries` / `updateCache` достают всех | только через внешний канал событий + перезапрос у получателя |
| Что знает отправитель              | схему (`Account`) или имена чужих запросов                               | имя и форму события                                          |
| Версия Apollo                      | одна на страницу, выигрывает наибольшая; мажор — согласованно везде      | у каждого своя                                               |
| Настройка (`link`, `typePolicies`) | у владельца клиента (хоста)                                              | у каждого приложения                                         |
| Запуск remote без хоста            | нужен запасной клиент                                                    | работает сразу                                               |
| Объём кода                         | одна копия Apollo                                                        | копия в каждом приложении (если не `shared`)                 |

## Чего не нашлось

- Официального примера Apollo Client с Module Federation ни в документации Apollo, ни на module-federation.io: варианты А и Б собраны из общих механизмов. Не искал по сообществу (блоги, примеры третьих сторон) намеренно, они не первоисточник.
- Документации module-federation.io о `strictVersion` и о подпутях в `shared` для `@module-federation/enhanced`: факты взяты из документации webpack, поведение enhanced-рантайма стоит проверить в коде или на прототипе.
