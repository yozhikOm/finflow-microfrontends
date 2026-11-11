import { describe, expect, it } from 'vitest';
import addresses from '../fixtures/addresses.json' with { type: 'json' };
import { routes } from './index.js';

// «Золотые» фикстуры (ADR-0012): адреса, которые строили эта и прошлые версии
// пакета. Каждый обязан разбираться в записанные параметры. Фикстуры пишутся
// руками, удаляются и меняются только в major.
interface Fixture {
  route: string;
  url: string;
  params: Record<string, unknown>;
}

const fixtures: Fixture[] = addresses;

describe('golden address fixtures', () => {
  it.each(Object.keys(routes))('has at least one fixture for %s', (name) => {
    expect(fixtures.some((fixture) => fixture.route === name)).toBe(true);
  });

  it.each(fixtures)('parses $url as $route', ({ route, url, params }) => {
    expect(Object.keys(routes)).toContain(route);
    const parse = routes[route as keyof typeof routes].parse;
    expect(parse(url)).toEqual(params);
  });
});
