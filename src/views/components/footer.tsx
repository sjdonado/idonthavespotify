import Nano from 'nano-jsx';

import { ENV } from '~/config/env';

export default function Footer() {
  return (
    <footer class="mb-2 flex flex-col text-center text-[0.7rem] md:text-sm">
      <div class="flex items-center justify-center gap-2">
        <p>v{ENV.app.version}</p>
        <span>•</span>
        Made by
        <a href="https://sjdonado.com" target="_blank" rel="noreferrer" class="underline">
          @sjdonado
        </a>
      </div>
      <p class="m-auto flex flex-wrap items-center justify-center text-[0.7rem] font-normal md:text-sm">
        <a
          href="https://uptime.donado.co"
          class="text-green-500 hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          <i class="ti ti-server mr-1" />
          Status
        </a>
        <span class="mx-2 text-gray-500">|</span>
        <a
          href="https://github.com/sjdonado/idonthavespotify"
          class="text-green-500 hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          <i class="ti ti-brand-github mr-1" />
          Source
        </a>
        <span class="mx-2 text-gray-500">|</span>
        <a
          href="https://spookyplanning.com"
          class="flex justify-center text-green-500 hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          <i class="ti ti-ghost-2 mr-1" />
          <span>Spooky Planning</span>
        </a>
      </p>
    </footer>
  );
}
