import { describe, expect, it } from 'bun:test';
import Nano, { Helmet, renderSSR } from 'nano-jsx';

import MainLayout from '~/views/layouts/main';

const head = (audio?: string) => {
  const { head } = Helmet.SSR(renderSSR(<MainLayout audio={audio} children={[] as never} />));
  return head.join('\n');
};

describe('MainLayout', () => {
  it('advertises the audio preview as og:audio when there is one', () => {
    expect(head('https://p.scdn.co/mp3-preview/abc')).toContain(
      'content="https://p.scdn.co/mp3-preview/abc" property="og:audio"'
    );
  });

  it('omits og:audio without a preview', () => {
    expect(head()).not.toContain('og:audio');
  });
});
