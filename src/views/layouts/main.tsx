import Nano, { Fragment, Helmet } from 'nano-jsx';

interface MainLayoutProps {
  title?: string;
  description?: string;
  image?: string;
  isProduction: boolean;
  children: typeof Fragment;
}

const MainLayout = ({
  title,
  description,
  image,
  isProduction,
  children,
}: MainLayoutProps) => {
  return (
    <div>
      <Helmet>
        <html lang="en" />
        <meta charset="utf-8" />
        <title>I Don't Have Spotify</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no"
        />
        <link rel="icon" href="/assets/favicon.ico" />
        <meta name="theme-color" content="#000000" />

        <meta
          name="description"
          content="Turn any Spotify, Apple Music, YouTube, Deezer, Tidal, SoundCloud, Qobuz, or Bandcamp link into a shareable preview across the streaming services your friends use."
        />
        <meta
          name="keywords"
          content="Spotify,YouTube,Deezer,Apple Music,Tidal,SoundCloud,converter,search,listen"
        />

        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://idonthavespotify.donado.co" />
        <meta property="og:site_name" content="I Don't Have Spotify" />
        <meta property="og:title" content={title ?? "I Don't Have Spotify"} />
        <meta
          property="og:description"
          content={
            description ??
            'Turn any Spotify, Apple Music, YouTube, Deezer, Tidal, SoundCloud, Qobuz, or Bandcamp link into a shareable preview across the streaming services your friends use.'
          }
        />
        <meta
          property="og:image"
          content={
            image ??
            'https://user-images.githubusercontent.com/27580836/227801051-a71d389e-2510-4965-a23e-d7478fe28f13.jpeg'
          }
        />
        <meta property="og:image:alt" content="I Don't Have Spotify favicon" />

        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css"
        />
        <link href="https://fonts.cdnfonts.com/css/poppins" rel="stylesheet" />
        <script src="https://unpkg.com/htmx.org@2.0.4"></script>

        <link href="/assets/index.min.css" rel="stylesheet" />
      </Helmet>

      <body class="h-screen bg-black font-light text-white">{children}</body>

      <Helmet footer>
        {isProduction && (
          <script
            defer
            src="https://umami.donado.co/script.js"
            data-website-id="da89a7a2-dd17-4c7f-b7ff-de28a7046a0e"
            data-auto-track="false"
          ></script>
        )}
        <script src="assets/index.js" />
      </Helmet>
    </div>
  );
};

export default MainLayout;
