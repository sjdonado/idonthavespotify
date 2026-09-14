import Nano from 'nano-jsx';

// Inline identity gate: no signup page. Email field lives where search
// lives; the code field replaces it after send (htmx swap).
export default function GatePanel() {
  return (
    <div id="gate-panel" class="flex w-full max-w-3xl flex-col items-center gap-3 px-2">
      <p class="text-justify text-sm text-zinc-400">
        This demo asks for an email before searching, to keep shared upstream
        quotas usable. Popular providers only; the address is used for abuse
        prevention, never marketing.
      </p>
      <form
        hx-post="/api/auth/request-code"
        hx-target="#gate-panel"
        hx-swap="innerHTML"
        class="flex w-full max-w-3xl items-center justify-center"
      >
        <label for="gate-email" class="sr-only">
          Email
        </label>
        <input
          id="gate-email"
          type="email"
          name="email"
          required
          class="flex-1 rounded-lg bg-zinc-700 p-2.5 text-base font-normal text-white placeholder:text-zinc-400"
          placeholder="you@gmail.com"
        />
        <button
          type="submit"
          class="ml-2 rounded-lg border border-green-500 bg-green-500 p-2.5 text-sm font-medium text-black focus:outline-none focus:ring-1 focus:ring-white"
        >
          Get code
        </button>
      </form>
    </div>
  );
}
