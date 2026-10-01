import { INVIDIOUS_REDIRECT_URL } from '~/config/constants';
import { Adapter } from '~/config/enum';
import type { SearchResultLink } from '~/services/search';

// Derived from the YouTube link (Invidious mirrors YouTube's paths), so it
// makes no upstream call and needs no service guard.
export function toInvidiousLink(link: SearchResultLink): SearchResultLink | null {
  let url: URL;
  try {
    url = new URL(link.url);
  } catch {
    return null;
  }

  let path: string | undefined;
  const segments = url.pathname.split('/').filter(Boolean);
  // Video ids also live in paths: youtu.be/<id>, shorts/embed/v/<id>, and
  // YouTube Music podcast episodes (podcast/<id>).
  const videoId =
    url.hostname === 'youtu.be'
      ? segments[0]
      : (url.searchParams.get('v') ??
        (/^(shorts|embed|v|podcast)$/.test(segments[0] ?? '') ? segments[1] : undefined));
  const listId = url.searchParams.get('list');
  if (videoId) path = `/watch?v=${encodeURIComponent(videoId)}`;
  else if (listId) path = `/playlist?list=${encodeURIComponent(listId)}`;
  else if (segments[0] === 'channel' && segments[1]) path = `/channel/${segments[1]}`;
  if (!path) return null;

  return {
    type: Adapter.Invidious,
    url: `${INVIDIOUS_REDIRECT_URL}${path}`,
    isVerified: link.isVerified,
  };
}
