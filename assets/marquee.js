import { Component } from '@theme/component';
import { debounce } from '@theme/utilities';

const ANIMATION_OPTIONS = {
  duration: 500,
};

class MarqueeComponent extends Component {
  requiredRefs = ['wrapper', 'content', 'marqueeItems'];

  #animation = null;
  #resizeObserver = null;

  connectedCallback() {
    super.connectedCallback();

    const { marqueeItems } = this.refs;
    if (marqueeItems.length === 0) return;

    this.#waitForImages().then(() => {
      this.#addRepeatedItems();
      this.#duplicateContent();
      this.#setSpeed();
      this.#restartAnimation();
      this.#startResizeObserver();
    });

    window.addEventListener('resize', this.#handleResize);
    this.addEventListener('pointerenter', this.#slowDown);
    this.addEventListener('pointerleave', this.#speedUp);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('resize', this.#handleResize);
    this.removeEventListener('pointerenter', this.#slowDown);
    this.removeEventListener('pointerleave', this.#speedUp);
    if (this.#resizeObserver) this.#resizeObserver.disconnect();
  }

  /** Wait for images to decode completely */
  #waitForImages() {
    const imgs = this.querySelectorAll('img');

    const promises = [...imgs].map((img) => {
      if (img.decode) {
        return img.decode().catch(() => {});
      }
      return img.complete
        ? Promise.resolve()
        : new Promise((res) => {
            img.onload = res;
            img.onerror = res;
          });
    });

    return Promise.all(promises);
  }

  /** Slow Animation */
  #slowDown = debounce(() => {
    if (this.#animation) return;

    const animation = this.refs.wrapper.getAnimations()[0];
    if (!animation) return;

    this.#animation = animateValue({
      ...ANIMATION_OPTIONS,
      from: 1,
      to: 0,
      onUpdate: (value) => animation.updatePlaybackRate(value),
      onComplete: () => {
        this.#animation = null;
      },
    });
  }, ANIMATION_OPTIONS.duration);

  /** Speed Up Animation */
  #speedUp() {
    this.#slowDown.cancel();

    const animation = this.refs.wrapper.getAnimations()[0];
    if (!animation || animation.playbackRate === 1) return;

    const from = this.#animation?.current ?? 0;
    this.#animation?.cancel();

    this.#animation = animateValue({
      ...ANIMATION_OPTIONS,
      from,
      to: 1,
      onUpdate: (value) => animation.updatePlaybackRate(value),
      onComplete: () => {
        this.#animation = null;
      },
    });
  }

  get clonedContent() {
    const { content, wrapper } = this.refs;
    const lastChild = wrapper.lastElementChild;

    return content !== lastChild ? lastChild : null;
  }

  /** Set Speed */
  #setSpeed(value = this.#calculateSpeed()) {
    this.style.setProperty('--marquee-speed', `${value}s`);
  }

  /** Calculate Speed */
  #calculateSpeed() {
    const speedFactor = Number(this.getAttribute('data-speed-factor'));
    const { marqueeItems } = this.refs;
    const marqueeWidth = this.offsetWidth;

    const first = marqueeItems[0];
    const itemWidth = first ? first.getBoundingClientRect().width : 1;

    if (itemWidth === 0) return 10; // fallback to avoid breaks

    const count = Math.ceil(marqueeWidth / itemWidth);
    return Math.sqrt(count) * speedFactor;
  }

  /** Debounced Resize Handler */
  #handleResize = debounce(() => {
    const { marqueeItems } = this.refs;
    const newCopies = this.#calculateNumberOfCopies();
    const currentCopies = marqueeItems.length;

    if (newCopies > currentCopies) {
      this.#addRepeatedItems(newCopies - currentCopies);
    } else if (newCopies < currentCopies) {
      this.#removeRepeatedItems(currentCopies - newCopies);
    }

    this.#duplicateContent();
    this.#setSpeed();
    this.#restartAnimation();
  }, 250);

  /** Restart Animation */
  #restartAnimation() {
    const animations = this.refs.wrapper.getAnimations();

    requestAnimationFrame(() => {
      animations.forEach((animation) => (animation.currentTime = 0));
    });
  }

  /** Duplicate Content */
  #duplicateContent() {
    this.clonedContent?.remove();

    const clone = this.refs.content.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    clone.removeAttribute('ref');

    this.refs.wrapper.appendChild(clone);
  }

  /** Add Repeated Items */
  #addRepeatedItems(count = this.#calculateNumberOfCopies()) {
    const { content, marqueeItems } = this.refs;

    if (!marqueeItems[0]) return;

    for (let i = 0; i < count - 1; i++) {
      const clone = marqueeItems[0].cloneNode(true);
      content.appendChild(clone);
    }
  }

  /** Remove Repeated Items */
  #removeRepeatedItems(count = this.#calculateNumberOfCopies()) {
    const { content } = this.refs;
    const children = [...content.children];

    const removeCount = Math.min(count, children.length - 1);

    for (let i = 0; i < removeCount; i++) {
      content.lastElementChild?.remove();
    }
  }

  /** Calculate Number of Copies */
  #calculateNumberOfCopies() {
    const { marqueeItems } = this.refs;
    const marqueeWidth = this.offsetWidth;

    const first = marqueeItems[0];
    const itemWidth = first ? first.getBoundingClientRect().width : 1;

    if (itemWidth === 0) {
      setTimeout(() => this.#handleResize(), 100);
      return 1;
    }

    return Math.ceil(marqueeWidth / itemWidth);
  }

  /** Observe Item Size Changes (Fixes Delays) */
  #startResizeObserver() {
    const firstItem = this.refs.marqueeItems[0];
    if (!firstItem || typeof ResizeObserver === 'undefined') return;

    this.#resizeObserver = new ResizeObserver(() => {
      this.#handleResize();
    });

    this.#resizeObserver.observe(firstItem);
  }
}

/** animateValue helper */
function animateValue({ from, to, duration, onUpdate, easing = (t) => t * t * (3 - 2 * t), onComplete }) {
  const startTime = performance.now();
  let cancelled = false;
  let currentValue = from;

  function animate(currentTime) {
    if (cancelled) return;

    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easing(progress);
    currentValue = from + (to - from) * eased;

    onUpdate(currentValue);

    if (progress < 1) requestAnimationFrame(animate);
    else if (onComplete) onComplete();
  }

  requestAnimationFrame(animate);

  return {
    get current() {
      return currentValue;
    },
    cancel() {
      cancelled = true;
    },
  };
}

if (!customElements.get('marquee-component')) {
  customElements.define('marquee-component', MarqueeComponent);
}
