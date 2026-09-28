import type { Server } from 'bun';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';

import { generateId } from '~/utils/encoding';

import { loadHeadSnapshots } from '../mocks/snapshots';
import { HttpMock } from '../utils/http-mock';
import { createTestApp, formDataFromObject, nodeFetch } from '../utils/request';

// NOTE: no ../utils/shared import here — it reads ENV at module-eval time,
// which would freeze config before the per-file env assignment above runs.
const apiSearchEndpoint = (baseUrl: URL) => `${baseUrl}api/search?v=1`;

const LINK = 'https://open.spotify.com/track/3AhXZa8sUQht0UEdBJgpGc';

// Gate on for this file only (bun test --isolate keeps it per-file): the
// Plunk key is the public-instance signal. Web search stays open on it;
// only /api/search is disabled until API keys land.
process.env['PLUNK_API_KEY'] ||= 'test-plunk-key';

describe('Public instance without the email wall', () => {
  let app: Server<undefined>;
  let searchEndpointUrl: string;
  let httpMock: HttpMock;

  const headSnapshots = loadHeadSnapshots();

  beforeAll(() => {
    app = createTestApp();
    searchEndpointUrl = apiSearchEndpoint(app.url);
    httpMock = new HttpMock();
  });

  afterAll(() => {
    app.stop();
    httpMock.restore();
  });

  it('disables API search with a machine-readable hint', async () => {
    const response = await nodeFetch(searchEndpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ link: LINK }),
    });
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: expect.any(String),
      auth: 'api-key',
    });
  });

  it('disables API search before validation', async () => {
    const invalid = await nodeFetch(searchEndpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ link: 'https://open.spotify.com/invalid' }),
    });
    expect(invalid.status).toBe(403);
  });

  it('leaves web search open', async () => {
    const home = await nodeFetch(`${app.url}`);
    expect(home.status).toBe(200);
    const homeHtml = await home.text();
    expect(homeHtml).toContain('id="song-link"');
    expect(homeHtml).not.toContain('gate-modal');

    // Invalid links fail validation without touching upstream.
    const invalid = await nodeFetch(`${app.url}search`, {
      method: 'POST',
      body: formDataFromObject({ link: 'https://open.spotify.com/invalid' }),
    });
    expect(invalid.status).toBe(400);
    expect(invalid.headers.get('content-type')).toContain('text/html');
  });

  it('serves a real web search with no identity', async () => {
    // Only metadata is stubbed; every other adapter misses its mock and
    // degrades to an unverified link, so 200 proves the open path runs.
    httpMock
      .onGet('https://open.spotify.com/embed/track/3AhXZa8sUQht0UEdBJgpGc')
      .reply(200, headSnapshots.spotifyTrackRollingStone);

    const search = await nodeFetch(`${app.url}search`, {
      method: 'POST',
      body: formDataFromObject({ link: LINK }),
    });
    expect(search.status).toBe(200);
    expect(search.headers.get('hx-replace-url')).toMatch(/^\/?\?id=.+/);
    expect(await search.text()).toContain('search-card');
    httpMock.reset();
  });

  it('leaves share pages ungated', async () => {
    // Garbage id reaches search (and fails there) instead of hitting a wall.
    const denied = await nodeFetch(`${app.url}?id=whatever`);
    expect(denied.status).not.toBe(401);
    expect(denied.headers.get('x-auth-required')).toBeNull();

    // A real id renders the result card with no identity.
    httpMock
      .onGet('https://open.spotify.com/embed/track/3AhXZa8sUQht0UEdBJgpGc')
      .reply(200, headSnapshots.spotifyTrackRollingStone);

    const page = await nodeFetch(`${app.url}?id=${generateId(LINK)}`);
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('search-card');
    httpMock.reset();
  });

  it('retires the email auth endpoints', async () => {
    for (const endpoint of ['request-code', 'verify-code']) {
      const json = await nodeFetch(`${app.url}api/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'user@gmail.com', code: '000000' }),
      });
      expect(json.status).toBe(410);

      const form = await nodeFetch(`${app.url}api/auth/${endpoint}`, {
        method: 'POST',
        body: formDataFromObject({ email: 'user@gmail.com', code: '000000' }),
      });
      expect(form.status).toBe(410);
    }
  });

  it('reports an open gate on status', async () => {
    const status = await nodeFetch(`${app.url}api/status`);
    expect(status.status).toBe(200);
    const data = (await status.json()) as {
      gate: { enabled: boolean };
      identity?: unknown;
    };
    expect(data.gate.enabled).toBe(false);
    expect(data.identity).toBeUndefined();
  });

  it('keeps exactly one submittable code field in gate fragments', async () => {
    // Dormant email modules stay for the future API-key feature: htmx
    // parses swap responses inside a <template> element, where scripting
    // is disabled and <noscript> content parses as live, submittable
    // controls. A fallback code input there double-submits alongside the
    // hidden field and the server keeps the last (empty) value, so every
    // verify fails. Cheerio cannot model the scripting flag, so this
    // guards the raw markup instead.
    const { codeSentFragment, emailFormFragment } = await import(
      '~/abuse/routes'
    );
    for (const html of [
      codeSentFragment('web.user@gmail.com'),
      emailFormFragment('web.user@gmail.com', 'Some error'),
    ]) {
      expect(html).not.toMatch(
        /<noscript[^>]*>.*?(input|select|textarea|button)/s
      );
    }
  });
});
