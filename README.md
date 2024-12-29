> Effortlessly convert Spotify links to your preferred streaming service

Copy a link from your favorite streaming service, paste it into the search bar, and voilà! Links to the track on all other supported platforms are displayed. If the original source is Spotify you'll even get a quick audio preview to ensure it's the right track.

## Supported Streaming Services (Adapters)

Adapters represent the streaming services supported by the Web App and the Raycast Extension. Each adapter allows the app to convert links from one platform to others. The table below shows which features are available for each one:

| Adapter          | Inverted Search | Official API           | Verified Links |
| ---------------- | --------------- | ---------------------- | -------------- |
| Spotify          | Yes             | Yes                    | Yes            |
| Tidal            | Yes             | Yes                    | Yes            |
| YouTube Music    | Yes             | No                     | Yes            |
| Apple Music      | Yes             | No                     | Yes            |
| Deezer           | Yes             | Yes                    | Yes            |
| SoundCloud       | Yes             | No                     | Yes            |

## Web App

![Uptime Badge](https://uptime.sjdonado.com/api/badge/2/uptime/24?labelPrefix=Web%20Page%20&labelSuffix=h) ![Uptime Badge](https://uptime.sjdonado.com/api/badge/2/ping/24?labelPrefix=Web%20Page%20)

<div align="center">
  <img width="1200" alt="image" src="https://github.com/user-attachments/assets/ae6250f5-d1ed-41f2-ae21-8a2b2599a450" />
</div>

# Apple Shortcuts (beta)
- [IDHS Open In Spotify](https://www.icloud.com/shortcuts/2757d4e10fad4cc182225953c8fdf80e)
- [IDHS Open In Tidal](https://www.icloud.com/shortcuts/63716e2abdcd4cc28fb67abf72e994f9)
- [IDHS Open In Youtube Music](https://www.icloud.com/shortcuts/de21be4d0878440f85bbf10bd6ee049a)
- [IDHS Open In Apple Music](https://www.icloud.com/shortcuts/23edcdae7dab452a9adc926435eafbdc)
- [IDHS Open In Deezer](https://www.icloud.com/shortcuts/f760b0cc6b6b494a88d31c31009966f3)
- [IDHS Open In SoundCloud](https://www.icloud.com/shortcuts/972d8ac3b30b4184a6cd63abb8c5cd9b)

## Raycast Extension

![Uptime Badge](https://uptime.sjdonado.com/api/badge/3/uptime/24?labelPrefix=API%20&labelSuffix=h) ![Uptime Badge](https://uptime.sjdonado.com/api/badge/3/ping/24?labelPrefix=API%20)

<a title="Install idonthavespotify Raycast Extension" href="https://www.raycast.com/sjdonado/idonthavespotify"><img src="https://www.raycast.com/sjdonado/idonthavespotify/install_button@2x.png?v=1.1" height="64" style="height: 64px;" alt=""></a>


## Local Setup (Web App)

The list of environment variables is available in `.env.test`. To complete the values for the following variables:

- `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`, refer to [Spotify Web API Documentation](https://developer.spotify.com/documentation/web-api).
- `TIDAL_CLIENT_ID` and `TIDAL_CLIENT_SECRET`, refer to [TIDAL Developer Portal](https://developer.tidal.com/).
- `YOUTUBE_API_KEY`, refer to [Google Developers Console](https://console.developers.google.com/).
- `URL_SHORTENER_API_KEY`, refer to [Bit](https://github.com/sjdonado/bit)

Ensure that the values are correctly added to your `.env` file to configure the API keys properly.

To get the app up:

```sh
docker compose up -d

bun install
bun dev
```

## Local Setup (Raycast)
Follow the guidelines https://developers.raycast.com/basics/create-your-first-extension and look for the folder: https://github.com/raycast/extensions/tree/8533f11972392b6d22f69f073fdb2af6d8ffee10/extensions/idonthavespotify

## More info

Contributions are more than welcome, just open a PR and I'll review it promptly.

<img width=50 src="https://user-images.githubusercontent.com/27580836/227801051-a71d389e-2510-4965-a23e-d7478fe28f13.jpeg"/>
Icon Generated by https://deepai.org/machine-learning-model/text2img
