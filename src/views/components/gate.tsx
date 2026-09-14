import Nano, { Fragment } from 'nano-jsx';

import { primaryButtonFullClass } from './button';

// Inline identity gate in a blocking modal: no signup page, no app use
// until verified. Steps swap inside #gate-panel (htmx); verified reloads
// into the app. Plain fixed layers instead of showModal, so the single page
// footer paints above everything with a plain z-index (top-layer dialogs
// ignore z-index entirely). Rendered statically, so no-JS still shows it.
export default function GateModal() {
  return (
    <Fragment>
      <div
        aria-hidden="true"
        class="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
      />
      <div id="gate-modal" class="fixed inset-0 z-50 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
          <div
            id="gate-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="gate-title"
            aria-live="polite"
            class="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl"
          >
            <div
              data-controller="gate"
              class="flex w-full flex-col items-center gap-3"
            >
              <h2
                id="gate-title"
                class="text-center text-2xl font-light uppercase text-white md:text-3xl"
              >
                Welcome
              </h2>
              <p class="text-center text-sm text-zinc-400">
                Try the public instance. It runs on free tiers, so we ask for
                your email to confirm you are human and track fair use. Never
                marketing. We will send a 6-digit code, and your session lasts
                30 days.
              </p>
              <form
                hx-post="/api/auth/request-code"
                hx-target="#gate-panel"
                hx-swap="innerHTML"
                class="flex w-full flex-col gap-2"
              >
                <label for="gate-email" class="sr-only">
                  Email
                </label>
                <input
                  id="gate-email"
                  type="email"
                  name="email"
                  required
                  autofocus
                  class="min-h-[48px] w-full rounded-lg bg-zinc-700 p-2.5 text-base font-normal text-white placeholder:text-zinc-400"
                  placeholder="you@gmail.com"
                />
                <button type="submit" class={primaryButtonFullClass}>
                  Get code
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
}
