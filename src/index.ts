import { file, serve } from 'bun';
import { h, Helmet, renderSSR } from 'nano-jsx';

import { Adapter } from './config/enum';
import { apiRouteSchema } from './schemas/api.schema';
import { indexRouteSchema, searchRouteSchema } from './schemas/web.schema';
import { search } from './services/search';
import umami from './services/umami';
import { logger } from './utils/logger';
import { validationError } from './utils/zod';
import ErrorMessage from './views/components/error-message';
import SearchCard from './views/components/search-card';
import MainLayout from './views/layouts/main';
import Home from './views/pages/home';

const isProduction = process.env.NODE_ENV === 'production';

export const createApp = (port: string = '0') =>
  serve({
    port,
    routes: {
      '/assets/*': {
        GET: async req => {
          try {
            const url = new URL(req.url);
            const path = url.pathname.replace(/^\/assets\//, '');
            const filePath = `public/assets/${path}`;

            return new Response(file(filePath));
          } catch (err) {
            console.error(err);
            logger.error(`[route /assets/*]: ${err}`);
            return new Response('Server error', { status: 500 });
          }
        },
      },
      '/': {
        async GET(req) {
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
                isProduction,
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
            return new Response(html, {
              headers: { 'Content-Type': 'text/html' },
              status: 500,
            });
          }
        },
      },
      '/search': {
        async POST(req) {
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
            }
            if (err instanceof Error) {
              if (err.message) {
                message = err.message;
              }
            }

            const html = renderSSR(h(ErrorMessage, { message }));

            logger.error(`[route /search]: ${err}`);
            return new Response(html, {
              headers: { 'Content-Type': 'text/html' },
              status: statusCode,
            });
          }
        },
      },
      '/api/search': {
        async POST(req) {
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
              title: '/api/search',
              url: url.pathname,
              name: 'raycast',
            });

            return Response.json(searchResult);
          } catch (err) {
            if (err instanceof Response) return err;

            const { message } = err as Error;
            logger.error(`[route /api/search]: ${err}`);
            return Response.json({ error: message }, { status: 500 });
          }
        },
      },
    },

    development: !isProduction,
  });

const port = Bun.env['PORT'] ?? '3000';
const app = createApp(port);

logger.info(`Listening on ${app.url}`);
