import { h, Helmet, renderSSR } from 'nano-jsx';

import {
  checkSearchQuota,
  consumeQuota,
  getVerifiedEmail,
  isGateEnabled,
  peekQuotaFor,
  quotaExceededResponse,
  quotaUnavailableResponse,
  requireGateIdentity,
  wantsJson,
} from './abuse/gate';
import { QUOTA_COOLDOWN_SEC, QUOTA_LIMIT, QUOTA_WINDOW_SEC } from './abuse/quota';
import { requestCodeHandler, verifyCodeHandler } from './abuse/routes';
import { Adapter } from './config/enum';
import { ENV } from './config/env';
import { apiRouteSchema } from './schemas/api.schema';
import { indexRouteSchema, searchRouteSchema } from './schemas/web.schema';
import { search, type SearchResult } from './services/search';
import { logger } from './utils/logger';
import { getAllServiceGuardStatuses } from './utils/service-guard';
import { ValidationError, validationError } from './utils/zod';
import ErrorMessage from './views/components/error-message';
import SearchCard from './views/components/search-card';
import MainLayout from './views/layouts/main';
import Home from './views/pages/home';

// Dynamic routes shared by every runtime (Bun.serve, edge fetch handler).
// Static assets are NOT here: each runtime serves them its own way.
// Abuse protection: the public instance gate (email OTP + per-email quota) wraps the
// search handlers below when a Plunk key arms it; the WAF rule and service
// guards stay the outer layers. /api/status and assets stay open.
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

        const gateEnabled = isGateEnabled();
        const email = gateEnabled ? await getVerifiedEmail(req) : null;
        const gate = gateEnabled
          ? { enabled: true, authenticated: email !== null }
          : undefined;

        const render = (searchResult: SearchResult | null, status = 200) => {
          const content = h(
            Home,
            { source: searchResult?.source, gate },
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
              status,
            }
          );
        };

        if (id && gateEnabled) {
          if (!ENV.abuse.sessionSecret) return render(null, 503);
          if (!email) {
            // Machine-readable hint for page loads: the JSON search
            // endpoints carry `auth: "email-otp"` in the body instead.
            const denied = render(null, 401);
            denied.headers.set('X-Auth-Required', 'email-otp');
            return denied;
          }
          const quota = await consumeQuota(email);
          if ('doError' in quota) return quotaUnavailableResponse(false);
          if (!quota.verdict.allowed)
            return quotaExceededResponse(quota.verdict, false);
        }

        const searchResult = id
          ? await search({ searchId: id, headless: false })
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
        // Identity before validation (no validity oracle for strangers),
        // quota after (invalid links burn nothing).
        const identity = await requireGateIdentity(req, false);
        if (identity instanceof Response) return identity;

        const body = req.body ? Object.fromEntries(await req.formData()) : null;

        const result = searchRouteSchema.safeParse({
          body,
        });

        if (!result.success) throw validationError(result.error);
        const { link } = result.data.body;

        if (identity !== null) {
          const quotaDeny = await checkSearchQuota(identity, false);
          if (quotaDeny) return quotaDeny;
        }

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
        if (statusCode === 400 || statusCode === 401 || statusCode === 429) {
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
        // Identity before validation, quota after: see /search above.
        const identity = await requireGateIdentity(req, true);
        if (identity instanceof Response) return identity;

        const url = new URL(req.url);
        const queryParams = Object.fromEntries(url.searchParams);
        const body = req.body ? await req.json() : null;

        const result = apiRouteSchema.safeParse({
          query: queryParams,
          body,
        });

        if (!result.success) throw validationError(result.error);
        const { link, adapters } = result.data.body;

        if (identity !== null) {
          const quotaDeny = await checkSearchQuota(identity, true);
          if (quotaDeny) return quotaDeny;
        }

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
    POST: async function (req: Request) {
      try {
        return await requestCodeHandler(req);
      } catch (err) {
        logger.error(`[route /api/auth/request-code]: ${err}`);
        return Response.json({ error: 'Something went wrong, please try again later.' }, { status: 500 });
      }
    },
  },
  '/api/auth/verify-code': {
    POST: async function (req: Request) {
      try {
        return await verifyCodeHandler(req);
      } catch (err) {
        logger.error(`[route /api/auth/verify-code]: ${err}`);
        return Response.json({ error: 'Something went wrong, please try again later.' }, { status: 500 });
      }
    },
  },
  '/api/status': {
    GET: async function (req: Request) {
      try {
        const gate = {
          enabled: isGateEnabled(),
          quota: {
            limit: QUOTA_LIMIT,
            windowSec: QUOTA_WINDOW_SEC,
            cooldownSec: QUOTA_COOLDOWN_SEC,
          },
        };
        let identity: { remaining: number; resetInSec: number } | undefined;
        if (gate.enabled) {
          try {
            const email = await getVerifiedEmail(req);
            if (email) {
              const verdict = await peekQuotaFor(email);
              if (verdict) {
                identity = {
                  remaining: verdict.remaining,
                  resetInSec: verdict.resetInSec,
                };
              }
            }
          } catch {
            // Quota visibility is best-effort; status stays open.
          }
        }
        return Response.json({
          serviceGuards: getAllServiceGuardStatuses(),
          timestamp: new Date().toISOString(),
          gate,
          ...(identity ? { identity } : {}),
        });
      } catch (err) {
        logger.error(`[route /api/status]: ${err}`);
        return Response.json({ error: 'Failed to get status' }, { status: 500 });
      }
    },
  },
});
