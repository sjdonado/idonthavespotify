import CustomMetaTag from '../components/custom-meta-tag';

export default function MainLayout(props: { children: JSX.Element }) {
  return (
    <html>
      <head>
        <title>I don't have spotify</title>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#000000" />

        <meta
          name="description"
          content="Find Spotify content on YouTube, Deezer, Apple Music, Tidal, SoundCloud and more."
        />
        <meta
          name="keywords"
          content="Spotify,YouTube,Deezer,Apple Music,Tidal,SoundCloud,converter,search,listen"
        />

        <CustomMetaTag property="og:title" content="I don't have Spotify" />
        <CustomMetaTag property="og:type" content="website" />
        <CustomMetaTag property="og:url" content="https://idonthavespotify.sjdonado.de" />
        <CustomMetaTag property="og:site_name" content="I don't have Spotify" />
        <CustomMetaTag
          property="og:description"
          content="Find Spotify content on YouTube, Deezer, Apple Music, Tidal, SoundCloud and more."
        />
        <CustomMetaTag
          property="og:image"
          content="https://user-images.githubusercontent.com/27580836/227801051-a71d389e-2510-4965-a23e-d7478fe28f13.jpeg"
        />
        <CustomMetaTag property="og:image:alt" content="I don't have Spotify favicon" />

        <script src="https://unpkg.com/htmx.org@1.9.6"></script>
        <meta name="htmx-config" content='{"defaultSwapStyle":"outerHTML"}' />

        <link
          href="https://unpkg.com/tailwindcss@^2/dist/tailwind.min.css"
          rel="stylesheet"
        />

        <link href="/assets/css/index.css" rel="stylesheet" />
      </head>

      <body>{props.children}</body>

      <script
        defer
        src="https://kit.fontawesome.com/f559975e2f.js"
        crossorigin="anonymous"
      />
    </html>
  );
}
