import type { Server } from 'bun';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';

import { getCheerioDoc } from '~/utils/scraper';

import { createTestApp, nodeFetch } from './utils/request';

describe('Static routes and shell', () => {
  let app: Server<undefined>;

  beforeAll(() => {
    app = createTestApp();
  });

  afterAll(() => {
    app.stop();
  });

  it('serves the built stylesheet', async () => {
    const response = await nodeFetch(`${app.url}assets/index.min.css`);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/css');
  });

  it('serves the built client script', async () => {
    const response = await nodeFetch(`${app.url}assets/index.js`);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('javascript');
  });

  it('serves the favicon referenced by the layout', async () => {
    const response = await nodeFetch(`${app.url}assets/favicon.ico`);

    expect(response.status).toBe(200);
  });

  it('returns 404 for unknown asset paths', async () => {
    const response = await nodeFetch(`${app.url}assets/does-not-exist.js`);

    expect(response.status).toBe(404);
  });

  it('rejects directory traversal attempts', async () => {
    const encodedSlash = await nodeFetch(`${app.url}..%2Fpackage.json`);
    const encodedDots = await nodeFetch(`${app.url}%2e%2e/package.json`);
    const plain = await nodeFetch(`${app.url}../package.json`);

    for (const response of [encodedSlash, encodedDots, plain]) {
      expect(response.status).toBe(404);
      await expect(response.text()).resolves.not.toContain('"name": "idonthavespotify"');
    }
  });

  it('renders the shell with pinned htmx and no trackers', async () => {
    const response = await nodeFetch(app.url.toString());
    const html = await response.text();
    const doc = getCheerioDoc(html);

    const htmxScript = doc('script[src*="htmx.org"]').toArray();
    expect(htmxScript).toHaveLength(1);
    expect(htmxScript[0].attribs['src']).toContain('htmx.org@2.0.10');
    expect(htmxScript[0].attribs['integrity']).toMatch(/^sha384-/);

    expect(html).not.toContain('umami');
  });

  it('exposes rate limit headers on JSON responses', async () => {
    const response = await nodeFetch(`${app.url}api/status`);

    expect(response.status).toBe(200);
    expect(response.headers.get('x-ratelimit-limit')).not.toBeNull();
    expect(response.headers.get('x-ratelimit-remaining')).not.toBeNull();
  });
});
