import { ENV } from '~/config/env';
import HttpClient from '~/utils/http-client';
import { logger } from '~/utils/logger';

export const defaultHeaders = {
  'User-Agent': `${ENV.adapters.spotify.clientVersion} (Macintosh; Apple Silicon)`,
};

export async function fetchMetadata(
  link: string,
  headers: Record<string, string> = defaultHeaders
) {
  const url = link;

  const html = await HttpClient.get<string>(url, { headers });

  logger.info(`[${fetchMetadata.name}] parse metadata: ${url}`);

  return html;
}
