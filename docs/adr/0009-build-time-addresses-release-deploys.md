# Адреса remote-приложений задаются при сборке, выкатывается выпуск release-please

Потребитель узнаёт адрес производителя при сборке: `shell` получает `FINFLOW_TRANSACTIONS_URL`, `FINFLOW_ACCOUNTS_URL` и `FINFLOW_ANALYTICS_URL`, а `transactions` — `FINFLOW_ACCOUNTS_URL` для `AccountPicker`. Каждое remote-приложение так же получает `FINFLOW_GRAPHQL_URL`. В проде это стабильные production-домены проектов Cloudflare Pages: новая версия производителя видна после перезагрузки страницы, и пересобирать потребителя для этого не нужно. Рантайм-конфиг `remotes.json` с `registerRemotes` позволил бы закрепить конкретный неизменяемый деплой и откатываться правкой конфига. Но закреплять версии одному пользователю незачем, а `transactions` со своим экземпляром Module Federation понадобился бы свой путь к тому же конфигу.

Приложение выкатывается, когда release-please выпускает его новую версию, и в прод уходит сборка тега. В проде всегда работает выпущенная версия с changelog, а откат — это тот же деплой старого тега.

## Consequences

- Окружений два: local и production. Preview и staging нет. Значения по умолчанию — локальные адреса: `shell` 3000, `transactions` 3001, `accounts` 3002, `analytics` 3003, `server` 4000. Поэтому `npm run dev` работает без настройки.
- В CI адреса берутся из GitHub Actions variables (это публичные URL). В secrets лежат только `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` и deploy hook Render.
- Статика каждого приложения — отдельный проект Cloudflare Pages, который получает сборку через Direct Upload (`wrangler pages deploy`). Pages сам отдаёт `Access-Control-Allow-Origin: *`, это нужно для `fetch` манифеста с чужого origin.
- Потребители указывают `mf-manifest.json`, а не `remoteEntry.js`. `publicPath` — `auto`. Манифест и точка входа отдаются с `max-age=0, must-revalidate`, чанки получают `[contenthash]` и `immutable` через `_headers`.
- `server` работает на Render Free, база — на Atlas Free с доступом `0.0.0.0/0` и паролем. Auto-deploy в Render выключен: workflow вызывает deploy hook с `?ref=<SHA тега server-vX.Y.Z>`. Сервер засыпает после 15 минут простоя, и первый запрос ждёт около минуты. Это принято: пинга нет, страницы показывают обычную загрузку.
- CORS на `server` остаётся `*` от `startStandaloneServer`: авторизации и cookies нет, а remote-приложение при отдельном запуске ходит с другого origin.
- Откат — ручной запуск (`workflow_dispatch`) того же деплоя с приложением и старым тегом. Кнопки Rollback в Cloudflare и Render — только экстренная мера, после которой всё равно запускается workflow. Следом в `master` идёт revert, выпускаемый как `fix`, чтобы следующий выпуск не вернул ошибку.
- Коммиты `build`, `chore` и `refactor` не выкатываются до следующего `feat` или `fix`. Изменение сборки, которое должно уехать в прод, оформляется как `fix`.
- Типы remote-модулей потребитель в CI скачивает с production-адреса производителя (`typesOnBuild`), а `@mf-types` не хранится в git. Потребитель проверяется против выкаченного контракта, поэтому новый экспорт сначала выкатывает производитель, а уже потом им пользуется потребитель.
- Каждое приложение при сборке встраивает свою версию из `package.json`, пишет её в консоль при старте и в `buildVersion` своего `mf-manifest.json`. В интерфейсе версий нет.

## Considered Options

- Рантайм-конфиг `remotes.json` и `registerRemotes`: закрепление версий и откат без пересборки, но ещё один артефакт для выката, а типы только через `remoteTypeUrls`.
- Сервис-реестр remote-приложений: для MVP избыточен.
- Деплой на каждый push в `master`: изменения сборки уезжают сразу, но версия в проде расходится с тегами и changelog.
- Vercel Hobby для статики: только некоммерческое использование и 100 деплоев в сутки. Cloudflare Workers Static Assets: CORS пришлось бы задавать вручную.
- Koyeb Free для `server`: засыпает реже, но нужна карта и доступна одна инстанция.
- Закоммиченные `@mf-types`: сборка не зависит от сети, но типы молча отстают от прода.
