## Commits

Write every commit message as a [Conventional Commit](https://www.conventionalcommits.org/): `<type>(<scope>): <subject>`, subject in lowercase imperative. Commitlint enforces this in CI (`commitlint.config.js`).

release-please reads these messages to version each app and write its `CHANGELOG.md`, so the type is a release decision:

- `feat` → minor bump, `fix` / `perf` → patch bump.
- `!` after the type or a `BREAKING CHANGE:` footer → major bump (minor while an app is below 1.0).
- `refactor`, `test`, `docs`, `style`, `build`, `ci`, `chore` → no release.

Scope is the app: `server`, `shell` or `transactions`. Root-level changes (CI, tooling, docs) take no scope.

release-please assigns a commit to an app by the paths it touches, not by its scope. Keep each commit within one app so it lands in the right changelog.

Versions in `package.json`, `.release-please-manifest.json` and every `CHANGELOG.md` belong to release-please: they change when the release PR merges.

## Checks

The apps are independent npm packages, each with its own lockfile. Lint and formatting run once from the repo root (`npm run lint`, `npm run format:check`). Typecheck, build and tests run inside each app. The server smoke test needs MongoDB at `MONGODB_URI` (default `mongodb://localhost:27017/finflow-test`).

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues on yozhikOm/finflow-microfrontends (via `gh`). See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
