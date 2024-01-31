export default function Footer(props: { searchCount?: number }) {
  return (
    <footer class="mt-2 text-center text-[0.7rem] md:text-sm">
      {props.searchCount && (
        <p>
          {'Queries performed: '}
          <span class="font-normal" data-testid="search-count">
            {props.searchCount}
          </span>
        </p>
      )}
      <p class="m-auto flex flex-wrap items-center justify-center text-[0.7rem] font-normal md:text-sm">
        <a
          href="https://uptime.donado.co/status/apps"
          class="text-green-500 hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          <i class="fas fa-server mr-1" />
          Status
        </a>
        <span class="mx-2 text-gray-500">|</span>
        <a
          href="https://raycast.com/sjdonado/idonthavespotify"
          class="flex justify-center text-green-500 hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          <svg
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            class="mr-1 w-4"
          >
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M4.703 9.92v1.377L1.402 7.995l.691-.686 2.61 2.611Zm1.377 1.377H4.703l3.301 3.301.69-.688-2.614-2.613Zm7.83-2.61L14.598 8 8.002 1.401l-.688.688L9.92 4.7H8.344l-1.82-1.818-.688.688 1.133 1.133H6.18v5.12h5.12V9.03l1.133 1.133.689-.688L11.3 7.654V6.078l2.61 2.61ZM5.047 4.356l-.688.688.739.739.688-.69-.739-.737Zm5.86 5.858-.687.688.739.739.688-.69-.74-.737ZM3.57 5.833l-.69.689 1.822 1.82V6.966L3.571 5.833Zm5.464 5.464H7.657l1.821 1.821.689-.689-1.132-1.132Z"
              fill="currentColor"
            />
          </svg>
          <span>View on Raycast</span>
        </a>
        <span class="mx-2 text-gray-500">|</span>
        <a
          href="https://github.com/sjdonado/idonthavespotify"
          class="text-green-500 hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          <i class="fab fa-github mr-1" />
          View on Github
        </a>
      </p>
    </footer>
  );
}
