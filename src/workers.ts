import { createRoutes } from './app';
import { setEdgeEnv } from './config/edge-env';

const routes = createRoutes();

type RouteHandler = (req: Request) => Response | Promise<Response>;

const matchRoute = (pathname: string, method: string): RouteHandler | undefined => {
  const route = (routes as Record<string, unknown>)[pathname];
  if (!route || typeof route !== 'object' || route instanceof Response) {
    return undefined;
  }
  const handler = (route as Record<string, RouteHandler>)[method];
  return typeof handler === 'function' ? handler : undefined;
};

export default {
  async fetch(req: Request, env: Record<string, unknown>): Promise<Response> {
    setEdgeEnv(env);

    const { pathname } = new URL(req.url);
    const handler = matchRoute(pathname, req.method);

    if (!handler) {
      return new Response('Not Found', { status: 404 });
    }

    return handler(req);
  },
};
