import { Component } from '@theme/component';
import { debounce, isClickedOutside, onAnimationEnd } from '@theme/utilities';

/**
 * A custom element that manages a dialog.
 *
 * @typedef {object} Refs
 * @property {HTMLDialogElement} dialog – The dialog element.
 *
 * @extends Component<Refs>
 */
export class DialogComponent extends Component {
  requiredRefs = ['dialog'];

  connectedCallback() {
    super.connectedCallback();

    if (this.minWidth || this.maxWidth) {
      window.addEventListener('resize', this.#handleResize);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.minWidth || this.maxWidth) {
      window.removeEventListener('resize', this.#handleResize);
    }
  }

  #handleResize = debounce(() => {
    const { minWidth, maxWidth } = this;

    if (!minWidth && !maxWidth) return;

    const windowWidth = window.innerWidth;
    if (windowWidth < minWidth || windowWidth > maxWidth) {
      this.closeDialog();
    }
  }, 50);

  #previousScrollY = 0;

  /**
   * Shows the dialog.
   */
  showDialog() {
    const { dialog } = this.refs;

    if (dialog.open) return;

    const scrollY = window.scrollY;
    this.#previousScrollY = scrollY;

    // Prevent layout thrashing by separating DOM reads from DOM writes
    requestAnimationFrame(() => {
      document.body.style.width = '100%';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;

      dialog.showModal();
      this.dispatchEvent(new DialogOpenEvent());

      this.addEventListener('click', this.#handleClick);
      this.addEventListener('keydown', this.#handleKeyDown);
    });
  }

  /**
   * Closes the dialog.
   */
  closeDialog = async () => {
    const { dialog } = this.refs;

    if (!dialog.open) return;

    this.removeEventListener('click', this.#handleClick);
    this.removeEventListener('keydown', this.#handleKeyDown);

    dialog.classList.add('dialog-closing');

    await onAnimationEnd(dialog, undefined, {
      subtree: false,
    });

    document.body.style.width = '';
    document.body.style.position = '';
    document.body.style.top = '';
    window.scrollTo({ top: this.#previousScrollY, behavior: 'instant' });

    dialog.close();
    dialog.classList.remove('dialog-closing');

    this.dispatchEvent(new DialogCloseEvent());
  };

  /**
   * Toggles the dialog.
   */
  toggleDialog = () => {
    if (this.refs.dialog.open) {
      this.closeDialog();
    } else {
      this.showDialog();
    }
  };

  /**
   * Closes the dialog when the user clicks outside of it.
   *
   * @param {MouseEvent} event - The mouse event.
   */
  #handleClick(event) {
    const { dialog } = this.refs;

    // Check if click is on sticky filter/sort buttons
    const stickyBar = document.getElementById('mobile-sticky-filter-sort-bar');
    const target = event.target;
    
    if (stickyBar && target instanceof Element && stickyBar.contains(target)) {
      // Click is on sticky bar - handle dialog switching
      const clickedButton = target.closest('.mobile-sticky-filter-sort-bar__button');
      if (clickedButton instanceof HTMLElement) {
        const isFilterButton = clickedButton.classList.contains('mobile-sticky-filter-sort-bar__button--filter');
        const isSortButton = clickedButton.classList.contains('mobile-sticky-filter-sort-bar__button--sort');
        
        // Get the dialog IDs
        const filterDrawer = document.getElementById('filters-drawer');
        const sortPopup = document.getElementById('mobile-sort-popup');
        
        // If clicking filter button while sort is open, switch to filter
        if (isFilterButton && sortPopup && this.id === 'mobile-sort-popup') {
          event.preventDefault();
          event.stopPropagation();
          this.closeDialog();
          // Small delay to ensure smooth transition
          setTimeout(() => {
            if (filterDrawer && 'showDialog' in filterDrawer && typeof filterDrawer.showDialog === 'function') {
              filterDrawer.showDialog();
            }
          }, 50);
          return;
        }
        
        // If clicking sort button while filter is open, switch to sort
        if (isSortButton && filterDrawer && this.id === 'filters-drawer') {
          event.preventDefault();
          event.stopPropagation();
          this.closeDialog();
          // Small delay to ensure smooth transition
          setTimeout(() => {
            if (sortPopup && 'showDialog' in sortPopup && typeof sortPopup.showDialog === 'function') {
              sortPopup.showDialog();
            }
          }, 50);
          return;
        }
      }
    }

    // Check if click is in the bottom 58px area (sticky bar area) - exclude from closing
    const windowHeight = window.innerHeight;
    if (event.clientY > windowHeight - 58) {
      // Click is in sticky bar area, don't close dialog
      return;
    }

    if (isClickedOutside(event, dialog)) {
      this.closeDialog();
    }
  }

  /**
   * Closes the dialog when the user presses the escape key.
   *
   * @param {KeyboardEvent} event - The keyboard event.
   */
  #handleKeyDown(event) {
    if (event.key !== 'Escape') return;

    event.preventDefault();
    this.closeDialog();
  }

  /**
   * Gets the minimum width of the dialog.
   *
   * @returns {number} The minimum width of the dialog.
   */
  get minWidth() {
    return Number(this.getAttribute('dialog-active-min-width'));
  }

  /**
   * Gets the maximum width of the dialog.
   *
   * @returns {number} The maximum width of the dialog.
   */
  get maxWidth() {
    return Number(this.getAttribute('dialog-active-max-width'));
  }
}

if (!customElements.get('dialog-component')) customElements.define('dialog-component', DialogComponent);

export class DialogOpenEvent extends CustomEvent {
  constructor() {
    super(DialogOpenEvent.eventName);
  }

  static eventName = 'dialog:open';
}

export class DialogCloseEvent extends CustomEvent {
  constructor() {
    super(DialogCloseEvent.eventName);
  }

  static eventName = 'dialog:close';
}

document.addEventListener(
  'toggle',
  (event) => {
    if (event.target instanceof HTMLDetailsElement) {
      if (event.target.hasAttribute('scroll-lock')) {
        const { open } = event.target;

        if (open) {
          document.documentElement.setAttribute('scroll-lock', '');
        } else {
          document.documentElement.removeAttribute('scroll-lock');
        }
      }
    }
  },
  { capture: true }
);
