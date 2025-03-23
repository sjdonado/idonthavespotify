import { file, serve } from 'bun';
import Nano, { h, Helmet } from 'nano-jsx';

import { Adapter } from './config/enum';
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
        const url = new URL(req.url);
        const id = url.searchParams.get('id');

        let title, description, image, content;

        try {
          const searchResult = id
            ? await search({ searchId: id, headless: false })
            : undefined;

          title = searchResult?.title;
          description = searchResult?.description;
          image = searchResult?.image;

          // Create content with search result if available
          let homeChildren = null;
          if (searchResult) {
            homeChildren = h(SearchCard, { searchResult });
          }

          content = h(Home, { source: searchResult?.source }, homeChildren);
        } catch (error) {
          logger.error(`[indexRoute]: ${error}`);

          const errorMsg = h(ErrorMessage, {
            message: 'Something went wrong, please try again later.',
          });
          content = h(Home, {}, errorMsg);
        }

        const app = Nano.renderSSR(
          h(MainLayout, {
            title,
            description,
            image,
            isProduction,
            children: content,
          })
        );

        const { body, head, footer, attributes } = Helmet.SSR(app);

        const html = `
          <!DOCTYPE html>
          <html ${attributes.html.toString()}>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              ${head.join('\n')}
            </head>
            <body ${attributes.body.toString()}>
              ${body}
              ${footer.join('\n')}
            </body>
          </html>
        `;

        return new Response(html, {
          headers: { 'Content-Type': 'text/html' },
        });
      },
    },
    '/search': {
      async POST(req) {
        const formData = await req.formData();

        const link = formData.get('link');

        const searchResult = await search({ link, headless: false });

        const html = Nano.renderSSR(h(SearchCard, { searchResult }));

        return new Response(html, {
          headers: { 'Content-Type': 'text/html' },
        });
      },
    },
    '/api/search': {
      async POST(req) {
        const { link, adapters } = await req.json();

        const searchResult = await search({
          link,
          adapters: adapters as Adapter[],
          headless: false,
        });

        return Response.json(searchResult);
      },
    },
  },

  development: !isProduction,
});

logger.info(`Listening on ${server.url}`);
