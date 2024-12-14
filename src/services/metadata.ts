import HttpClient from '~/utils/http-client';
import { logger } from '~/utils/logger';

export const defaultHeaders = {};

export async function fetchMetadata(link: string, headers: Record<string, string> = {}) {
  const url = link;
  const html = await HttpClient.get<string>(url, {
    ...defaultHeaders,
    headers,
  });

  logger.info(`[${fetchMetadata.name}] parse metadata: ${url}`);

  return html;
}
