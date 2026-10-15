import { readFile } from 'node:fs/promises';

import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

const sampleLink = 'https://open.spotify.com/track/0nrRP2bk19rLc0orkWPQk2';
const shareId = Buffer.from(sampleLink.replace('https://', '')).toString('base64');

test.beforeEach(async ({ browser }) => {
  const htmx = await readFile('node_modules/htmx.org/dist/htmx.min.js', 'utf8');
  // Serve the real, integrity-checked CDN script locally. Fonts and icons are cosmetic and must not turn provider availability into a test result.
  await browser.route(
    'https://cdn.jsdelivr.net/npm/htmx.org@4.0.0/dist/htmx.min.js',
    route => route.fulfill({ contentType: 'text/javascript', body: htmx })
  );
  await browser.route('https://cdn.jsdelivr.net/npm/@tabler/**', route =>
    route.fulfill({ contentType: 'text/css', body: '' })
  );
  await browser.route('https://fonts.cdnfonts.com/**', route =>
    route.fulfill({ contentType: 'text/css', body: '' })
  );
});

test('a visitor converts the sample track and reloads its universal link', async ({
  app,
  browser,
  screen,
}) => {
  await app.open('/');
  await expect(
    screen.getByRole('heading', { name: "I Don't Have Spotify" })
  ).toBeVisible();
  await screen.getByRole('button', { name: 'Try a sample track' }).click();
  await expect(screen.getByRole('heading', { name: 'Wake Me Up' })).toBeVisible();
  await expect(
    screen.getByRole('link', { name: 'Listen on Deezer (verified)' })
  ).toHaveAttribute('href', 'https://www.deezer.com/track/67238741');
  await expect(
    screen.getByRole('link', { name: 'Listen on Invidious (verified)' })
  ).toHaveAttribute('href', 'https://redirect.invidious.io/watch?v=IcrbM1l_BoI');
  await expect(browser).toHaveURL(new RegExp(`\\?id=${shareId}$`));
  await expect(
    screen.getByRole('button', { name: 'Try a sample track' })
  ).not.toBeVisible();
  await browser.reload();
  await expect(screen.getByRole('heading', { name: 'Wake Me Up' })).toBeVisible();
  await expect(
    screen.getByRole('link', { name: 'Listen on Deezer (verified)' })
  ).toBeVisible();
  await expect(browser.locator('[data-search-rows-loader]')).not.toBeVisible();
});

test('an invalid link shows an error without replacing the landing page', async ({
  app,
  screen,
}) => {
  await app.open('/');
  await screen.getByRole('textbox', { name: 'Search' }).fill('not a streaming link');
    await screen.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(
      screen.getByText('Invalid link, please try with', { exact: false })
    ).toBeVisible();
    await expect(screen.getByRole('button', { name: 'Try a sample track' })).toBeVisible();
  await expect(
    screen.getByRole('heading', { name: "I Don't Have Spotify" })
  ).toBeVisible();
});

test('a failed search preserves the previous result and its share URL', async ({
  app,
  browser,
  screen,
}) => {
  await app.open(`/?id=${shareId}`);
  await expect(
    screen.getByRole('link', { name: 'Listen on Deezer (verified)' })
  ).toBeVisible();
  await screen.getByRole('textbox', { name: 'Search' }).fill('not a streaming link');
  await screen.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(
    screen.getByText('Invalid link, please try with', { exact: false })
  ).toBeVisible();
  await expect(screen.getByRole('heading', { name: 'Wake Me Up' })).toBeVisible();
  await expect(
    screen.getByRole('link', { name: 'Listen on Deezer (verified)' })
  ).toBeVisible();
  await expect(browser).toHaveURL(new RegExp(`\\?id=${shareId}$`));
});
