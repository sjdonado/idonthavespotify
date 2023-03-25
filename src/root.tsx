// @refresh reload
import { Suspense } from 'solid-js';
import {
  Body,
  ErrorBoundary,
  FileRoutes,
  Head,
  Html,
  Meta,
  Routes,
  Scripts,
  Title,
} from 'solid-start';

import './root.css';

export default function Root() {
  return (
    <Html lang="en">
      <Head>
        <Title>I don't have spotify</Title>
        <Meta charset="utf-8" />
        <Meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta name="theme-color" content="#000000" />

        <Meta name="description" content="Find Spotify content on YouTube, Apple Music, Tidal, Soundcloud and more." />
        <Meta name="keywords" content="Spotify,Youtube,Apple Music,Tidal,Soundcloud,converter,search,listen" />

        <Meta property="og:title" content="I don't have Spotify" />
        <Meta property="og:type" content="website" />

        <Meta property="og:url" content="https://idonthavespotify.sjdonado.de/" />
        <Meta property="og:site_name" content="I don't have Spotify" />
        <Meta property="og:description" content="Find Spotify content on YouTube, Apple Music, Tidal, Soundcloud and more." />

        <Meta property="og:image" content="https://avatars.githubusercontent.com/u/27580836" />
        <Meta property="og:image:secure_url" content="https://user-images.githubusercontent.com/27580836/227728799-8123c22e-7714-45e7-95b3-56f666d7ebcc.png" />
        <Meta property="og:image:type" content="image/png" />
        <Meta property="og:image:alt" content="I don't have Spotify favicon" />
        {
          // redis setup (cache searches) -> exp time 1 day
          // redis counter for searches
          // add tests e2e
          // ligthhouse audit
          // expose api with CORS
          // recollect errors (sentry?)
        }
      </Head>
      <Body>
        <Suspense>
          <ErrorBoundary>
            <Routes>
              <FileRoutes />
            </Routes>
          </ErrorBoundary>
        </Suspense>
        <Scripts />
        <script defer src="https://kit.fontawesome.com/f559975e2f.js" crossorigin="anonymous" />
      </Body>
    </Html>
  );
}
