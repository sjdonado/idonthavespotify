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

        <Meta name="description" content="Find Spotify content on YouTube, Deezer, Apple Music, Tidal, SoundCloud and more." />
        <Meta name="keywords" content="Spotify,Youtube,Deezer,Apple Music,Tidal,SoundCloud,converter,search,listen" />

        <Meta property="og:title" content="I don't have Spotify" />
        <Meta property="og:type" content="website" />

        <Meta property="og:url" content="https://idonthavespotify.sjdonado.de" />
        <Meta property="og:site_name" content="I don't have Spotify" />
        <Meta property="og:description" content="Find Spotify content on YouTube, Deezer, Apple Music, Tidal, SoundCloud and more." />

        <Meta property="og:image" content="https://user-images.githubusercontent.com/27580836/227801051-a71d389e-2510-4965-a23e-d7478fe28f13.jpeg" />
        <Meta property="og:image:alt" content="I don't have Spotify favicon" />
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
