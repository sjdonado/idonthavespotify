import { file, serve } from 'bun';
import { h, Helmet, renderSSR } from 'nano-jsx';
import { resolve, sep } from 'path';

import { Adapter } from './config/enum';
import {
  createAPIRateLimiter,
  createWebRateLimiter,
  getRateLimitMessage,
} from './config/rate-limit';
import { apiRouteSchema } from './schemas/api.schema';
import { indexRouteSchema, searchRouteSchema } from './schemas/web.schema';
import { search } from './services/search';
import umami from './services/umami';
import { logger } from './utils/logger';
import { withAuth } from './utils/auth-middleware';
import {
  checkRateLimit,
  withRateLimit,
  withRateLimitHTML,
} from './utils/rate-limit-middleware';
import { validationError } from './utils/zod';
import ErrorMessage from './views/components/error-message';
import RateLimitError from './views/components/rate-limit-error';
import SearchCard from './views/components/search-card';
import MainLayout from './views/layouts/main';
import Home from './views/pages/home';

const isProduction = process.env.NODE_ENV === 'production';

const webRateLimiter = createWebRateLimiter();
const apiRateLimiter = createAPIRateLimiter();

export const createApp = (port: string = '0') =>
  serve({
    port,
    routes: {
      // '/': {
      //   GET: withRateLimitHTML(
      //     async function (req) {
      //       try {
      //         const url = new URL(req.url);
      //         const query = Object.fromEntries(url.searchParams);

      //         const result = indexRouteSchema.safeParse({
      //           query,
      //         });

      //         if (!result.success) throw validationError(result.error);
      //         const { id } = result.data.query;

      //         const searchResult = id
      //           ? await search({ searchId: id, headless: false })
      //           : null;

      //         const content = h(
      //           Home,
      //           { source: searchResult?.source },
      //           searchResult ? h(SearchCard, { searchResult }) : null
      //         );

      //         const html = renderSSR(
      //           h(MainLayout, {
      //             title: searchResult?.title,
      //             description: searchResult?.description,
      //             image: searchResult?.image,
      //             isProduction,
      //             children: content,
      //           })
      //         );

      //         const { body, head, footer, attributes } = Helmet.SSR(html);

      //         return new Response(
      //           `<!DOCTYPE html>
      //           <html ${attributes.html.toString()}>
      //             <head>
      //               ${head.join('\n')}
      //             </head>
      //             <body ${attributes.body.toString()}>
      //               ${body}
      //               ${footer.join('\n')}
      //             </body>
      //           </html>
      //         `,
      //           {
      //             headers: { 'Content-Type': 'text/html' },
      //           }
      //         );
      //       } catch (err) {
      //         if (err instanceof Response) return err;

      //         const html = renderSSR(
      //           h(ErrorMessage, {
      //             message: 'Something went wrong, please try again later.',
      //           })
      //         );

      //         logger.error(`[route /]: ${err}`);
      //         logger.error(err);

      //         return new Response(html, {
      //           headers: { 'Content-Type': 'text/html' },
      //           status: 500,
      //         });
      //       }
      //     },
      //     {
      //       rateLimiter: webRateLimiter,
      //       htmlMessage: renderSSR(
      //         h(MainLayout, {
      //           title: 'Rate Limited',
      //           isProduction,
      //           children: h(RateLimitError, {
      //             message: getRateLimitMessage('web'),
      //           }),
      //         })
      //       ),
      //     }
      //   ),
      // },

      // '/search': {
      //   POST: withRateLimitHTML(
      //     async function (req) {
      //       try {
      //         const body = req.body ? Object.fromEntries(await req.formData()) : null;

      //         const result = searchRouteSchema.safeParse({
      //           body,
      //         });

      //         if (!result.success) throw validationError(result.error);
      //         const { link } = result.data.body;

      //         const searchResult = await search({ link, headless: false });
      //         const html = renderSSR(h(SearchCard, { searchResult }));

      //         return new Response(html, {
      //           headers: { 'Content-Type': 'text/html' },
      //         });
      //       } catch (err) {
      //         let message = 'Something went wrong, please try again later.';
      //         let statusCode = 500;

      //         if (err instanceof Response) {
      //           const { error } = await err.json();
      //           message = error;
      //           statusCode = err.status;
      //         }
      //         if (err instanceof Error) {
      //           if (err.message) {
      //             message = err.message;
      //           }
      //         }

      //         const html = renderSSR(h(ErrorMessage, { message }));

      //         logger.error(`[route /search]: ${message}`);
      //         logger.error(err);

      //         return new Response(html, {
      //           headers: { 'Content-Type': 'text/html' },
      //           status: statusCode,
      //         });
      //       }
      //     },
      //     {
      //       rateLimiter: webRateLimiter,
      //       htmlMessage: renderSSR(
      //         h(RateLimitError, {
      //           message: getRateLimitMessage('web'),
      //         })
      //       ),
      //     }
      //   ),
      // },
      
      '/api/search': {
        POST: withAuth(
          withRateLimit(
            async function (req) {
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

                umami.track({
                  hostname: req.headers.get('host')?.split(':')[0] ?? '127.0.0.1',
                  language: req.headers.get('accept-language') ?? '',
                  referrer: req.headers.get('referer') ?? '',
                  title: 'Raycast search',
                  url: url.pathname,
                });

                return Response.json(searchResult);
              } catch (err) {
                if (err instanceof Response) return err;

                const { message } = err as Error;
                logger.error(`[route /api/search]: ${err}`);
                logger.error(err);

                return Response.json({ error: message }, { status: 500 });
              }
            },
            {
              rateLimiter: apiRateLimiter,
              message: getRateLimitMessage('api'),
            }
          )
        ),
      },
      '/api/status': {
        GET: withRateLimit(
          async function (req) {
            try {
              const webStatus = checkRateLimit(req, webRateLimiter);
              const apiStatus = checkRateLimit(req, apiRateLimiter);

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
      '/*': {
        GET: async req => {
          try {
            const url = new URL(req.url);

            // Sanitize pathname to prevent directory traversal attacks
            let pathname = url.pathname.split('?')[0].split('#')[0];

            try {
              pathname = decodeURIComponent(pathname);
            } catch {
              return new Response('Bad Request', { status: 400 });
            }

            // Check for dangerous characters
            if (pathname.includes('\0') || !pathname.startsWith('/')) {
              return new Response('Bad Request', { status: 400 });
            }

            const publicDir = resolve(process.cwd(), 'public');
            const requestedPath = resolve(publicDir, pathname.slice(1));

            // Ensure the resolved path is within the public directory
            if (
              !requestedPath.startsWith(publicDir + sep) &&
              requestedPath !== publicDir
            ) {
              return new Response('Bad Request', { status: 400 });
            }

            const filePath = requestedPath;

            const fileExists = await Bun.file(filePath).exists();
            if (!fileExists) {
              return new Response('Not found', { status: 404 });
            }

            return new Response(file(filePath));
          } catch (err) {
            console.error(err);
            logger.error(`[route /*]: ${err}`);
            return new Response('Not found', { status: 404 });
          }
        },
      },
    },

    development: !isProduction,
  });

if (import.meta.main) {
  const port = Bun.env['PORT'] ?? '3000';
  const app = createApp(port);

  logger.info(`Listening on ${app.url}`);
}
