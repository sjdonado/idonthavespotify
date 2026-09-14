import Nano from 'nano-jsx';

import { ENV } from '~/config/env';

// Single source for the footer content: the page footer and the gate modal
// render exactly this, so one edit updates both. One row, one size, one
// gray (the subtitle gray), no byline.
export default function FooterContent() {
  return (
    <p class="m-auto flex flex-wrap items-center justify-center gap-x-2 text-[0.7rem] font-normal text-zinc-400 md:text-sm">
      <span>v{ENV.app.version}</span>
      <span aria-hidden="true">•</span>
      <a
        href="https://github.com/sjdonado/idonthavespotify"
        class="hover:underline"
        target="_blank"
        rel="noreferrer"
      >
        <i class="ti ti-brand-github mr-1" />
        Source
      </a>
      <span aria-hidden="true">|</span>
      <a
        href="https://spookyplanning.com"
        class="flex justify-center hover:underline"
        target="_blank"
        rel="noreferrer"
      >
        <i class="ti ti-ghost-2 mr-1" />
        <span>Planning Tool</span>
      </a>
      <span aria-hidden="true">|</span>
      <a
        href="https://zen.donado.co/"
        class="flex justify-center hover:underline"
        target="_blank"
        rel="noreferrer"
      >
        <i class="ti ti-leaf mr-1" />
        <span>Zen</span>
      </a>
    </p>
  );
}
