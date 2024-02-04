import pino from 'pino';
import pretty from 'pino-pretty';

export const stream = pretty({
  colorize: true,
});

export const logger = pino(
  {
    level: process.env.NODE_ENV === 'test' ? 'fatal' : 'debug',
  },
  stream
);
