import type { Server } from 'bun';
import { h, Helmet, renderSSR } from 'nano-jsx';

import { Adapter } from './config/enum';
import {
  createAPIRateLimiter,
  createWebRateLimiter,
  getRateLimitMessage,
} from './config/rate-limit';
import { apiRouteSchema } from './schemas/api.schema';
import { indexRouteSchema, searchRouteSchema } from './schemas/web.schema';
import { search } from './services/search';
import { logger } from './utils/logger';
import {
  checkRateLimit,
  withRateLimit,
  withRateLimitHTML,
} from './utils/rate-limit-middleware';
import { getAllServiceGuardStatuses } from './utils/service-guard';
import { ValidationError, validationError } from './utils/zod';
import ErrorMessage from './views/components/error-message';
import RateLimitError from './views/components/rate-limit-error';
import SearchCard from './views/components/search-card';
import MainLayout from './views/layouts/main';
import Home from './views/pages/home';

const webRateLimiter = createWebRateLimiter();
const apiRateLimiter = createAPIRateLimiter();

// Dynamic routes shared by every runtime (Bun.serve, edge fetch handler).
// Static assets are NOT here: each runtime serves them its own way.
export const createRoutes = () => ({
  '/': {
    GET: withRateLimitHTML(
      async function (req: Request) {
        try {
          const url = new URL(req.url);
          const query = Object.fromEntries(url.searchParams);

          const result = indexRouteSchema.safeParse({
            query,
          });

          if (!result.success) throw validationError(result.error);
          const { id } = result.data.query;

          const searchResult = id
            ? await search({ searchId: id, headless: false })
            : null;

          const content = h(
            Home,
            { source: searchResult?.source },
            searchResult ? h(SearchCard, { searchResult }) : null
          );

          const html = renderSSR(
            h(MainLayout, {
              title: searchResult?.title,
              description: searchResult?.description,
              image: searchResult?.image,
              children: content,
            })
          );

          const { body, head, footer, attributes } = Helmet.SSR(html);

          return new Response(
            `<!DOCTYPE html>
                <html ${attributes.html.toString()}>
                  <head>
                    ${head.join('\n')}
                  </head>
                  <body ${attributes.body.toString()}>
                    ${body}
                    ${footer.join('\n')}
                  </body>
                </html>
              `,
            {
              headers: { 'Content-Type': 'text/html' },
            }
          );
        } catch (err) {
          if (err instanceof Response) return err;

          const html = renderSSR(
            h(ErrorMessage, {
              message: 'Something went wrong, please try again later.',
            })
          );

          logger.error(`[route /]: ${err}`);
          logger.error(err);

          return new Response(html, {
            headers: { 'Content-Type': 'text/html' },
            status: 500,
          });
        }
      },
      {
        rateLimiter: webRateLimiter,
        htmlMessage: renderSSR(
          h(MainLayout, {
            title: 'Rate Limited',
            children: h(RateLimitError, {
              message: getRateLimitMessage('web'),
            }),
          })
        ),
      }
    ),
  },
  '/search': {
    POST: withRateLimitHTML(
      async function (req: Request) {
        try {
          const body = req.body ? Object.fromEntries(await req.formData()) : null;

          const result = searchRouteSchema.safeParse({
            body,
          });

          if (!result.success) throw validationError(result.error);
          const { link } = result.data.body;

          const searchResult = await search({ link, headless: false });
          const html = renderSSR(h(SearchCard, { searchResult }));

          return new Response(html, {
            headers: { 'Content-Type': 'text/html' },
          });
        } catch (err) {
          let message = 'Something went wrong, please try again later.';
          let statusCode = 500;

          if (err instanceof Response) {
            const { error } = await err.json();
            message = error;
            statusCode = err.status;
          } else if (err instanceof ValidationError) {
            message = err.message;
            statusCode = 400;
          } else if (err instanceof Error) {
            if (err.message) {
              message = err.message;
            }
          }

          logger.error(`[route /search]: ${message}`);
          logger.error(err);

          if (statusCode === 400) {
            return Response.json({ message }, { status: statusCode });
          }

          const html = renderSSR(h(ErrorMessage, { message }));
          return new Response(html, {
            headers: { 'Content-Type': 'text/html' },
            status: statusCode,
          });
        }
      },
      {
        rateLimiter: webRateLimiter,
        htmlMessage: renderSSR(
          h(RateLimitError, {
            message: getRateLimitMessage('web'),
          })
        ),
      }
    ),
  },
  '/api/search': {
    POST: withRateLimit(
      async function (req: Request) {
        try {
          const url = new URL(req.url);
          const queryParams = Object.fromEntries(url.searchParams);
          const body = req.body ? await req.json() : null;

          const result = apiRouteSchema.safeParse({
            query: queryParams,
            body,
          });

          if (!result.success) throw validationError(result.error);
          const { link, adapters } = result.data.body;

          const searchResult = await search({
            link,
            adapters: adapters as Adapter[],
            headless: false,
          });

          return Response.json(searchResult);
        } catch (err) {
          if (err instanceof Response) return err;

          let message = 'Something went wrong, please try again later.';
          let statusCode = 500;

          if (err instanceof ValidationError) {
            message = err.message;
            statusCode = 400;
          } else if (err instanceof Error) {
            message = err.message;
          }

          logger.error(`[route /api/search]: ${message}`);
          logger.error(err);

          return Response.json({ error: message }, { status: statusCode });
        }
      },
      {
        rateLimiter: apiRateLimiter,
        message: getRateLimitMessage('api'),
      }
    ),
  },
  '/api/status': {
    GET: withRateLimit(
      async function (req: Request, server?: Server<undefined>) {
        try {
          const webStatus = checkRateLimit(req, webRateLimiter, server);
          const apiStatus = checkRateLimit(req, apiRateLimiter, server);

          return Response.json({
            ip: webStatus.ip,
            rateLimits: {
              web: {
                allowed: webStatus.allowed,
                remaining: webStatus.remaining,
                resetIn: Math.ceil(webStatus.resetTime / 1000),
              },
              api: {
                allowed: apiStatus.allowed,
                remaining: apiStatus.remaining,
                resetIn: Math.ceil(apiStatus.resetTime / 1000),
              },
            },
            serviceGuards: getAllServiceGuardStatuses(),
            storeSize: {
              web: webRateLimiter.getStoreSize(),
              api: apiRateLimiter.getStoreSize(),
            },
            timestamp: new Date().toISOString(),
          });
        } catch (err) {
          logger.error(`[route /api/status]: ${err}`);
          return Response.json({ error: 'Failed to get status' }, { status: 500 });
        }
      },
      {
        rateLimiter: apiRateLimiter,
        message: 'Status endpoint rate limited',
      }
    ),
  },
});
