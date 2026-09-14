import { readEnv } from '~/config/edge-env';

// Console-backed logger for runtimes without Node streams (edge).
// Same call shape as the pino logger, including the (obj, msg) form.
// Defaults to info: debug logs carry full upstream URLs with API keys.
const levelRank: Record<string, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
  silent: 5,
};
const minLevel = (): number => levelRank[readEnv('LOG_LEVEL') ?? 'info'] ?? 1;

const format = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.stack ?? `${value.name}: ${value.message}`;
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
};

const joinArgs = (args: unknown[]): string => args.map(format).join(' ');

const enabled = (level: number): boolean => level >= minLevel();

export const logger = {
  debug: (...args: unknown[]): void => {
    if (enabled(0)) console.debug(joinArgs(args));
  },
  info: (...args: unknown[]): void => {
    if (enabled(1)) console.info(joinArgs(args));
  },
  warn: (...args: unknown[]): void => {
    if (enabled(2)) console.warn(joinArgs(args));
  },
  error: (...args: unknown[]): void => {
    if (enabled(3)) console.error(joinArgs(args));
  },
};
