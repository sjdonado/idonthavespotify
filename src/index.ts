import { file, serve } from 'bun';
import Nano, { h, Helmet } from 'nano-jsx';

import { Adapter } from './config/enum';
import { apiRouteSchema } from './schemas/api.schema';
import { indexRouteSchema, searchRouteSchema } from './schemas/web.schema';
import { search } from './services/search';
import { logger } from './utils/logger';
import ErrorMessage from './views/components/error-message';
import SearchCard from './views/components/search-card';
import MainLayout from './views/layouts/main';
import Home from './views/pages/home';

const isProduction = process.env.NODE_ENV === 'production';

export const server = serve({
  port: Bun.env['PORT'] ?? 3000,
  routes: {
    '/assets/*': {
      GET: async req => {
        try {
          const url = new URL(req.url);
          const path = url.pathname.replace(/^\/assets\//, '');
          const filePath = `public/assets/${path}`;

          return new Response(file(filePath));
        } catch (error) {
          console.error(`Error serving static file: ${error}`);
          return new Response('Server error', { status: 500 });
        }
      },
    },
    '/': {
      async GET(req) {
        try {
          const url = new URL(req.url);
          const queryParams = Object.fromEntries(url.searchParams);

          const result = indexRouteSchema.safeParse({
            query: queryParams,
          });

          if (!result.success) {
            return Response.json(
              {
                error: 'Validation error',
                details: result.error.format(),
              },
              { status: 400 }
            );
          }

          const { id } = result.data.query;

          const searchResult = id
            ? await search({ searchId: id, headless: false })
            : null;

          const content = h(
            Home,
            { source: searchResult?.source },
            searchResult ? h(SearchCard, { searchResult }) : null
          );

          const app = Nano.renderSSR(
            h(MainLayout, {
              title: searchResult?.title,
              description: searchResult?.description,
              image: searchResult?.image,
              isProduction,
              children: content,
            })
          );

          const { body, head, footer, attributes } = Helmet.SSR(app);
          const html = `
            <!DOCTYPE html>
            <html ${attributes.html.toString()}>
              <head>
                ${head.join('\n')}
              </head>
              <body ${attributes.body.toString()}>
                ${body}
                ${footer.join('\n')}
              </body>
            </html>`;

          return new Response(html, {
            headers: { 'Content-Type': 'text/html' },
          });
        } catch (error) {
          logger.error('[/]', error);
          const html = Nano.renderSSR(
            h(ErrorMessage, { message: 'Something went wrong, please try again later.' })
          );
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
          const formData = await req.formData();

          const result = searchRouteSchema.safeParse({
            body: Object.fromEntries(formData),
          });

          if (!result.success) {
            return Response.json(
              {
                error: 'Validation error',
                details: result.error.format(),
              },
              { status: 400 }
            );
          }

          const { link } = result.data.body;

          const searchResult = await search({ link, headless: false });
          const html = Nano.renderSSR(h(SearchCard, { searchResult }));

          return new Response(html, {
            headers: { 'Content-Type': 'text/html' },
          });
        } catch (error) {
          logger.error('[/search]', error);
          const html = Nano.renderSSR(
            h(ErrorMessage, { message: 'Something went wrong, please try again later.' })
          );
          return new Response(html, {
            headers: { 'Content-Type': 'text/html' },
            status: 500,
          });
        }
      },
    },
    '/api/search': {
      async POST(req) {
        try {
          const url = new URL(req.url);
          const queryParams = Object.fromEntries(url.searchParams);
          const body = await req.json();

          const result = apiRouteSchema.safeParse({
            query: queryParams,
            body: body,
          });

          if (!result.success) {
            return Response.json(
              {
                error: 'Validation error',
                details: result.error.format(),
              },
              { status: 400 }
            );
          }

          const { link, adapters } = result.data.body;

          const searchResult = await search({
            link,
            adapters: adapters as Adapter[],
            headless: false,
          });

          return Response.json(searchResult);
        } catch (error) {
          logger.error('[/api/search]', error);
          return Response.json({ error: 'Internal server error' }, { status: 500 });
        }
      },
    },
  },

  development: !isProduction,
});

logger.info(`Listening on ${server.url}`);
