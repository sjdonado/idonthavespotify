import { APPLE_PODCASTS_LINK_REGEX } from '~/config/constants';
import { MetadataType, Parser } from '~/config/enum';
import { ENV } from '~/config/env';
import { cacheSearchMetadata, getCachedSearchMetadata } from '~/services/cache';
import type { SearchMetadata } from '~/services/search';
import HttpClient from '~/utils/http-client';
import { logger } from '~/utils/logger';
import { getServiceGuard } from '~/utils/service-guard';

type ItunesLookupItem = {
  kind?: string;
  wrapperType?: string;
  trackId?: number;
  trackName?: string;
  collectionName?: string;
  artistName?: string;
  artworkUrl100?: string;
  artworkUrl600?: string;
};

type ItunesLookupResponse = {
  resultCount?: number;
  results?: ItunesLookupItem[];
};

export const parseApplePodcastsLink = (
  link: string
): { showId: string; episodeId?: string } | null => {
  const match = link.match(APPLE_PODCASTS_LINK_REGEX);
  if (!match) return null;
  const episodeId = match[2].match(/[?&]i=(\d+)/)?.[1];
  return { showId: match[1], episodeId };
};

async function lookup(
  params: Record<string, string>
): Promise<ItunesLookupItem[]> {
  const query = new URLSearchParams(params);
  const url = `${ENV.adapters.applePodcasts.apiUrl}/lookup?${query}`;

  logger.info(`[ApplePodcasts] Looking up: ${url}`);

  const response = await HttpClient.get<ItunesLookupResponse>(url);
  const data = typeof response === 'string' ? JSON.parse(response) : response;
  return data.results ?? [];
}

const imageOf = (item: ItunesLookupItem): string | undefined =>
  item.artworkUrl600 ?? item.artworkUrl100;

export const getApplePodcastsMetadata = async (id: string, link: string) => {
  const cached = await getCachedSearchMetadata(id, Parser.ApplePodcasts);
  if (cached) {
    logger.info(`[ApplePodcasts] (${id}) metadata cache hit`);
    return cached;
  }

  const guard = getServiceGuard('applePodcasts');
  if (!guard.acquire()) {
    throw new Error('[ApplePodcasts] service temporarily unavailable');
  }

  try {
    const parsed = parseApplePodcastsLink(link);
    if (!parsed) {
      throw new Error('Apple Podcasts link unable to be parsed correctly');
    }

    let metadata: SearchMetadata;
    if (parsed.episodeId) {
      const items = await lookup({
        id: parsed.showId,
        entity: 'podcastEpisode',
        limit: '200',
      });
      const episode = items.find(
        item => String(item.trackId ?? '') === parsed.episodeId
      );
      if (!episode?.trackName) {
        throw new Error('Episode details missing title');
      }
      metadata = {
        title: `${episode.trackName} ${episode.collectionName ?? ''}`.trim(),
        description: episode.collectionName ?? '',
        type: MetadataType.Podcast,
        image: imageOf(episode),
      };
    } else {
      const items = await lookup({ id: parsed.showId });
      const show =
        items.find(item => item.wrapperType === 'collection') ?? items[0];
      if (!show?.collectionName) {
        throw new Error('Show details missing title');
      }
      metadata = {
        title: show.collectionName,
        description: show.artistName ?? show.collectionName,
        type: MetadataType.Show,
        image: imageOf(show),
      };
    }
    guard.recordSuccess();

    await cacheSearchMetadata(id, Parser.ApplePodcasts, metadata);

    return metadata;
  } catch (err) {
    guard.recordFailure();
    throw new Error(`[${getApplePodcastsMetadata.name}] (${link}) ${err}`);
  }
};

export const getApplePodcastsQueryFromMetadata = (
  metadata: SearchMetadata
) => metadata.title.replace(/\s+/g, ' ').trim();
