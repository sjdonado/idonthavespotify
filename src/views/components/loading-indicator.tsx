import { Html } from '@elysiajs/html';

export default function LoadingIndicator() {
  return (
    <div
      id="loading-indicator"
      class="htmx-indicator animate-loading-bar fixed left-0 top-0 h-1.5 w-full bg-green-500"
    />
  );
}
