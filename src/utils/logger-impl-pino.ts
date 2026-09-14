import pino from 'pino';

import { readEnv } from '~/config/edge-env';

export const logger = pino({
  level: readEnv('LOG_LEVEL') ?? 'debug',
});
