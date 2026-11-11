/**
 * Golden fixtures of one package, as `{ [file]: fixture[] }`.
 * @typedef {Record<string, unknown[]>} FixtureFiles
 */

/** JSON with object keys sorted, so key order does not count as a change. */
function canonical(value) {
  return JSON.stringify(value, (_key, item) =>
    item && typeof item === 'object' && !Array.isArray(item)
      ? Object.fromEntries(
          Object.entries(item).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
        )
      : item,
  );
}

/**
 * Fixtures of the previous version that the current version no longer has
 * unchanged: removed, changed or left in a removed file. Each of them narrows
 * the package contract (ADR-0012, ADR-0013).
 * @param {FixtureFiles} previous
 * @param {FixtureFiles} current
 * @returns {{ file: string, fixture: unknown }[]}
 */
export function findNarrowing(previous, current) {
  const narrowing = [];
  for (const [file, fixtures] of Object.entries(previous)) {
    const kept = new Set((current[file] ?? []).map(canonical));
    for (const fixture of fixtures) {
      if (!kept.has(canonical(fixture))) narrowing.push({ file, fixture });
    }
  }
  return narrowing;
}

/**
 * Whether a Conventional Commit header marks a breaking change with `!`
 * after the type or scope: `feat(routes)!: …`.
 * @param {string} title
 */
export function isBreakingTitle(title) {
  return /^\w+(\([^()]*\))?!:/.test(title);
}
