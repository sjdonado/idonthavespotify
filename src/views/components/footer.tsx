import Nano from 'nano-jsx';

import FooterContent from './footer-content';

export default function Footer() {
  return (
    <footer class="relative z-[60] mb-2 flex flex-col text-center text-[0.7rem] md:text-sm">
      <FooterContent />
    </footer>
  );
}
