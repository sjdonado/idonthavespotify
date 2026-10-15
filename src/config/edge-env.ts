// Per-request environment stash for runtimes without ambient env:
// Cloudflare Workers passes bindings via fetch(req, env), evaluated after
// module load, so static import-time reads cannot see them.
let edgeEnv: Record<string, string | undefined> | undefined;
let edgeEnvVersion = 0;

export const setEdgeEnv = (env: Record<string, unknown>): void => {
  const flat: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(env)) {
    flat[key] = typeof value === 'string' ? value : undefined;
  }
  edgeEnv = flat;
  edgeEnvVersion += 1;
};

export const getEdgeEnvVersion = (): number => edgeEnvVersion;

export const readEnv = (key: string): string | undefined =>
  edgeEnv?.[key] ??
  (typeof Bun !== 'undefined' ? Bun.env[key] : undefined) ??
  (typeof process !== 'undefined' ? process.env[key] : undefined);
