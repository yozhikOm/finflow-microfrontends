# @yozhikom/finflow-ui

UI-кит FinFlow: тема, элементы форм и списков, `MoneyText`, `MoneyInput` и `ErrorState` (ADR-0005). Приложения берут из кита общие компоненты, поэтому выглядят одинаково.

Кит публикуется исходниками (`.tsx` и `.module.css`), без шага сборки. CSS-модули компилирует сборка потребителя со своим `uniqueName`, поэтому классы двух копий кита на одной странице не совпадают. В `shared` Module Federation кит не входит: каждое приложение бандлит свою версию. Сущностей FinFlow (счетов, категорий, транзакций) в ките нет, компоненты с владельцем, как `AccountPicker`, остаются у владельца (ADR-0001).

## Подключение

```sh
npm install --save-exact @yozhikom/finflow-ui
```

Версия пишется точно (`1.3.0`): какой кит забандлен в приложение, видно прямо в `package.json` (ADR-0013). React — `peerDependency`.

Что нужно от сборки потребителя:

- `tsc` проверяет исходники кита по настройкам приложения. Нужно объявление CSS-модулей с именованными экспортами:

  ```ts
  // src/css-modules.d.ts
  declare module '*.module.css' {
    const classes: Readonly<Record<string, string>>;
    export = classes;
  }
  ```

- Rspack компилирует `.tsx` и `.module.css` из `node_modules`: правило `builtin:swc-loader` без `exclude: /node_modules/`, CSS через `type: 'css/auto'`, а в `localIdentName` есть `[uniqueName]` (ADR-0007).

## Тема

```ts
import '@yozhikom/finflow-ui/theme.css';
```

`theme.css` задаёт имена и значения токенов одной светлой темы как CSS-переменные на `:root`: `--ff-color-*`, `--ff-font-*`, `--ff-space-*` и другие. Подключает её только `shell` и dev-обёртки remote-приложений. В сборку remote-приложения значения не попадают: на странице действует тема `shell`.

Компоненты кита пользуются только токенами. Тест пакета падает, если CSS-модуль кита ссылается на необъявленный токен или пишет цвет или размер сам.

## Компоненты

```tsx
import {
  Button,
  ErrorState,
  Field,
  FieldError,
  Input,
  List,
  ListItem,
  MoneyInput,
  MoneyText,
  Select,
  type MoneyInputValue,
} from '@yozhikom/finflow-ui';
```

- `Field` — подпись, элемент ввода, подсказка и ошибка (`error`). Элемент ввода находится по подписи, ошибка и подсказка — его описание, при ошибке он `aria-invalid`.
- `Input`, `Select` — поле и выбор из списка на нативных элементах. Варианты `Select` — дочерние `<option>`.
- `FieldError` — текст ошибки у поля. Внутри `Field` его ставит сам `Field`, отдельно — например, «Не удалось сохранить. Попробуйте ещё раз» у кнопки отправки.
- `Button` — `variant`: `primary`, `secondary`, `ghost`; `size`: `md`, `sm`. По умолчанию `type="button"`.
- `List`, `ListItem` — список строк: имя, описание, значение справа (`aside`), действия (`actions`). Без строк `List` показывает `emptyText`.
- `MoneyText` — сумма для чтения: `{ amount: 35050, currency: 'RUB' }` → «350,50 ₽». `signDisplay` и `colored` — для сальдо.
- `MoneyInput` — ввод суммы и выбор её валюты из `currencies`.
- `ErrorState` — сбой на месте блока, строки или поля (ADR-0014): текст, необязательный колбэк `retry` и компактный вариант `compact`.

### `MoneyInput`

```tsx
const [amount, setAmount] = useState<MoneyInputValue>({
  amount: null,
  currency: 'RUB',
});

<Field label="Сумма" error={amountError}>
  <MoneyInput
    value={amount}
    onChange={setAmount}
    currencies={['RUB', 'USD', 'EUR']}
  />
</Field>;
```

Сумма — в минимальных единицах валюты, как Money в `GLOSSARY.md`: ввод «350,50» RUB даёт `{ amount: 35050, currency: 'RUB' }`. Поле понимает запятую и точку, пробелы между разрядами и «350,5». Пока в поле пусто или не число, `amount` — `null`. Минус разрешает `allowNegative`, например для начального остатка кредитки. С одной валютой в `currencies` выбора нет, её код стоит рядом с суммой.

Тип значения структурный: кит не знает типов GraphQL, а `Money` приложения подходит к `MoneyInputValue` как есть.

### `ErrorState` как рендер сбоя кода

Имя колбэка совпадает с `RemoteFailureProps` из `@yozhikom/finflow-remote`, поэтому сбой кода и сбой данных выглядят одинаково по построению:

```tsx
const AccountPicker = remoteComponent(loadAccountPicker, {
  loading: <FieldSkeleton />,
  failure: ({ retry }) => (
    <ErrorState compact text="Счета временно недоступны" retry={retry} />
  ),
});
```

## Витрина и тесты

```sh
npm run storybook   # витрина на http://localhost:6006
npm test            # stories как тесты взаимодействий и a11y, проверка токенов
npm run build       # сборка витрины в storybook-static
```

Stories — тесты (ADR-0012): `play` проверяет взаимодействие, `@storybook/addon-a11y` роняет story при нарушении доступности. Их запускает Vitest в Chromium через `@storybook/addon-vitest`. Перед первым запуском нужен браузер: `npx playwright install chromium`.

Витрина подключает `theme.css` так же, как `shell`. Её деплой на Cloudflare Pages — отдельная задача.

## Какая версия нужна

- Новый компонент, проп или токен — `feat`, минорная версия.
- Изменение значения токена или вида компонента — `fix` или `feat` по смыслу.
- Удаление или переименование токена, компонента или пропа — `feat!`, мажорная версия.

Версии кита у `shell` и remote-приложения могут расходиться, поэтому токены в минорной версии только добавляются. CI сверяет имена токенов `theme.css` с последним тегом `ui-v*` (`scripts/check-narrowing.js`): удаление или переименование токена без `!` в заголовке PR даёт красный CI. Новый токен сначала выкатывает `shell`, потом им пользуются remote-приложения.

## Первый выпуск

Пакет публикуется из workflow `release-please.yml` через trusted publishing, без `NPM_TOKEN` (ADR-0013). Trusted publisher на npmjs.com можно настроить только у пакета, который уже есть в реестре. Поэтому версию `1.0.0` публикуют один раз вручную:

1. Влить release PR пакета. Release-please создаст тег `ui-v1.0.0`. Job `publish` упадёт с ошибкой «ещё нет на npmjs»: так и должно быть.
2. Проверить и опубликовать сборку тега. Собирать пакет не нужно, он публикуется исходниками:

   ```sh
   git checkout ui-v1.0.0
   cd packages/ui
   npm ci && npx playwright install chromium
   npm run typecheck && npm test
   npm publish --access public
   ```

3. На npmjs.com в настройках пакета добавить trusted publisher: GitHub Actions, репозиторий `yozhikOm/finflow-microfrontends`, workflow `release-please.yml`. Имя файла должно совпадать точно.

Перезапускать упавший job не нужно: версия `1.0.0` уже опубликована. Следующие версии публикует workflow.
