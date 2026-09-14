import { Controller } from '@hotwired/stimulus';

export default class extends Controller {
  /** @type {string[]} */
  static targets = ['box', 'code', 'countdown'];

  /** @type {number | undefined} */
  countdownInterval;

  connect() {
    // The code step lands via htmx swap: move focus into the first box.
    if (this.hasBoxTarget) this.boxTargets[0].focus();
    if (this.hasCountdownTarget) this.startCountdown();
  }

  disconnect() {
    clearInterval(this.countdownInterval);
  }

  /** Keep the active box to digits, advance, and join all boxes. */
  fill(event) {
    const box = event.target;
    const digits = box.value.replace(/\D/g, '');
    // Browsers and SMS autofill can drop the whole code into one box:
    // distribute from the focused index instead of keeping one digit.
    if (digits.length > 1) {
      event.preventDefault?.();
      const boxes = this.boxTargets;
      const start = boxes.indexOf(box);
      digits
        .slice(0, boxes.length - start)
        .split('')
        .forEach((digit, i) => {
          boxes[start + i].value = digit;
        });
      this.focusSibling(boxes[Math.min(start + digits.length - 1, boxes.length - 1)], 1);
      this.join();
      return;
    }
    box.value = digits.slice(-1);
    if (box.value) this.focusSibling(box, 1);
    this.join();
  }

  /** Backspace on an empty box steps back; arrows move between boxes. */
  move(event) {
    const box = event.target;
    if (event.key === 'Backspace' && !box.value) this.focusSibling(box, -1);
    if (event.key === 'ArrowLeft') this.focusSibling(box, -1);
    if (event.key === 'ArrowRight') this.focusSibling(box, 1);
  }

  /** A pasted code splits across the boxes from the focused one. */
  split(event) {
    const digits = (event.clipboardData?.getData('text') ?? '').replace(
      /\D/g,
      ''
    );
    if (!digits) return;
    event.preventDefault();
    const boxes = this.boxTargets;
    const start = boxes.indexOf(event.target);
    digits
      .slice(0, boxes.length - start)
      .split('')
      .forEach((digit, i) => {
        boxes[start + i].value = digit;
      });
    const next = boxes[Math.min(start + digits.length, boxes.length - 1)];
    next.focus();
    next.select?.();
    this.join();
  }

  /** @param {HTMLElement} box */
  focusSibling(box, direction) {
    const boxes = this.boxTargets;
    const next = boxes[boxes.indexOf(box) + direction];
    if (next) next.focus();
  }

  join() {
    if (!this.hasCodeTarget) return;
    const code = this.boxTargets.map(box => box.value).join('');
    this.codeTarget.value = code;
    // A complete code submits itself: typing the 6th digit or pasting all
    // six behaves like pressing Verify. The controller sits on the wrapper
    // div, so submit the inner form, not the element.
    if (/^\d{6}$/.test(code)) {
      this.element.querySelector('form')?.requestSubmit();
    }
  }

  startCountdown() {
    const target = this.countdownTarget;
    const submit = this.element.querySelector('[type="submit"]');
    // The server enforces the throttle; the countdown only guides. Hold the
    // button until zero so the guidance and the affordance agree.
    if (submit) submit.disabled = true;
    let remaining = Number(target.dataset.gateSecondsValue) || 0;
    this.countdownInterval = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(this.countdownInterval);
        target.textContent = 'You can request a new code now.';
        if (submit) submit.disabled = false;
        return;
      }
      target.textContent = `Try again in ${remaining}s.`;
    }, 1000);
  }
}
