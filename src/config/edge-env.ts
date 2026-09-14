// Per-request environment stash for runtimes without ambient env:
// Cloudflare Workers passes bindings via fetch(req, env), evaluated after
// module load, so static import-time reads cannot see them.
let edgeEnv: Record<string, string | undefined> | undefined;
let rawEnv: Record<string, unknown> | undefined;
let edgeEnvVersion = 0;

export const setEdgeEnv = (env: Record<string, unknown>): void => {
  const flat: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(env)) {
    flat[key] = typeof value === 'string' ? value : undefined;
  }
  edgeEnv = flat;
  rawEnv = env;
  edgeEnvVersion += 1;
};

export const getEdgeEnvVersion = (): number => edgeEnvVersion;

export const readEnv = (key: string): string | undefined =>
  edgeEnv?.[key] ??
  (typeof Bun !== 'undefined' ? Bun.env[key] : undefined) ??
  (typeof process !== 'undefined' ? process.env[key] : undefined);

// Non-string bindings (Durable Object namespaces, KV, etc.) are dropped by
// the flat string map above; this accessor keeps them reachable on edge.
export const getEdgeBinding = <T>(name: string): T | undefined =>
  rawEnv?.[name] as T | undefined;
