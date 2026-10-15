// Replace only third-party transport. Parsers, adapters, cache, routes, and client controllers are the production implementations.
export const createHttpBackend = () => ({
  request: async (url: string, init: RequestInit & { timeout?: number }) => {
    void init;
    const upstream = new URL(url);
    if (
      upstream.hostname === 'open.spotify.com' &&
      upstream.pathname === '/embed/track/0nrRP2bk19rLc0orkWPQk2'
    ) {
      const entity = {
        name: 'Wake Me Up',
        uri: 'spotify:track:0nrRP2bk19rLc0orkWPQk2',
        type: 'track',
        artists: [{ name: 'Avicii' }],
        releaseDate: { isoString: '2013-06-17' },
        visualIdentity: {
          image: [{ url: `${process.env['APP_URL']}/assets/favicon.ico`, maxWidth: 640 }],
        },
      };
      return new Response(
        `<script id="__NEXT_DATA__">${JSON.stringify({
          props: { pageProps: { entity } },
        })}</script>`,
        { headers: { 'content-type': 'text/html' } }
      );
    }
    if (
      upstream.hostname === 'deezer.e2e.test' &&
      upstream.pathname === '/search/track' &&
      upstream.searchParams.get('q') === 'Wake Me Up Avicii'
    ) {
      return Response.json({
        total: 1,
        data: [
          {
            title: 'Wake Me Up',
            artist: { name: 'Avicii' },
            link: 'https://www.deezer.com/track/67238741',
          },
        ],
      });
    }
    if (
      upstream.hostname === 'youtube.e2e.test' &&
      upstream.pathname === '/search' &&
      upstream.searchParams.get('q') === 'Wake Me Up Avicii'
    ) {
      return Response.json({
        items: [
          {
            id: { videoId: 'IcrbM1l_BoI' },
            snippet: { title: 'Wake Me Up', channelTitle: 'Avicii' },
          },
        ],
      });
    }
    // Remaining destinations deliberately have no match. No request ever reaches the network, including MusicBrainz's hard-coded host.
    return new Response('No upstream fixture for this destination', { status: 404 });
  },
  resolveRedirect: async (url: string, maxRedirects: number) => {
    void maxRedirects;
    return url;
  },
  isTransportError: (error: unknown) => {
    void error;
    return false;
  },
});
