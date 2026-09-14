import { h, Helmet, renderSSR } from 'nano-jsx';

import { Adapter } from './config/enum';
import { apiRouteSchema } from './schemas/api.schema';
import { indexRouteSchema, searchRouteSchema } from './schemas/web.schema';
import { search } from './services/search';
import { logger } from './utils/logger';
import { getAllServiceGuardStatuses } from './utils/service-guard';
import { ValidationError, validationError } from './utils/zod';
import ErrorMessage from './views/components/error-message';
import SearchCard from './views/components/search-card';
import MainLayout from './views/layouts/main';
import Home from './views/pages/home';

// Dynamic routes shared by every runtime (Bun.serve, edge fetch handler).
// Static assets are NOT here: each runtime serves them its own way.
// No per-IP rate limiting here: abuse protection lives at the edge
// (Cloudflare rule on the public demo) and in the service guards below.
export const createRoutes = () => ({
  '/': {
    GET: async function (req: Request) {
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
  },
  '/search': {
    POST: async function (req: Request) {
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
  },
  '/api/search': {
    POST: async function (req: Request) {
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
  },
  '/api/status': {
    GET: async function () {
      try {
        return Response.json({
          serviceGuards: getAllServiceGuardStatuses(),
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        logger.error(`[route /api/status]: ${err}`);
        return Response.json({ error: 'Failed to get status' }, { status: 500 });
      }
    },
  },
});
