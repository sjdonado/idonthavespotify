import { SPOTIFY_LINK_REGEX, YOUTUBE_LINK_REGEX } from '~/config/constants';
import { ServiceType } from '~/config/enum';

export const linkToServiceType = (link: string) => {
  const spotifyId = link.match(SPOTIFY_LINK_REGEX)?.[3];

  if (spotifyId) {
    return { type: ServiceType.Spotify, id: spotifyId };
  }

  const youtubeId = link.match(YOUTUBE_LINK_REGEX)?.[1];

  if (youtubeId) {
    return { type: ServiceType.YouTube, id: youtubeId };
  }

  throw new Error('Link not valid or could not be parsed');
};
