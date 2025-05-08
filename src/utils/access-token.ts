import type { AccessToken } from '~/services/cache';

export async function getOrUpdateAccessToken(
  getCachedAccessToken: () => Promise<AccessToken | undefined>,
  fetchNewAccessToken: () => Promise<{ accessToken: string; expiresIn: number }>,
  cacheAccessToken: (token: AccessToken, expiresAt: number) => Promise<void>
) {
  const cache = await getCachedAccessToken();

  if (cache) {
    const { accessToken, expiresAt } = cache;

    const timeRemaining = expiresAt - Math.floor(Date.now() / 1000);

    if (timeRemaining > 3 * 60 * 60) {
      return accessToken;
    }

    // If the token is still valid but less than 3 hours, refresh in the background
    if (timeRemaining > 0) {
      refreshAccessTokenInBackground(fetchNewAccessToken, cacheAccessToken);
      return accessToken;
    }
  }

  const { accessToken, expiresIn } = await fetchNewAccessToken();
  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

  await cacheAccessToken({ accessToken, expiresAt }, expiresIn);

  return accessToken;
}

async function refreshAccessTokenInBackground(
  fetchNewAccessToken: () => Promise<{ accessToken: string; expiresIn: number }>,
  cacheAccessToken: (token: AccessToken, expiresAt: number) => Promise<void>
) {
  try {
    const { accessToken, expiresIn } = await fetchNewAccessToken();
    const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

    await cacheAccessToken({ accessToken, expiresAt }, expiresIn);
  } catch (err) {
    console.error('Error refreshing access token:', err);
  }
}
