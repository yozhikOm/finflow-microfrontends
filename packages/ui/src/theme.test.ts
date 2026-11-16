/// <reference types="node" />
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Компоненты кита пользуются только токенами `theme.css` (ADR-0005). Значения
// приходят из темы, которую на странице подключает `shell`, поэтому цвет или
// размер, записанный прямо в CSS-модуль, обошёл бы тему.

const src = new URL('./', import.meta.url);
const read = (file: string) => readFileSync(new URL(file, src), 'utf8');
const withoutComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

const declared = new Set(
  Array.from(
    withoutComments(read('theme.css')).matchAll(/(--[\w-]+)\s*:/g),
    (m) => m[1],
  ),
);

const modules = readdirSync(src, { recursive: true, encoding: 'utf8' })
  .filter((file) => file.endsWith('.module.css'))
  .map((file) => ({ file, css: withoutComments(read(file)) }));

describe('theme.css', () => {
  it('declares tokens only on :root', () => {
    const selectors = Array.from(
      withoutComments(read('theme.css')).matchAll(/([^{}]+)\{/g),
      (m) => m[1]?.trim(),
    );
    expect(selectors).toEqual([':root']);
    expect(declared.size).toBeGreaterThan(0);
  });
});

describe.each(modules)('$file', ({ css }) => {
  it('uses only tokens declared in theme.css', () => {
    const used = Array.from(css.matchAll(/var\(\s*(--[\w-]+)/g), (m) => m[1]);
    expect(used.filter((token) => !declared.has(token))).toEqual([]);
  });

  it('has no colors, lengths or durations of its own', () => {
    const literals = css.match(
      /#[\da-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|lab)\(|\b\d*\.?\d+(?:px|rem|em|pt|ms|s)\b/gi,
    );
    expect(literals ?? []).toEqual([]);
  });
});

it('finds the CSS modules of the kit', () => {
  expect(modules.length).toBeGreaterThan(0);
});
