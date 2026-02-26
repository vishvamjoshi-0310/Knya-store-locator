import { Component } from '@theme/component';
import { trapFocus, removeTrapFocus } from '@theme/focus';
import { onAnimationEnd } from '@theme/utilities';

/**
 * A custom element that manages the main menu drawer.
 *
 * @typedef {object} Refs
 * @property {HTMLDetailsElement} details - The details element.
 *
 * @extends {Component<Refs>}
 */
class HeaderDrawer extends Component {
  requiredRefs = ['details'];

  connectedCallback() {
    super.connectedCallback();

    this.addEventListener('keyup', this.#onKeyUp);
    this.#setupAnimatedElementListeners();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('keyup', this.#onKeyUp);
  }

  /**
   * Close the main menu drawer when the Escape key is pressed
   * @param {KeyboardEvent} event
   */
  #onKeyUp = (event) => {
    if (event.key !== 'Escape') return;

    this.#close(this.#getDetailsElement(event));
  };

  /**
   * @returns {boolean} Whether the main menu drawer is open
   */
  get isOpen() {

    return this.refs.details.hasAttribute('open');
  }

  /**
   * Get the closest details element to the event target
   * @param {Event | undefined} event
   * @returns {HTMLDetailsElement}
   */
  #getDetailsElement(event) {
    if (!(event?.target instanceof Element)) return this.refs.details;

    return event.target.closest('details') ?? this.refs.details;
  }

  /**
   * Toggle the main menu drawer
   */
  toggle() {
    return this.isOpen ? this.close() : this.open();
  }

  /**
   * Open the closest drawer or the main menu drawer
   * @param {Event} [event]
   */
  open(event) {
    const details = this.#getDetailsElement(event);
    const summary = details.querySelector('summary');
    const announcement = document.querySelector('#top-announcement-bar--section');
    const vertical_announcement = document.querySelector('#vertical-announcement--bar');
    
    if (!summary) return;
    if(summary.classList.contains('header__icon')){
      window.scrollTo(0, 0);
    }

    if(announcement){
      announcement.style.display = 'none'
    }
    if(vertical_announcement){
      vertical_announcement.style.display = 'none'
    }
    summary.setAttribute('aria-expanded', 'true');
    this.preventInitialAccordionAnimations(details);
    requestAnimationFrame(() => {
      details.classList.add('menu-open');
      setTimeout(() => {
        trapFocus(this.refs.details);
      }, 0);
    });
  }

  /**
   * Go back or close the main menu drawer
   * @param {Event} [event]
   */
  back(event) {
    this.#close(this.#getDetailsElement(event));
  }

  /**
   * Close the main menu drawer
   */
  close() {
    this.#close(this.refs.details);
  }

  /**
   * Close the closest menu or submenu that is open
   *
   * @param {HTMLDetailsElement} details
   */
  #close(details) {
    const summary = details.querySelector('summary');

    if (!summary) return;
    const announcement = document.querySelector('#top-announcement-bar--section');
    const vertical_announcement = document.querySelector('#vertical-announcement--bar');

    if(announcement){
      announcement.style.display = 'block'
    }
    if(vertical_announcement){
      vertical_announcement.style.display = 'block'
    }
    summary.setAttribute('aria-expanded', 'false');
    details.classList.remove('menu-open');

    onAnimationEnd(details, () => {
      if (details.classList.contains('menu-open')){

        reset(details);
        if (details === this.refs.details) {
          removeTrapFocus();
          // const openDetails = this.querySelectorAll('details[open]:not(accordion-custom > details)');
          // openDetails.forEach(reset);
        } else {
          setTimeout(() => {
            if (this.refs.details.hasAttribute('open')) {
              trapFocus(this.refs.details);
            }
          }, 0);
        }
      }
    });
  }

  /**
   * Attach animationend event listeners to all animated elements to remove will-change after animation
   * to remove the stacking context and allow submenus to be positioned correctly
   */
  #setupAnimatedElementListeners() {
    /**
     * @param {AnimationEvent} event
     */
    function removeWillChangeOnAnimationEnd(event) {
      const target = event.target;
      if (target && target instanceof HTMLElement) {
        target.style.setProperty('will-change', 'unset');
        target.removeEventListener('animationend', removeWillChangeOnAnimationEnd);
      }
    }
    const allAnimated = this.querySelectorAll('.menu-drawer__animated-element');
    allAnimated.forEach((element) => {
      element.addEventListener('animationend', removeWillChangeOnAnimationEnd);
    });
  }

  /**
   * Temporarily disables accordion animations to prevent unwanted transitions when the drawer opens.
   * Adds a no-animation class to accordion content elements, then removes it after 100ms to
   * re-enable animations for user interactions.
   * @param {HTMLDetailsElement} details - The details element containing the accordions
   */
  preventInitialAccordionAnimations(details) {
    const content = details.querySelectorAll('accordion-custom .details-content');

    content.forEach((element) => {
      if (element instanceof HTMLElement) {
        element.classList.add('details-content--no-animation');
      }
    });
    setTimeout(() => {
      content.forEach((element) => {
        if (element instanceof HTMLElement) {
          element.classList.remove('details-content--no-animation');
        }
      });
    }, 100);
  }
}

if (!customElements.get('header-drawer')) {
  customElements.define('header-drawer', HeaderDrawer);
}

/**
 * Reset an open details element to its original state
 *
 * @param {HTMLDetailsElement} element
 */
function reset(element) {
  element.classList.remove('menu-open');
  // element.removeAttribute('open');
  // element.querySelector('summary')?.setAttribute('aria-expanded', 'false');
  element.querySelector('summary')?.setAttribute('aria-expanded', element.hasAttribute('open') ? 'true' : 'false');
}


document.addEventListener("DOMContentLoaded", () => {

  let attempts = 0;
  const maxAttempts = 20;
  const interval = 100; // ms

  const tryInit = () => {
    attempts++;

    const target = document.querySelector('#appbrew-download-banner-root');

    if (target) {
      const observer = new MutationObserver(() => {
        requestAnimationFrame(() => {
          const computedDisplay = window.getComputedStyle(target).display;

          // When Appbrew hides it (Safari friendly detection)
          if (computedDisplay === "none") {
            target.classList.add("app-hidden");
          }
        });
      });

      observer.observe(target, {
        attributes: true,
        subtree: false,
        attributeFilter: ["style"]
      });

      return;
    }

    if (attempts < maxAttempts) {
      setTimeout(tryInit, interval);
    }
  };

  tryInit();
});
