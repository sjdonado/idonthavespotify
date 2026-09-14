// Shared button styles: one height, one radius, one voice. Every action in
// the app composes these so controls look consistent at any width.
// (Plain consts, not a component: routes.ts string fragments use them too.)

export const primaryButtonClass =
  'min-h-[48px] rounded-lg border border-green-500 bg-green-500 px-4 py-2.5 text-sm font-medium text-black focus:outline-none focus:ring-1 focus:ring-white';

export const primaryButtonFullClass =
  'min-h-[48px] w-full rounded-lg border border-green-500 bg-green-500 px-4 py-2.5 text-sm font-medium text-black focus:outline-none focus:ring-1 focus:ring-white';

export const ghostButtonClass =
  'min-h-[48px] rounded-lg border border-zinc-700 px-5 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-white';
