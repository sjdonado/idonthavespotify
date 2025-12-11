import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import type { Server } from 'bun';

import { ENV } from '~/config/env';

import { createTestApp, nodeFetch } from './utils/request';
import { apiSearchEndpoint } from './utils/shared';

describe('Auth middleware', () => {
  let app: Server<undefined>;
  let searchEndpointUrl: string;
  let originalApiAuthKey: string | undefined;

  beforeAll(() => {
    // Save original API_AUTH_KEY
    originalApiAuthKey = ENV.app.apiAuthKey;
  });

  afterAll(() => {
    // Restore original API_AUTH_KEY
    ENV.app.apiAuthKey = originalApiAuthKey;
  });

  describe('when API_AUTH_KEY is not configured', () => {
    beforeAll(() => {
      ENV.app.apiAuthKey = undefined;
      app = createTestApp();
      searchEndpointUrl = apiSearchEndpoint(app.url);
    });

    afterAll(() => {
      app.stop();
    });

    it('should allow requests without Authorization header', async () => {
      const response = await nodeFetch(searchEndpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          link: 'https://open.spotify.com/track/3AhXZa8sUQht0UEdBJgpGc',
        }),
      });

      // Should not return 401 (will return 500 or 200 depending on mocks)
      expect(response.status).not.toBe(401);
    });
  });

  describe('when API_AUTH_KEY is configured', () => {
    const testApiKey = 'test-api-key-12345';

    beforeAll(() => {
      ENV.app.apiAuthKey = testApiKey;
      app = createTestApp();
      searchEndpointUrl = apiSearchEndpoint(app.url);
    });

    afterAll(() => {
      app.stop();
    });

    it('should return 401 when Authorization header is missing', async () => {
      const response = await nodeFetch(searchEndpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          link: 'https://open.spotify.com/track/3AhXZa8sUQht0UEdBJgpGc',
        }),
      });

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data).toEqual({
        error: 'Unauthorized: Invalid or missing API key',
      });
    });

    it('should return 401 when Authorization header format is invalid', async () => {
      const response = await nodeFetch(searchEndpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'InvalidFormat',
        },
        body: JSON.stringify({
          link: 'https://open.spotify.com/track/3AhXZa8sUQht0UEdBJgpGc',
        }),
      });

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data).toEqual({
        error: 'Invalid Authorization header format. Expected: Bearer <token>',
      });
    });

    it('should return 401 when API key is incorrect', async () => {
      const response = await nodeFetch(searchEndpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer wrong-api-key',
        },
        body: JSON.stringify({
          link: 'https://open.spotify.com/track/3AhXZa8sUQht0UEdBJgpGc',
        }),
      });

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data).toEqual({
        error: 'Unauthorized: Invalid or missing API key',
      });
    });

    it('should allow requests with correct API key', async () => {
      const response = await nodeFetch(searchEndpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testApiKey}`,
        },
        body: JSON.stringify({
          link: 'https://open.spotify.com/track/3AhXZa8sUQht0UEdBJgpGc',
        }),
      });

      // Should not return 401 (will return 500 or 200 depending on mocks)
      expect(response.status).not.toBe(401);
    });

    it('should return 401 with WWW-Authenticate header', async () => {
      const response = await nodeFetch(searchEndpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          link: 'https://open.spotify.com/track/3AhXZa8sUQht0UEdBJgpGc',
        }),
      });

      expect(response.status).toBe(401);
      expect(response.headers.get('WWW-Authenticate')).toBe('Bearer');
    });
  });
});
