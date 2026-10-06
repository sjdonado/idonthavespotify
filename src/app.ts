import { h, Helmet, renderSSR } from 'nano-jsx';

import { isPublicInstance, wantsJson } from './abuse/gate';
import { Adapter, Parser } from './config/enum';
import { getSearchParser } from './parsers/link';
import { apiRouteSchema } from './schemas/api.schema';
import { indexRouteSchema, searchRouteSchema } from './schemas/web.schema';
import { search, type SearchResult } from './services/search';
import { logger } from './utils/logger';
import { getAllServiceGuardStatuses } from './utils/service-guard';
import { ValidationError, validationError } from './utils/zod';
import ErrorMessage from './views/components/error-message';
import SearchCard, { SearchLinks } from './views/components/search-card';
import MainLayout from './views/layouts/main';
import Home from './views/pages/home';

// Dynamic routes shared by every runtime (Bun.serve, edge fetch handler).
// Static assets are NOT here: each runtime serves them its own way.
// Abuse protection: web search is open; only the edge (Bot Fight Mode plus
// a WAF Managed Challenge rule) and the per-service guards stand in front
// of it. /api/search stays disabled on the public instance until API keys
// land; /api/status and assets stay open.
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
        const { id, rows } = result.data.query;

        const render = (searchResult: SearchResult | null, status = 200) => {
          const content = h(
            Home,
            { source: searchResult?.source },
            searchResult ? h(SearchCard, { searchResult, pending: true }) : null
          );

          const html = renderSSR(
            h(MainLayout, {
              title: searchResult?.title,
              description: searchResult?.description,
              image: searchResult?.image,
              audio: searchResult?.audio,
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
              status,
            }
          );
        };

        // Share links load in two phases. The card's loader asks for
        // `?rows=1` and gets only the service rows, from the full search.
        if (id && rows === '1') {
          const searchResult = await search({ searchId: id, headless: false });
          return new Response(
            renderSSR(h(SearchLinks, { links: searchResult.links })),
            { headers: { 'Content-Type': 'text/html' } }
          );
        }

        // The page itself needs only the source metadata (meta tags for link
        // previews, the card header). Non-Spotify sources also run the
        // Spotify adapter, which fills a missing cover or audio preview.
        const sourceType = id ? getSearchParser(undefined, id).type : undefined;
        const searchResult = id
          ? await search({
              searchId: id,
              adapters: sourceType === Parser.Spotify ? [] : [Adapter.Spotify],
              // A title-search fallback could pick the wrong recording's
              // cover and preview for the meta tags; phase 2 runs it.
              fallback: false,
              headless: false,
            })
          : null;

        return render(searchResult);
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

        // The shareable URL follows the result in the same response; no
        // client URL hack needed.
        return new Response(html, {
          headers: {
            'Content-Type': 'text/html',
            'HX-Replace-Url': `/?id=${searchResult.id}`,
          },
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
        }
        // Unknown errors keep the generic message: err.message may carry
        // upstream internals. It still reaches the logs below.

        logger.error(`[route /search]: ${message}`);
        logger.error(err);

        // htmx 4 swaps error bodies into the target: web failures must be
        // fragments, never JSON. (API clients use /api/search instead.)
        if (statusCode === 400) {
          if (wantsJson(req)) {
            return Response.json({ message }, { status: statusCode });
          }
          const html = renderSSR(h(ErrorMessage, { message }));
          return new Response(html, {
            headers: { 'Content-Type': 'text/html' },
            status: statusCode,
          });
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
        // Disabled on the public instance until API keys land. The Plunk
        // key is the public-instance signal, same as before; self-host
        // (no key) keeps serving programmatic clients like the Raycast
        // extension.
        if (isPublicInstance()) {
          return Response.json(
            { error: 'API search is disabled on the public instance.', auth: 'api-key' },
            { status: 403 }
          );
        }

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
  '/api/auth/request-code': {
    POST: async function () {
      return Response.json(
        { error: 'Email login is retired.' },
        { status: 410 }
      );
    },
  },
  '/api/auth/verify-code': {
    POST: async function () {
      return Response.json(
        { error: 'Email login is retired.' },
        { status: 410 }
      );
    },
  },
  // Challenge landing: the WAF rule challenges this GET, so a visitor whose
  // htmx search got a challenge page can solve it here, then comes back with
  // clearance. A redirect keeps the resulting history entry a plain GET.
  '/verify': {
    GET: function (req: Request) {
      const next = new URL(req.url).searchParams.get('next') ?? '/';
      const safe = /^\/(?![/\\])/.test(next) ? next : '/';
      return new Response(null, { status: 302, headers: { Location: safe } });
    },
  },
  '/api/status': {
    GET: async function () {
      try {
        return Response.json({
          serviceGuards: getAllServiceGuardStatuses(),
          timestamp: new Date().toISOString(),
          gate: { enabled: false },
        });
      } catch (err) {
        logger.error(`[route /api/status]: ${err}`);
        return Response.json({ error: 'Failed to get status' }, { status: 500 });
      }
    },
  },
});
