# Бесплатный хостинг для remote-приложений, `shell` и `server` с MongoDB

Исследование к задаче [#7](https://github.com/yozhikOm/finflow-microfrontends/issues/7). Здесь только факты и компромиссы, решение не принимается.

**Дата проверки всех источников: 2026-11-04.** Условия бесплатных тарифов часто меняются: прежде чем на них опираться, перепроверьте страницы по ссылкам.

Обозначения:

- **[проверено]**: прямо сказано на официальной странице по ссылке, или заголовок увиден в ответе сервера (`curl -I`, 2026-11-04).
- **[вывод]**: следует из проверенных фактов, но прямо в документации не сказано. Перед решением стоит проверить на практике.

Отправная точка в репозитории (на 2026-11-04): `shell` подключает remote-приложение по жёсткому URL `transactions@http://localhost:3001/transactions.js` (`shell/module-federation.config.ts`). У `transactions` в `output.publicPath` прописан `http://localhost:3001/` (`transactions/rspack.config.ts`). `server` поднимается через `startStandaloneServer` из `@apollo/server/standalone` (`server/src/app.ts`).

## 1. Статика: `shell` и remote-приложения

### Сравнение

|                                            | GitHub Pages                                                                                                          | Cloudflare Workers (Static Assets) / Pages                  | Netlify Free                                                                      | Vercel Hobby                                                                               | Render Static Site                                                   |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| Свой URL для каждого приложения            | Один сайт на репозиторий: `<owner>.github.io/<repo>`. В монорепо все приложения делят один origin и живут в подпапках | Отдельный проект на приложение, по 100 на аккаунт           | Отдельный проект на приложение, до 500                                            | Отдельный проект на приложение, до 200, к одному Git-репозиторию можно подключить до 25    | Отдельный сервис на приложение. Всего 25 сервисов на workspace Hobby |
| Трафик                                     | 100 ГБ/мес (мягкий лимит)                                                                                             | Запросы к статике бесплатны и не ограничены                 | Списывается из 300 кредитов/мес: 20 кредитов за 1 ГБ                              | 100 ГБ Fast Data Transfer/мес                                                              | Общий месячный объём на workspace, цифра в документации не указана   |
| Цена деплоя                                | Таймаут деплоя 10 мин. Лимит «10 сборок/час» не действует для деплоя через свой workflow GitHub Actions               | Pages: 500 сборок/мес (сборки Cloudflare, одна параллельно) | **15 кредитов за production-деплой**                                              | 100 деплоев в сутки, один параллельный                                                     | Минуты сборки из общего месячного объёма                             |
| Что будет при превышении                   | 429 при rate limit                                                                                                    | Для статики лимита нет                                      | Все проекты встают на паузу со страницей `Site not available` до следующего цикла | По правилам fair use                                                                       | Без привязанной карты сервисы отключаются до конца периода           |
| Свои заголовки (CORS, кеш)                 | Механизма нет [вывод]                                                                                                 | Файл `_headers`, до 100 правил                              | Файл `_headers` или `netlify.toml`                                                | `headers` в `vercel.json`                                                                  | Есть, синтаксис на отдельной странице                                |
| `Cache-Control` по умолчанию               | `max-age=600` [проверено, curl]                                                                                       | `public, max-age=0, must-revalidate` + `ETag`               | `public, max-age=0, must-revalidate` (на CDN хранится до нового деплоя)           | `public, max-age=0, must-revalidate`                                                       | CDN-кеш сбрасывается при деплое. TTL по умолчанию не указан          |
| `Access-Control-Allow-Origin` по умолчанию | `*` [проверено, curl]                                                                                                 | Pages: `*` всегда. Workers Static Assets: не выставляется   | В документации не указан [вывод: задавать самим]                                  | `*` в ответе для статики Vercel [проверено, curl на nextjs.org, в документации не описано] | Не указан                                                            |
| Ограничения использования                  | Запрещён коммерческий хостинг и SaaS. Только публичные репозитории на GitHub Free                                     | —                                                           | —                                                                                 | Только некоммерческое личное использование                                                 | —                                                                    |

### Факты по площадкам

**GitHub Pages**

- Опубликованный сайт не больше 1 ГБ, трафик 100 ГБ/мес (мягкий лимит), 10 сборок в час (мягкий лимит; не действует для сайтов, которые публикует свой workflow GitHub Actions), таймаут деплоя 10 минут, при rate limit отдаётся 429 [проверено]. Источник: [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).
- «Maximum of one pages site per repository», адрес проектного сайта `http(s)://<owner>.github.io/<repositoryname>` [проверено]. Источник: [About GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages).
- На GitHub Free Pages работает только в публичных репозиториях [проверено]. Источник: [GitHub's plans](https://docs.github.com/en/get-started/learning-about-github/githubs-plans).
- Pages нельзя использовать как бесплатный хостинг для коммерции и SaaS [проверено]. Источник: [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).
- Ответ `pages.github.com` от 2026-11-04 содержит `Access-Control-Allow-Origin: *`, `Cache-Control: max-age=600`, `ETag`, `Last-Modified` и отдаётся через Fastly (Varnish) [проверено, curl].
- Задать свои HTTP-заголовки нельзя: в документации нет такого механизма [вывод].
- Деплой через `actions/deploy-pages` публикует один артефакт как весь сайт [вывод: документация описывает артефакт как один tar, но прямо не говорит, что он заменяет весь сайт]. Источник: [Using custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages). Отсюда для монорепо: чтобы выкатить одно remote-приложение, workflow должен собрать артефакт со всеми остальными или публиковать из ветки, где каждое приложение обновляет только свою подпапку [вывод].
- Все приложения живут на одном origin, поэтому CORS не нужен. Но и проверить настоящую кросс-доменную загрузку remote-приложения на таком хостинге не получится [вывод].

**Cloudflare Workers (Static Assets) и Cloudflare Pages**

- На странице Pages Cloudflare пишет: «Workers supports most Pages use cases… Start new projects with Workers» [проверено]. Источник: [Cloudflare Pages](https://developers.cloudflare.com/pages/).
- Workers Free: «Requests to static assets are free and unlimited», хранение статики ничего не стоит. Запросы, которые доходят до кода Worker, считаются отдельно: 100 000 в сутки и 10 мс CPU на вызов [проверено]. Источники: [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [Static Assets billing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/).
- Workers Free: до 20 000 файлов на версию, файл до 25 МиБ, 100 Workers на аккаунт [проверено]. Источник: [Workers limits](https://developers.cloudflare.com/workers/platform/limits/).
- Workers Static Assets читает `_headers` (до 100 правил, строка до 2000 символов). По умолчанию отдаёт `Cache-Control: public, max-age=0, must-revalidate` и `ETag` (хеш файла). `Access-Control-Allow-Origin` по умолчанию не ставится, его добавляют правилом `/*` [проверено]. Источник: [Static Assets headers](https://developers.cloudflare.com/workers/static-assets/headers/).
- Pages Free: 500 сборок в месяц, одна параллельная сборка, 20 000 файлов, файл до 25 МиБ, 100 своих доменов на проект, 100 проектов, 100 правил в `_headers` [проверено]. Источник: [Pages limits](https://developers.cloudflare.com/pages/platform/limits/).
- Pages всегда добавляет `Access-Control-Allow-Origin: *` и `ETag`, для кешируемых ассетов ставит `Cache-Control: public, max-age=0, must-revalidate`. На CDN ассеты лежат до следующего деплоя [проверено]. Источник: [Serving Pages](https://developers.cloudflare.com/pages/configuration/serving-pages/).
- Пример CORS в `_headers` из документации: `/*` → `Access-Control-Allow-Origin: *`. Заголовки из `_headers` не применяются к ответам Pages Functions [проверено]. Источник: [Pages headers](https://developers.cloudflare.com/pages/configuration/headers/).
- Из GitHub Actions деплоят через `cloudflare/wrangler-action` командой `pages deploy <dir> --project-name=<name>`. Нужны секреты `CLOUDFLARE_API_TOKEN` и `CLOUDFLARE_ACCOUNT_ID` [проверено]. Источник: [Direct Upload with CI](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/). Расходует ли Direct Upload лимит в 500 сборок, в документации не сказано [вывод: скорее нет, лимит относится к сборкам на стороне Cloudflare].

**Netlify (Free, тарифы на кредитах)**

- 300 кредитов в месяц, жёсткий лимит, докупить нельзя. Production-деплой стоит 15 кредитов, 1 ГБ трафика 20 кредитов, 10 000 запросов 2 кредита. Deploy previews, branch deploys и упавшие деплои бесплатны. До 500 проектов, одна параллельная сборка [проверено]. Источник: [Credit-based pricing plans](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/).
- Когда кредиты кончаются, «all of your web projects (sites/apps) are paused» и посетители видят `Site not available`. Баланс обновляется в начале цикла [проверено]. Источник: [How credits work](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/).
- Следствие: без трафика 300 кредитов хватает на 20 production-деплоев в месяц на все проекты сразу. С четырьмя приложениями, которые выкатываются по отдельности, это узкое место [вывод].
- Статика по умолчанию: `Cache-Control: public, max-age=0, must-revalidate` и `Netlify-CDN-Cache-Control: public, s-maxage=31536000, must-revalidate`. Каждый деплой сбрасывает кеш [проверено]. Источник: [Caching overview](https://docs.netlify.com/build/caching/caching-overview/).
- Свои заголовки задаются в `_headers` или `netlify.toml` и действуют только на файлы из хранилища Netlify, не на функции [проверено]. Источник: [Custom headers](https://docs.netlify.com/manage/routing/headers/).

**Vercel Hobby**

- 200 проектов, 100 деплоев в сутки, один параллельный деплой, до 25 проектов на один Git-репозиторий, загрузка через CLI до 100 МБ. Hobby не подключается к репозиториям Git-организаций [проверено]. Источник: [Limits](https://vercel.com/docs/limits). `yozhikOm` — личный аккаунт, так что ограничение на организации проект не задевает [вывод].
- В месяц входит 100 ГБ Fast Data Transfer, 1 000 000 вызовов функций, 4 часа Active CPU, 360 ГБ·ч Provisioned Memory. Hobby разрешён только для «non-commercial personal use» [проверено]. Источник: [Fair use guidelines](https://vercel.com/docs/limits/fair-use-guidelines).
- `Cache-Control` по умолчанию: `public, max-age=0, must-revalidate`. Свои заголовки задаются в `vercel.json` → `headers`. Статика лежит на CDN весь срок жизни деплоя [проверено]. Источники: [Cache-Control headers](https://vercel.com/docs/caching/cache-control-headers), [CDN cache](https://vercel.com/docs/caching/cdn-cache).
- Статика с `nextjs.org` (хостится на Vercel) отдаётся с `Access-Control-Allow-Origin: *` [проверено, curl]. В документации такого умолчания нет, надёжнее прописать заголовок в `vercel.json` [вывод].

**Render Static Site**

- Статические сайты бесплатны, но трафик и минуты сборки берутся из месячного объёма workspace. При успешной сборке Render «immediately invalidate[s] our CDN caches». На Hobby входит 2 своих домена [проверено]. Источник: [Static sites](https://render.com/docs/static-sites).
- На Hobby не больше 25 сервисов на workspace [проверено]. Источник: [New workspace plans](https://render.com/docs/new-workspace-plans). Сколько трафика и минут сборки входит в Hobby, документация не говорит: цифры есть только в дашборде и на странице цен, которая рендерится через JS. В сторонних обзорах встречается от 5 до 100 ГБ, цифры расходятся, **не проверено**.
- Если лимит превышен, а карта не привязана, Render «disables your services for the duration of the current billing period» [проверено]. Источник: [Render FAQ](https://render.com/docs/faq).

## 2. Node-сервер с Apollo

### Сравнение

|                                                     | Render Free Web Service                           | Koyeb Free Instance                                     | Vercel Functions (Hobby)              | Cloudflare Workers Free                                          | Fly.io                                           |
| --------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------ |
| Бесплатно                                           | Да                                                | Да, одна инстанция на организацию                       | Да, в пределах месячных объёмов       | Да                                                               | **Нет**: только пробный период                   |
| Засыпание                                           | Через 15 мин без трафика, просыпается около 1 мин | Масштабируется в ноль после 1 ч без трафика             | Serverless                            | Serverless                                                       | —                                                |
| Ресурсы                                             | 750 инстанс-часов/мес на workspace                | 512 МБ RAM, 0,1 vCPU, 2 ГБ SSD, Франкфурт или Вашингтон | 4 ч Active CPU, 1 млн вызовов         | 10 мс CPU на запрос, 128 МБ                                      | Пробный период: 2 ч машинного времени или 7 дней |
| Код сервера без изменений (`startStandaloneServer`) | Да [вывод]                                        | Да [вывод]                                              | Нет: нужен обработчик функции [вывод] | Нет: другой рантайм, совместимость Mongoose не проверена [вывод] | —                                                |

### Факты

- **Render Free:** засыпает через 15 минут без входящего трафика, просыпается «about one minute». Пока сервис спит, браузер видит страницу загрузки. Workspace получает 750 бесплатных часов в месяц; когда они кончаются, все бесплатные сервисы приостанавливаются до следующего месяца. Файловая система временная, масштабирования нет, Render может перезапустить сервис в любой момент. Бесплатный Postgres удаляется через 30 дней (для проекта неважно, он на MongoDB) [проверено]. Источник: [Deploy for Free](https://render.com/docs/free).
- У Render исходящие IP-диапазоны свои у каждого региона и общие для всех сервисов в нём; их можно внести в allowlist Atlas [проверено]. Распространяется ли это на бесплатные сервисы, отдельно не сказано. Источник: [Outbound IPs](https://render.com/docs/outbound-ip-addresses).
- **Koyeb:** «Each Free Instance provides 512MB of RAM, 0.1 vCPU, and 2GB of SSD», «Each organization is limited to one Free Instance», регионы Франкфурт и Вашингтон. Масштабируется в ноль после часа без трафика. Предназначена для тестов и хобби-проектов [проверено]. Источник: [Instances](https://www.koyeb.com/docs/reference/instances). Бесплатно 100 ГБ исходящего трафика в месяц. «We require a credit card to prevent fraud and abuse» [проверено]. Источник: [Pricing FAQ](https://www.koyeb.com/docs/faqs/pricing). Время холодного старта в документации не указано.
- **Fly.io:** «New organizations don't have a free tier or a monthly free usage allowance». Пробный период: 2 часа машинного времени или 7 дней, что раньше. Самая маленькая машина стоит $2.19/мес [проверено]. Источники: [Pricing](https://docs.fly.io/about/pricing), [Free trial](https://docs.fly.io/about/free-trial/).
- **Vercel Functions:** месячные объёмы перечислены выше. Под Vercel сервер пришлось бы переписать с `startStandaloneServer` на обработчик функции [вывод]. Mongoose советует для serverless держать подключение в глобальной переменной и ставить `serverSelectionTimeoutMS` [проверено]. Источник: [Mongoose + Lambda](https://mongoosejs.com/docs/lambda.html).
- **Cloudflare Workers:** 10 мс CPU на запрос на бесплатном тарифе [проверено]. Работает ли там Mongoose с драйвером MongoDB, по первоисточникам подтвердить не удалось [не проверено].
- **CORS на сервере:** `startStandaloneServer` отдаёт `Access-Control-Allow-Origin: *` без credentials, и это не настраивается. Чтобы пускать только адрес `shell` или передавать cookies, нужен `expressMiddleware` с пакетом `cors`. В Apollo Server 4+ по умолчанию включена защита от CSRF: запросы без `Content-Type: application/json` и без заголовка `Apollo-Require-Preflight` получают 400 [проверено]. Источник: [Apollo Server CORS](https://www.apollographql.com/docs/apollo-server/security/cors). POST с `application/json` из браузера всегда вызывает CORS preflight [проверено]. Источник: [MDN CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS).

## 3. MongoDB: Atlas Free (бывший M0)

- 0,5 ГБ данных вместе с индексами, до 500 подключений, 100 операций в секунду (сверх лимита Atlas троттлит с паузой в 1 с), 10 ГБ входящего и 10 ГБ исходящего трафика за скользящие 7 дней, один бесплатный кластер на проект, только часть регионов AWS/GCP/Azure, MongoDB 8.0 без ручного обновления [проверено]. Источник: [Atlas Free cluster limits](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/).
- Если 30 дней не было ни одного подключения, Atlas ставит кластер на паузу. Возобновить можно в любой момент [проверено]. Источник там же.
- Бэкапы на этот счёт расходятся: в документации по лимитам сказано, что снапшоты можно включить (ежедневно, хранится до четырёх), а на [странице цен](https://www.mongodb.com/pricing) у Free tier бэкапы указаны как недоступные [проверено, обе страницы].
- Atlas пускает только адреса из IP access list проекта, до 200 записей [проверено]. Источник: [IP access list](https://www.mongodb.com/docs/atlas/security/ip-access-list/). У бесплатных хостингов с плавающими IP обычно остаётся `0.0.0.0/0` [вывод].
- Следующий тариф, Flex, стоит от $8 до $30 в месяц, 5 ГБ [проверено]. Источник: [MongoDB pricing](https://www.mongodb.com/pricing).

## 4. Module Federation: CORS и кеширование

**Как загружаются файлы**

- `remotes` принимает `name@<url>`, где `<url>` указывает на `mf-manifest.json` или `remoteEntry.js` [проверено]. Источник: [MF remotes](https://module-federation.io/configure/remotes). С `manifest: true` плагин при каждой сборке генерирует `mf-manifest.json` [проверено]. Источник: [MF manifest](https://module-federation.io/configure/manifest).
- Рантайм MF получает манифест через `fetch(manifestUrl, {})` (`packages/runtime-core/src/plugins/snapshot/SnapshotHandler.ts`), а `remoteEntry.js` подключает через `document.createElement('script')` (`packages/sdk/src/dom.ts`) [проверено по исходникам [module-federation/core](https://github.com/module-federation/core), ветка по умолчанию на 2026-11-04].
- Выходит, что `mf-manifest.json` на чужом origin требует `Access-Control-Allow-Origin` (по MDN, `fetch()` подчиняется CORS). Классический `<script>` без `crossorigin` CORS не требует [вывод из проверенных фактов]. По умолчанию `output.crossOriginLoading` в Rspack равен `false`, атрибут `crossorigin` на чанки не ставится [проверено]. Источник: [Rspack output](https://rspack.rs/config/output). С `credentials` значение `*` в `Access-Control-Allow-Origin` запрещено [проверено, MDN].
- Хостинги с `Access-Control-Allow-Origin: *` по умолчанию: GitHub Pages и Cloudflare Pages; у Vercel тоже, но только по наблюдению. Workers Static Assets и Netlify требуют задать заголовок в `_headers` [см. раздел 1].

**Кеширование: как `shell` получит новую версию без пересборки**

- Имя файла точки входа не хешируется: `[name].js`, у нас `transactions.js`. По умолчанию имена чанков строятся из `output.filename`, то есть тоже без `contenthash` [проверено: Rspack output, конфиги в репозитории].
- Значит, `shell` подхватит новую версию remote-приложения без пересборки, если выполнены два условия. Первое: URL точки входа или манифеста стабилен, то есть это production-домен проекта, а не уникальный URL конкретного деплоя. Второе: браузер этот файл перепроверяет. Cloudflare, Netlify и Vercel по умолчанию отдают `max-age=0, must-revalidate` с `ETag` и сбрасывают кеш CDN при деплое, поэтому новая версия видна при следующей загрузке страницы [вывод из проверенных умолчаний].
- На GitHub Pages `max-age=600` поменять нельзя. После деплоя браузер до 10 минут может держать старую точку входа, причём старая и новая версии файлов без хеша могут смешаться [вывод].
- Обычный приём: хешировать имена чанков (`[contenthash]`) и отдавать их с `Cache-Control: public, max-age=31536000, immutable` через `_headers` или `vercel.json`, а точку входа и манифест оставить с `max-age=0, must-revalidate`. Пример `immutable` из документации Cloudflare: `/static/*` → `Cache-Control: public, max-age=31556952, immutable` [синтаксис проверен, сам подход — вывод].
- `publicPath` в remote-приложении сейчас указывает на `http://localhost:3001/`. Для деплоя его нужно задавать production-адресом при сборке или вычислять во время работы [вывод].

## 5. Компромиссы (без решения)

- **Статика.** Cloudflare (Workers Static Assets или Pages): статика не лимитирована, свои заголовки задаются, по умолчанию нет кеша в браузере. Pages сам ставит CORS `*`, но Cloudflare советует новые проекты начинать на Workers. Vercel Hobby: щедрые лимиты, но только некоммерческое использование. Netlify Free: 20 production-деплоев в месяц на все проекты, при исчерпании кредитов проекты встают на паузу. GitHub Pages: один origin на репозиторий и неизменяемый `max-age=600`; для учебной цели «настоящий кросс-доменный remote и независимый деплой» подходит хуже всех.
- **Сервер.** Render Free и Koyeb Free запускают `startStandaloneServer` как есть, но засыпают: Render через 15 минут и просыпается около минуты, Koyeb через час. Это скажется на первом запросе `shell` и на e2e-тестах против развёрнутой сборки. У Koyeb одна бесплатная инстанция на организацию и нужна карта. Vercel и Cloudflare Workers не засыпают в этом смысле, но под них придётся переписать сервер, а Mongoose на Workers не подтверждён. Fly.io бесплатного тарифа больше не даёт.
- **База.** Atlas Free почти безальтернативен для MongoDB бесплатно. 0,5 ГБ и 100 операций в секунду для учебного MVP вряд ли станут узким местом [вывод]. Остаётся вопрос сетевого доступа: allowlist IP-диапазонов Render или `0.0.0.0/0`.
