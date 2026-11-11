# @yozhikom/finflow-routes

Prefixes of the FinFlow remote apps and their public addresses (ADR-0008). Links to a neighbour app, and to an app's own public address, are built only through this package, so a changed address breaks compilation instead of a link in production.

```ts
import { prefixes, routes } from '@yozhikom/finflow-routes';

routes.transactions.build({ month: '2026-03', currency: 'RUB' });
// '/transactions?month=2026-03&currency=RUB'

routes.transactions.parse('/transactions?month=2026-13&category=c1');
// { category: 'c1' }: a parameter of the wrong shape is silently dropped

routes.account.parse('/analytics'); // null: not this address
```

| Address             | Builder and parser      | Parameters                                                      |
| ------------------- | ----------------------- | --------------------------------------------------------------- |
| `/transactions`     | `routes.transactions`   | optional `category`, `month` (`YYYY-MM`), `currency`, `account` |
| `/transactions/new` | `routes.newTransaction` | optional `account`                                              |
| `/accounts/<id>`    | `routes.account`        | `id`                                                            |
| `/analytics`        | `routes.analytics`      | none                                                            |

`parse` takes a path with a query or an absolute URL and returns the typed parameters, or `null` when the URL is a different address. Whether the entity behind an id exists is checked by the owner app.

## Compatibility

Each app bundles its own version of the package, so versions must understand each other. `fixtures/addresses.json` holds golden addresses built by this and past versions; the tests require every one of them to parse, and at least one fixture per public address. A fixture is removed or changed only in a major release: CI compares the fixtures with the latest `routes-v*` tag and fails unless the PR title is marked with `!`.

A new address or parameter is a `feat` (minor). A renamed or removed address, parameter or prefix is a `feat!` (major) and ships in the expand–contract steps of ADR-0011.
