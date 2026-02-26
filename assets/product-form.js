import { Component } from '@theme/component';
import { fetchConfig, onAnimationEnd, preloadImage } from '@theme/utilities';
import { ThemeEvents, CartAddEvent, CartErrorEvent, CartUpdateEvent, VariantUpdateEvent } from '@theme/events';
import { cartPerformance } from '@theme/performance';
import { morph } from '@theme/morph';

export const ADD_TO_CART_TEXT_ANIMATION_DURATION = 2000;

// Error message display duration - gives users time to read the message
const ERROR_MESSAGE_DISPLAY_DURATION = 10000;

// Button re-enable delay after error - prevents rapid repeat attempts
const ERROR_BUTTON_REENABLE_DELAY = 1000;

// Success message display duration for screen readers
const SUCCESS_MESSAGE_DISPLAY_DURATION = 5000;

/**
 * A custom element that manages an add to cart button.
 *
 * @typedef {object} AddToCartRefs
 * @property {HTMLButtonElement} addToCartButton - The add to cart button.
 * @extends Component<AddToCartRefs>
 */
export class AddToCartComponent extends Component {
  requiredRefs = ['addToCartButton'];

  /** @type {number | undefined} */
  #animationTimeout;

  /** @type {number | undefined} */
  #cleanupTimeout;

  connectedCallback() {
    super.connectedCallback();

    this.addEventListener('pointerenter', this.#preloadImage);
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    if (this.#animationTimeout) clearTimeout(this.#animationTimeout);
    if (this.#cleanupTimeout) clearTimeout(this.#cleanupTimeout);
    this.removeEventListener('pointerenter', this.#preloadImage);
  }

  /**
   * Disables the add to cart button.
   */
  disable() {
    this.refs.addToCartButton.disabled = true;
  }

  /**
   * Enables the add to cart button.
   */
  enable() {
    this.refs.addToCartButton.disabled = false;
  }

  /**
   * Handles the click event for the add to cart button.
   * @param {MouseEvent & {target: HTMLElement}} event - The click event.
   */
  handleClick(event) {
    const form = this.closest('form');
    if (!form?.checkValidity()) return;

    // Check if adding would exceed max before animating
    const quantitySelector = /** @type {any} */ (form.querySelector('quantity-selector-component'));
    if (quantitySelector?.canAddToCart) {
      const validation = quantitySelector.canAddToCart();
      // Don't animate if it would exceed max
      if (!validation.canAdd) {
        return;
      }
    }

    // Check embroidery validation before animating
    const embroideryBox = document.querySelector('.embroidery-box-rewamp');
    const embroideryShowEmbRadio = embroideryBox ? /** @type {HTMLInputElement | null} */ (embroideryBox.querySelector('#showEmb')) : null;
    const embroideryDontShowEmbRadio = /** @type {HTMLInputElement | null} */ (document.getElementById('dontShowEmbroidery'));
    const embroideryVariantId = embroideryBox?.getAttribute('data-selected-variant-id');
    
    // Only validate embroidery selection if embroidery section exists on the page
    const embroiderySectionExists = embroideryShowEmbRadio !== null || embroideryDontShowEmbRadio !== null;
    
    if (embroiderySectionExists) {
      const isAddEmbroiderySelected = embroideryShowEmbRadio?.checked;
      const isDontShowEmbroiderySelected = embroideryDontShowEmbRadio?.checked;
      const isEmbroideryOptionSelected = isAddEmbroiderySelected || isDontShowEmbroiderySelected;
      
      // Don't animate if no embroidery option is selected
      if (!isEmbroideryOptionSelected) {
        return;
      }
      
      // Don't animate if "Add Embroidery" is selected but not configured
      if (isAddEmbroiderySelected && !embroideryVariantId) {
        return;
      }
    }

    // Check engraving validation before animating
    const engravingBox = document.querySelector('.engraving-box');
    const engravingShowEmbRadio = engravingBox ? /** @type {HTMLInputElement | null} */ (engravingBox.querySelector('#showEmb')) : null;
    const engravingDontShowEngraveRadio = engravingBox ? /** @type {HTMLInputElement | null} */ (engravingBox.querySelector('#dontShowEngrave')) : null;
    const engravingVariantId = engravingBox?.getAttribute('data-selected-variant-id');
    // Check if engraving is configured (has variant ID) or if the filled checkbox is checked
    const engravingFilledCheckbox = engravingBox ? /** @type {HTMLInputElement | null} */ (engravingBox.querySelector('input.engraving_filled')) : null;
    const isEngravingConfigured = engravingVariantId || (engravingFilledCheckbox?.checked === true);
    
    // Only validate engraving selection if engraving section exists on the page
    const engravingSectionExists = engravingShowEmbRadio !== null || engravingDontShowEngraveRadio !== null;
    
    if (engravingSectionExists) {
      const isAddEngravingSelected = engravingShowEmbRadio?.checked;
      const isDontShowEngravingSelected = engravingDontShowEngraveRadio?.checked;
      // Check if any option is selected OR if engraving is already configured
      const isEngravingOptionSelected = isAddEngravingSelected || isDontShowEngravingSelected || isEngravingConfigured;
      
      // Don't animate if no engraving option is selected and engraving is not configured
      if (!isEngravingOptionSelected) {
        return;
      }
      
      // Don't animate if "Add Engraving" radio is selected but not configured
      // But if engraving is already configured (filled checkbox), allow animation
      if (isAddEngravingSelected && !isEngravingConfigured) {
        return;
      }
    }

    // Check separate product picker validation before animating
    const separateProductPicker_topWrapper = document.querySelector('.separate-product-picker[data-picker-type="top"]');
    const separateProductPicker_bottomWrapper = document.querySelector('.separate-product-picker[data-picker-type="bottom"]');
    const separateProductPicker_topVariantId = /** @type {HTMLInputElement | null} */ (document.getElementById('top_product_variant_id'))?.value;
    const separateProductPicker_bottomVariantId = /** @type {HTMLInputElement | null} */ (document.getElementById('bottom_product_variant_id'))?.value;

    const separateProductPicker_isTopActive = separateProductPicker_topWrapper !== null;
    const separateProductPicker_isBottomActive = separateProductPicker_bottomWrapper !== null;

    // Don't animate if top product picker exists but no variant is selected
    if (separateProductPicker_isTopActive && !separateProductPicker_topVariantId) {
      return;
    }

    // Don't animate if bottom product picker exists but no variant is selected
    if (separateProductPicker_isBottomActive && !separateProductPicker_bottomVariantId) {
      return;
    }

    this.animateAddToCart();

    const animationEnabled = this.dataset.addToCartAnimation === 'true';

    if (animationEnabled && !event.target.closest('.quick-add-modal')) {
      this.#animateFlyToCart();
    }
  }

  #preloadImage = () => {
    const image = this.dataset.productVariantMedia;

    if (!image) return;

    preloadImage(image);
  };

  /**
   * Animates the fly to cart animation.
   */
  #animateFlyToCart() {
    const { addToCartButton } = this.refs;
    const cartIcon = document.querySelector('.header-actions__cart-icon');

    const image = this.dataset.productVariantMedia;

    if (!cartIcon || !addToCartButton || !image) return;

    const flyToCartElement = /** @type {FlyToCart} */ (document.createElement('fly-to-cart'));

    flyToCartElement.style.setProperty('background-image', `url(${image})`);
    flyToCartElement.source = addToCartButton;
    flyToCartElement.destination = cartIcon;

    document.body.appendChild(flyToCartElement);
  }

  /**
   * Animates the add to cart button.
   */
  animateAddToCart() {
    const { addToCartButton } = this.refs;

    if (this.#animationTimeout) clearTimeout(this.#animationTimeout);
    if (this.#cleanupTimeout) clearTimeout(this.#cleanupTimeout);

    if (!addToCartButton.classList.contains('atc-added')) {
      addToCartButton.classList.add('atc-added');
    }

    this.#animationTimeout = setTimeout(() => {
      this.#cleanupTimeout = setTimeout(() => {
        this.refs.addToCartButton.classList.remove('atc-added');
      }, 10);
    }, ADD_TO_CART_TEXT_ANIMATION_DURATION);
  }
}

if (!customElements.get('add-to-cart-component')) {
  customElements.define('add-to-cart-component', AddToCartComponent);
}

/**
 * A custom element that manages a product form.
 *
 * @typedef {object} ProductFormRefs
 * @property {HTMLInputElement} variantId - The form input for submitting the variant ID.
 * @property {AddToCartComponent | undefined} addToCartButtonContainer - The add to cart button container element.
 * @property {HTMLElement | undefined} addToCartTextError - The add to cart text error.
 * @property {HTMLElement | undefined} acceleratedCheckoutButtonContainer - The accelerated checkout button container element.
 * @property {HTMLElement} liveRegion - The live region.
 * @property {HTMLElement | undefined} quantityLabelCartCount - The quantity label cart count element.
 * @property {HTMLElement | undefined} quantityRules - The quantity rules element.
 * @property {HTMLElement | undefined} productFormButtons - The product form buttons container.
 *
 * @extends Component<ProductFormRefs>
 */
class ProductFormComponent extends Component {
  requiredRefs = ['variantId', 'liveRegion'];
  #abortController = new AbortController();

  /** @type {number | undefined} */
  #timeout;

  connectedCallback() {
    super.connectedCallback();

    const { signal } = this.#abortController;
    const target = this.closest('.shopify-section, dialog, product-card');
    target?.addEventListener(ThemeEvents.variantUpdate, this.#onVariantUpdate, { signal });
    target?.addEventListener(ThemeEvents.variantSelected, this.#onVariantSelected, { signal });

    // Listen for cart updates to sync data-cart-quantity
    document.addEventListener(ThemeEvents.cartUpdate, this.#onCartUpdate, { signal });
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    this.#abortController.abort();
  }

  /**
   * Fetches cart and updates quantity selector for current variant
   * @returns {Promise<number>} The cart quantity for the current variant
   */
  async #fetchAndUpdateCartQuantity() {
    const variantIdInput = /** @type {HTMLInputElement | null} */ (this.querySelector('input[name="id"]'));
    if (!variantIdInput?.value) return 0;

    try {
      const response = await fetch('/cart.js');
      const cart = await response.json();

      const cartItem = cart.items.find(
        /** @param {any} item */
        (item) => item.variant_id.toString() === variantIdInput.value.toString()
      );
      const cartQty = cartItem ? cartItem.quantity : 0;

      // Use public API to update quantity selector
      const quantitySelector = /** @type {any} */ (this.querySelector('quantity-selector-component'));
      if (quantitySelector?.setCartQuantity) {
        quantitySelector.setCartQuantity(cartQty);
      }

      // Update quantity label if it exists
      this.#updateQuantityLabel(cartQty);

      return cartQty;
    } catch (error) {
      console.error('Failed to fetch cart quantity:', error);
      return 0;
    }
  }

  /**
   * Updates data-cart-quantity when cart is updated from elsewhere
   * @param {CartUpdateEvent|CartAddEvent} event
   */
  #onCartUpdate = async (event) => {
    // Skip if this event came from this component
    if (event.detail?.sourceId === this.id || event.detail?.data?.source === 'product-form-component') return;

    await this.#fetchAndUpdateCartQuantity();
  };

  /**
   * Handles the submit event for the product form.
   *
   * @param {Event} event - The submit event.
   */
  handleSubmit(event) {
    const { addToCartTextError, addToCartButtonContainer } = this.refs;
    // Stop default behaviour from the browser
    event.preventDefault();

    if (this.#timeout) clearTimeout(this.#timeout);

    // Check if the add to cart button is disabled and do an early return if it is
    if (addToCartButtonContainer?.refs.addToCartButton?.disabled) return;

    // Send the add to cart information to the cart
    const form = this.querySelector('form');

    if (!form) throw new Error('Product form element missing');

    const quantitySelector = /** @type {any} */ (this.querySelector('quantity-selector-component'));
    if (quantitySelector?.canAddToCart) {
      const validation = quantitySelector.canAddToCart();

      if (!validation.canAdd) {
        addToCartButtonContainer?.disable();

        const errorTemplate = this.dataset.quantityErrorMax || '';
        const errorMessage = errorTemplate.replace('{{ maximum }}', validation.maxQuantity.toString());
        if (addToCartTextError) {
          addToCartTextError.classList.remove('hidden');

          const textNode = addToCartTextError.childNodes[2];
          if (textNode) {
            textNode.textContent = errorMessage;
          } else {
            const newTextNode = document.createTextNode(errorMessage);
            addToCartTextError.appendChild(newTextNode);
          }

          this.#setLiveRegionText(errorMessage);

          if (this.#timeout) clearTimeout(this.#timeout);
          this.#timeout = setTimeout(() => {
            if (!addToCartTextError) return;
            addToCartTextError.classList.add('hidden');
            this.#clearLiveRegionText();
          }, ERROR_MESSAGE_DISPLAY_DURATION);
        }

        setTimeout(() => {
          addToCartButtonContainer?.enable();
        }, ERROR_BUTTON_REENABLE_DELAY);

        return;
      }
    }

    const formData = new FormData(form);

    // Check embroidery selection status
    const embroideryBox = document.querySelector('.embroidery-box-rewamp');
    const embroideryShowEmbRadio = embroideryBox ? /** @type {HTMLInputElement | null} */ (embroideryBox.querySelector('#showEmb')) : null;
    const embroideryDontShowEmbRadio = /** @type {HTMLInputElement | null} */ (document.getElementById('dontShowEmbroidery'));
    const embroideryVariantId = embroideryBox?.getAttribute('data-selected-variant-id');
    
    // Only validate embroidery selection if embroidery section exists on the page
    const embroiderySectionExists = embroideryShowEmbRadio !== null || embroideryDontShowEmbRadio !== null;
    
    // Check if any embroidery option is selected
    const isAddEmbroiderySelected = embroideryShowEmbRadio?.checked;
    const isDontShowEmbroiderySelected = embroideryDontShowEmbRadio?.checked;
    const isEmbroideryOptionSelected = isAddEmbroiderySelected || isDontShowEmbroiderySelected;

    // If embroidery section exists but no option is selected, show error
    if (embroiderySectionExists && !isEmbroideryOptionSelected) {
      const embSelectOpt = /** @type {HTMLElement | null} */ (embroideryBox?.querySelector('.emb_select_opt'));
      if (embSelectOpt) {
        embSelectOpt.style.display = 'flex';
        this.#timeout = setTimeout(() => {
          if (!embSelectOpt) return;
          embSelectOpt.style.display = 'none';
        }, ERROR_MESSAGE_DISPLAY_DURATION);
      }
      return;
    }

    // If "Add Embroidery" is selected but not configured, show error
    if (isAddEmbroiderySelected && !embroideryVariantId) {
      const embSelectOpt = /** @type {HTMLElement | null} */ (embroideryBox?.querySelector('.emb_select_opt'));
      if (embSelectOpt) {
        embSelectOpt.style.display = 'flex';
        this.#timeout = setTimeout(() => {
          if (!embSelectOpt) return;
          embSelectOpt.style.display = 'none';
        }, ERROR_MESSAGE_DISPLAY_DURATION);
      }
      return;
    }

    // Check engraving selection status
    const engravingBox = document.querySelector('.engraving-box');
    const engravingShowEmbRadio = engravingBox ? /** @type {HTMLInputElement | null} */ (engravingBox.querySelector('#showEmb')) : null;
    const engravingDontShowEngraveRadio = engravingBox ? /** @type {HTMLInputElement | null} */ (engravingBox.querySelector('#dontShowEngrave')) : null;
    const engravingVariantId = engravingBox?.getAttribute('data-selected-variant-id');
    // Check if engraving is configured (has variant ID) or if the filled checkbox is checked
    const engravingFilledCheckbox = engravingBox ? /** @type {HTMLInputElement | null} */ (engravingBox.querySelector('input.engraving_filled')) : null;
    const isEngravingConfigured = engravingVariantId || (engravingFilledCheckbox?.checked === true);
    
    // Only validate engraving selection if engraving section exists on the page
    const engravingSectionExists = engravingShowEmbRadio !== null || engravingDontShowEngraveRadio !== null;
    
    // Check if any engraving option is selected (radio button) OR if engraving is already configured
    const isAddEngravingSelected = engravingShowEmbRadio?.checked;
    const isDontShowEngravingSelected = engravingDontShowEngraveRadio?.checked;
    const isEngravingOptionSelected = isAddEngravingSelected || isDontShowEngravingSelected || isEngravingConfigured;

    // If engraving section exists but no option is selected and engraving is not configured, show error
    if (engravingSectionExists && !isEngravingOptionSelected) {
      const engravingSelectOpt = /** @type {HTMLElement | null} */ (engravingBox?.querySelector('.emb_select_opt'));
      if (engravingSelectOpt) {
        engravingSelectOpt.style.display = 'flex';
        this.#timeout = setTimeout(() => {
          if (!engravingSelectOpt) return;
          engravingSelectOpt.style.display = 'none';
        }, ERROR_MESSAGE_DISPLAY_DURATION);
      }
      return;
    }

    // If "Add Engraving" radio is selected but not configured, show error
    // But if engraving is already configured (filled checkbox), allow it
    if (isAddEngravingSelected && !isEngravingConfigured) {
      const engravingSelectOpt = /** @type {HTMLElement | null} */ (engravingBox?.querySelector('.emb_select_opt'));
      if (engravingSelectOpt) {
        engravingSelectOpt.style.display = 'flex';
        this.#timeout = setTimeout(() => {
          if (!engravingSelectOpt) return;
          engravingSelectOpt.style.display = 'none';
        }, ERROR_MESSAGE_DISPLAY_DURATION);
      }
      return;
    }

    // Check separate product picker selection status
    const separateProductPicker_topWrapper = document.querySelector('.separate-product-picker[data-picker-type="top"]');
    const separateProductPicker_bottomWrapper = document.querySelector('.separate-product-picker[data-picker-type="bottom"]');
    const separateProductPicker_topVariantId = /** @type {HTMLInputElement | null} */ (document.getElementById('top_product_variant_id'))?.value;
    const separateProductPicker_bottomVariantId = /** @type {HTMLInputElement | null} */ (document.getElementById('bottom_product_variant_id'))?.value;

    const separateProductPicker_isTopActive = separateProductPicker_topWrapper !== null;
    const separateProductPicker_isBottomActive = separateProductPicker_bottomWrapper !== null;

    // Validate separate product pickers if they exist
    if (separateProductPicker_isTopActive && !separateProductPicker_topVariantId) {
      const separateProductPicker_topErrorDiv = /** @type {HTMLElement | null} */ (separateProductPicker_topWrapper?.querySelector('.product-picker-error'));
      if (separateProductPicker_topErrorDiv) {
        separateProductPicker_topErrorDiv.style.display = 'block';
        this.#timeout = setTimeout(() => {
          if (!separateProductPicker_topErrorDiv) return;
          separateProductPicker_topErrorDiv.style.display = 'none';
        }, ERROR_MESSAGE_DISPLAY_DURATION);
      }
      return;
    }

    if (separateProductPicker_isBottomActive && !separateProductPicker_bottomVariantId) {
      const separateProductPicker_bottomErrorDiv = /** @type {HTMLElement | null} */ (separateProductPicker_bottomWrapper?.querySelector('.product-picker-error'));
      if (separateProductPicker_bottomErrorDiv) {
        separateProductPicker_bottomErrorDiv.style.display = 'block';
        this.#timeout = setTimeout(() => {
          if (!separateProductPicker_bottomErrorDiv) return;
          separateProductPicker_bottomErrorDiv.style.display = 'none';
        }, ERROR_MESSAGE_DISPLAY_DURATION);
      }
      return;
    }

    // Check if we need to add multiple products (embroidery, engraving, or separate product pickers)
    // Check if embroidery/engraving checkboxes are checked
    const embroideryFilledCheckboxForMultiple = embroideryBox ? /** @type {HTMLInputElement | null} */ (embroideryBox.querySelector('input.embroidery_filled')) : null;
    const isEmbroideryFilledCheckedForMultiple = embroideryFilledCheckboxForMultiple?.checked === true;
    const engravingFilledCheckboxForMultiple = engravingBox ? /** @type {HTMLInputElement | null} */ (engravingBox.querySelector('input.engraving_filled')) : null;
    const isEngravingFilledCheckedForMultiple = engravingFilledCheckboxForMultiple?.checked === true;
    // For engraving, check if it's configured (has variant ID) and checkbox is checked
    const separateProductPicker_needsMultipleProducts = (isAddEmbroiderySelected && embroideryVariantId && isEmbroideryFilledCheckedForMultiple) || (isEngravingConfigured && engravingVariantId && isEngravingFilledCheckedForMultiple) || separateProductPicker_isTopActive || separateProductPicker_isBottomActive;
    // If separate product pickers exist, main product should not be added
    const separateProductPicker_shouldExcludeMain = separateProductPicker_isTopActive || separateProductPicker_isBottomActive;

    // If "Add Embroidery" is selected and configured, or separate product pickers exist, prepare to add multiple products
    if (separateProductPicker_needsMultipleProducts) {
      const separateProductPicker_mainProductId = /** @type {string | null} */ (formData.get('id'));
      const separateProductPicker_mainProductQuantity = /** @type {string} */ (formData.get('quantity') || '1');
      
      // Generate a unique 6-digit number (padded with leading zeros)
      const uniqueCode = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
      
      // Generate pair ID based on whether separate product pickers exist
      let separateProductPicker_pairId;
      if (separateProductPicker_isTopActive && separateProductPicker_isBottomActive && separateProductPicker_topVariantId && separateProductPicker_bottomVariantId) {
        // For separate products: top_variant_bottom_variant_uniqueCode
        separateProductPicker_pairId = `${separateProductPicker_topVariantId}_${separateProductPicker_bottomVariantId}_${uniqueCode}`;
      } else {
        // For regular products: variantID_uniqueCode
        const variantId = separateProductPicker_mainProductId || separateProductPicker_topVariantId || separateProductPicker_bottomVariantId;
        separateProductPicker_pairId = `${variantId}_${uniqueCode}`;
      }
      
      // Prepare items array for multiple products using JSON format
      /** @type {{ id: string; quantity: number; properties?: Record<string, string> }[]} */
      const separateProductPicker_items = [];

      // Only add main product if separate product pickers don't exist
      if (!separateProductPicker_shouldExcludeMain && separateProductPicker_mainProductId) {
        // Use the same pairId for main product, embroidery, and engraving to link them together
        separateProductPicker_items.push({
          id: separateProductPicker_mainProductId.toString(),
          quantity: Number(separateProductPicker_mainProductQuantity),
          properties: {
            '_PairId': separateProductPicker_pairId,
          },
        });
      }

      // Add top product if selected
      if (separateProductPicker_isTopActive && separateProductPicker_topVariantId) {
        separateProductPicker_items.push({
          id: separateProductPicker_topVariantId,
          quantity: Number(separateProductPicker_mainProductQuantity),
          properties: {
            '_PairId': separateProductPicker_pairId,
          },
        });
      }

      // Add bottom product if selected
      if (separateProductPicker_isBottomActive && separateProductPicker_bottomVariantId) {
        separateProductPicker_items.push({
          id: separateProductPicker_bottomVariantId,
          quantity: Number(separateProductPicker_mainProductQuantity),
          properties: {
            '_PairId': separateProductPicker_pairId,
          },
        });
      }

      // Add embroidery product if selected and checkbox is checked
      const embroideryFilledCheckbox = embroideryBox ? /** @type {HTMLInputElement | null} */ (embroideryBox.querySelector('input.embroidery_filled')) : null;
      const isEmbroideryFilledChecked = embroideryFilledCheckbox?.checked === true;
      if (isAddEmbroiderySelected && embroideryVariantId && isEmbroideryFilledChecked) {
        const embroideryProperties = this.#getEmbroideryProperties(/** @type {HTMLElement | null} */ (embroideryBox), separateProductPicker_pairId, embroideryVariantId);
        separateProductPicker_items.push({
          id: embroideryVariantId,
          quantity: Number(separateProductPicker_mainProductQuantity),
          properties: embroideryProperties,
        });
      }

      // Add engraving product if configured (has variant ID) and checkbox is checked
      const engravingFilledCheckboxForCart = engravingBox ? /** @type {HTMLInputElement | null} */ (engravingBox.querySelector('input.engraving_filled')) : null;
      const isEngravingFilledChecked = engravingFilledCheckboxForCart?.checked === true;
      if (isEngravingConfigured && engravingVariantId && isEngravingFilledChecked) {
        const engravingProperties = this.#getEngravingProperties(/** @type {HTMLElement | null} */ (engravingBox), separateProductPicker_pairId, engravingVariantId);
        separateProductPicker_items.push({
          id: engravingVariantId,
          quantity: Number(separateProductPicker_mainProductQuantity),
          properties: engravingProperties,
        });
      }

      // Validate that at least one item will be added
      if (separateProductPicker_items.length === 0) {
        throw new Error('No products to add to cart');
      }

      const separateProductPicker_cartItemsComponents = document.querySelectorAll('cart-items-component');
      /** @type {string[]} */
      let separateProductPicker_cartItemComponentsSectionIds = [];
      separateProductPicker_cartItemsComponents.forEach((separateProductPicker_item) => {
        if (separateProductPicker_item instanceof HTMLElement && separateProductPicker_item.dataset.sectionId) {
          separateProductPicker_cartItemComponentsSectionIds.push(separateProductPicker_item.dataset.sectionId);
        }
      });

      // Use JSON format for adding multiple items
      /** @type {{ items: { id: string; quantity: number; properties?: Record<string, string> }[]; sections?: string }} */
      const separateProductPicker_requestBody = {
        items: separateProductPicker_items,
      };
      if (separateProductPicker_cartItemComponentsSectionIds.length > 0) {
        separateProductPicker_requestBody.sections = separateProductPicker_cartItemComponentsSectionIds.join(',');
      }

      fetch(Theme.routes.cart_add_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(separateProductPicker_requestBody),
      })
        .then((response) => response.json())
        .then((response) => {
          if (response.status) {
            this.dispatchEvent(
              new CartErrorEvent(form.getAttribute('id') || '', response.message, response.description, response.errors)
            );

            if (!addToCartTextError) return;
            addToCartTextError.classList.remove('hidden');

            const textNode = addToCartTextError.childNodes[2];
            if (textNode) {
              textNode.textContent = response.message;
            } else {
              const newTextNode = document.createTextNode(response.message);
              addToCartTextError.appendChild(newTextNode);
            }

            this.#setLiveRegionText(response.message);

            this.#timeout = setTimeout(() => {
              if (!addToCartTextError) return;
              addToCartTextError.classList.add('hidden');
              this.#clearLiveRegionText();
            }, ERROR_MESSAGE_DISPLAY_DURATION);

            this.dispatchEvent(
              new CartAddEvent({}, this.id, {
                didError: true,
                source: 'product-form-component',
                itemCount: Number(separateProductPicker_mainProductQuantity),
                productId: this.dataset.productId,
              })
            );

            return;
          } else {
            // Use first item's ID if main product is excluded, otherwise use main product ID
            let separateProductPicker_id = '';
            if (separateProductPicker_shouldExcludeMain && separateProductPicker_items && separateProductPicker_items.length > 0 && separateProductPicker_items[0]) {
              separateProductPicker_id = separateProductPicker_items[0].id;
            } else if (separateProductPicker_mainProductId) {
              separateProductPicker_id = /** @type {string} */ (separateProductPicker_mainProductId);
            } else if (separateProductPicker_items && separateProductPicker_items.length > 0 && separateProductPicker_items[0]) {
              separateProductPicker_id = separateProductPicker_items[0].id;
            }

            if (addToCartTextError) {
              addToCartTextError.classList.add('hidden');
              addToCartTextError.removeAttribute('aria-live');
            }

            if (!separateProductPicker_id) throw new Error('Form ID is required');

            if (this.refs.addToCartButtonContainer?.refs.addToCartButton) {
              const separateProductPicker_addToCartButton = this.refs.addToCartButtonContainer.refs.addToCartButton;
              const separateProductPicker_addedTextElement = separateProductPicker_addToCartButton.querySelector('.add-to-cart-text--added');
              const separateProductPicker_addedText = separateProductPicker_addedTextElement?.textContent?.trim() || Theme.translations.added;

              this.#setLiveRegionText(separateProductPicker_addedText);

              setTimeout(() => {
                this.#clearLiveRegionText();
              }, SUCCESS_MESSAGE_DISPLAY_DURATION);
            }

            this.#fetchAndUpdateCartQuantity();

            this.dispatchEvent(
              new CartAddEvent({}, separateProductPicker_id.toString(), {
                source: 'product-form-component',
                itemCount: Number(separateProductPicker_mainProductQuantity),
                productId: this.dataset.productId,
                sections: response.sections,
              })
            );

                  // Reset embroidery and engraving selection after successful add to cart
                  this.#resetEmbroiderySelection();
                  this.#resetEngravingSelection();
          }
        })
        .catch((error) => {
          console.error(error);
        })
        .finally(() => {
          cartPerformance.measureFromEvent('add:user-action', event);
        });
      
      return; // Exit early since we handled embroidery case
    }

    // Normal flow when "No, I'll Pass" is selected or embroidery is not applicable
    // Generate unique 6-digit number and create PairId (padded with leading zeros)
    const uniqueCode = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    const variantId = formData.get('id');
    if (variantId) {
      const pairId = `${String(variantId)}_${uniqueCode}`;
      formData.append('properties[_PairId]', pairId);
    }

    const cartItemsComponents = document.querySelectorAll('cart-items-component');
    let cartItemComponentsSectionIds = [];
    cartItemsComponents.forEach((item) => {
      if (item instanceof HTMLElement && item.dataset.sectionId) {
        cartItemComponentsSectionIds.push(item.dataset.sectionId);
      }
      formData.append('sections', cartItemComponentsSectionIds.join(','));
    });

    const fetchCfg = fetchConfig('javascript', { body: formData });

    fetch(Theme.routes.cart_add_url, {
      ...fetchCfg,
      headers: {
        ...fetchCfg.headers,
        Accept: 'text/html',
      },
    })
      .then((response) => response.json())
      .then((response) => {
        if (response.status) {
          this.dispatchEvent(
            new CartErrorEvent(form.getAttribute('id') || '', response.message, response.description, response.errors)
          );

          if (!addToCartTextError) return;
          addToCartTextError.classList.remove('hidden');

          // Reuse the text node if the user is spam-clicking
          const textNode = addToCartTextError.childNodes[2];
          if (textNode) {
            textNode.textContent = response.message;
          } else {
            const newTextNode = document.createTextNode(response.message);
            addToCartTextError.appendChild(newTextNode);
          }

          // Create or get existing error live region for screen readers
          this.#setLiveRegionText(response.message);

          this.#timeout = setTimeout(() => {
            if (!addToCartTextError) return;
            addToCartTextError.classList.add('hidden');

            // Clear the announcement
            this.#clearLiveRegionText();
          }, ERROR_MESSAGE_DISPLAY_DURATION);

          // When we add more than the maximum amount of items to the cart, we need to dispatch a cart update event
          // because our back-end still adds the max allowed amount to the cart.
          this.dispatchEvent(
            new CartAddEvent({}, this.id, {
              didError: true,
              source: 'product-form-component',
              itemCount: Number(formData.get('quantity')) || Number(this.dataset.quantityDefault),
              productId: this.dataset.productId,
            })
          );

          return;
        } else {
          const id = formData.get('id');

          if (addToCartTextError) {
            addToCartTextError.classList.add('hidden');
            addToCartTextError.removeAttribute('aria-live');
          }

          if (!id) throw new Error('Form ID is required');

          // Add aria-live region to inform screen readers that the item was added
          if (this.refs.addToCartButtonContainer?.refs.addToCartButton) {
            const addToCartButton = this.refs.addToCartButtonContainer.refs.addToCartButton;
            const addedTextElement = addToCartButton.querySelector('.add-to-cart-text--added');
            const addedText = addedTextElement?.textContent?.trim() || Theme.translations.added;

            this.#setLiveRegionText(addedText);

            setTimeout(() => {
              this.#clearLiveRegionText();
            }, SUCCESS_MESSAGE_DISPLAY_DURATION);
          }

          // Fetch the updated cart to get the actual total quantity for this variant
          this.#fetchAndUpdateCartQuantity();

          this.dispatchEvent(
            new CartAddEvent({}, id.toString(), {
              source: 'product-form-component',
              itemCount: Number(formData.get('quantity')) || Number(this.dataset.quantityDefault),
              productId: this.dataset.productId,
              sections: response.sections,
            })
          );

          // Reset embroidery and engraving selection after successful add to cart (even if "No, I'll Pass" was selected)
          this.#resetEmbroiderySelection();
          this.#resetEngravingSelection();
        }
      })
      .catch((error) => {
        console.error(error);
      })
      .finally(() => {
        cartPerformance.measureFromEvent('add:user-action', event);
      });
  }

  /**
   * Updates the quantity label with the current cart quantity
   * @param {number} cartQty - The quantity in cart
   */
  #updateQuantityLabel(cartQty) {
    const quantityLabel = this.refs.quantityLabelCartCount;
    if (quantityLabel) {
      const inCartText = quantityLabel.textContent?.match(/\((\d+)\s+(.+)\)/);
      if (inCartText && inCartText[2]) {
        quantityLabel.textContent = `(${cartQty} ${inCartText[2]})`;
      }

      // Show/hide based on quantity
      quantityLabel.classList.toggle('hidden', cartQty === 0);
    }
  }

  /**
   * @param {*} text
   */
  #setLiveRegionText(text) {
    const liveRegion = this.refs.liveRegion;
    liveRegion.textContent = text;
  }

  #clearLiveRegionText() {
    const liveRegion = this.refs.liveRegion;
    liveRegion.textContent = '';
  }

  /**
   * Resets the embroidery selection after successful add to cart
   */
  #resetEmbroiderySelection() {
    try {
      const embroideryBox = document.querySelector('.embroidery-box-rewamp');
      if (!embroideryBox) return;

      // Uncheck radio buttons within embroidery box
      const showEmbRadio = /** @type {HTMLInputElement | null} */ (embroideryBox.querySelector('#showEmb'));
      const dontShowEmbRadio = /** @type {HTMLInputElement | null} */ (document.getElementById('dontShowEmbroidery'));
      if (showEmbRadio) showEmbRadio.checked = false;
      if (dontShowEmbRadio) dontShowEmbRadio.checked = false;

      // Remove checked class from radio button parents
      const radioButtons = embroideryBox.querySelectorAll("input[name='embroidery']");
      radioButtons.forEach((rb) => {
        if (rb instanceof HTMLElement) {
          rb.parentElement?.classList.remove('checked');
        }
      });

      // Clear embroidery variant ID and SKU
      embroideryBox.removeAttribute('data-selected-variant-id');
      embroideryBox.removeAttribute('data-selected-variant-sku');

      // Call the existing EmbroideryDelete function if available
      const embroideryDeleteFn = /** @type {(() => void) | undefined} */ (
        // @ts-ignore
        window.EmbroideryDelete
      );
      if (typeof embroideryDeleteFn === 'function') {
        embroideryDeleteFn();
      }
    } catch (error) {
      console.error('Error resetting embroidery selection:', error);
    }
  }

  /**
   * Resets the engraving selection after successful add to cart
   */
  #resetEngravingSelection() {
    try {
      const engravingBox = document.querySelector('.engraving-box');
      if (!engravingBox) return;

      // Uncheck radio buttons within engraving box
      const engravingShowEmbRadio = /** @type {HTMLInputElement | null} */ (engravingBox.querySelector('#showEmb'));
      const engravingDontShowEngraveRadio = /** @type {HTMLInputElement | null} */ (engravingBox.querySelector('#dontShowEngrave'));
      if (engravingShowEmbRadio) engravingShowEmbRadio.checked = false;
      if (engravingDontShowEngraveRadio) engravingDontShowEngraveRadio.checked = false;

      // Remove checked class from radio button parents
      const engravingRadioButtons = engravingBox.querySelectorAll("input[name='engraving']");
      engravingRadioButtons.forEach((rb) => {
        if (rb instanceof HTMLElement) {
          rb.parentElement?.classList.remove('checked');
        }
      });

      // Clear engraving variant ID, SKU, and properties
      engravingBox.removeAttribute('data-selected-variant-id');
      engravingBox.removeAttribute('data-selected-variant-sku');
      engravingBox.removeAttribute('data-engraving-text');
      engravingBox.removeAttribute('data-engraving-selected');
      engravingBox.removeAttribute('data-engraving-font-type');
      engravingBox.removeAttribute('data-engraving-enabled');

      // Call the existing Engravingdelete function if available
      const engravingDeleteFn = /** @type {(() => void) | undefined} */ (
        // @ts-ignore
        window.Engravingdelete
      );
      if (typeof engravingDeleteFn === 'function') {
        engravingDeleteFn();
      }
    } catch (error) {
      console.error('Error resetting engraving selection:', error);
    }
  }

  /**
   * Collects embroidery properties from the DOM for cart
   * @param {HTMLElement | null} embroideryBox - The embroidery box element
   * @param {string} pairId - The pair ID to link products
   * @param {string} variantId - The embroidery variant ID
   * @returns {Record<string, string>} Properties object for the cart
   */
  #getEmbroideryProperties(embroideryBox, pairId, variantId) {
    /** @type {Record<string, string>} */
    const properties = {
      '_PairId': pairId,
      '_Embroidery': 'true',
    };

    if (!embroideryBox) return properties;

    // Get SKU
    const embroiderySku = embroideryBox.getAttribute('data-selected-variant-sku');
    if (embroiderySku) {
      properties['_SKU'] = embroiderySku;
    }

    // Find the visible section (text only, icon only, or both)
    const textOnlySection = /** @type {HTMLElement | null} */ (embroideryBox.querySelector('.list_row_only_Text'));
    const iconOnlySection = /** @type {HTMLElement | null} */ (embroideryBox.querySelector('.list_row_only_Image'));
    const bothSection = /** @type {HTMLElement | null} */ (embroideryBox.querySelector('.list_row_both'));

    // Determine which section is visible
    let activeSection = null;
    if (bothSection && bothSection.style.display !== 'none' && window.getComputedStyle(bothSection).display !== 'none') {
      activeSection = bothSection;
    } else if (textOnlySection && textOnlySection.style.display !== 'none' && window.getComputedStyle(textOnlySection).display !== 'none') {
      activeSection = textOnlySection;
    } else if (iconOnlySection && iconOnlySection.style.display !== 'none' && window.getComputedStyle(iconOnlySection).display !== 'none') {
      activeSection = iconOnlySection;
    }

    // If no active section found, try to find any visible one by checking all
    if (!activeSection) {
      const allSections = [bothSection, textOnlySection, iconOnlySection].filter((s) => s !== null);
      for (const section of allSections) {
        const htmlSection = /** @type {HTMLElement} */ (section);
        if (htmlSection && (htmlSection.style.display !== 'none' && window.getComputedStyle(htmlSection).display !== 'none')) {
          activeSection = htmlSection;
          break;
        }
      }
    }

    // If still no active section, search in the entire embroidery box
    const searchContainer = activeSection || embroideryBox;

    // Get text properties from active section or entire box - try multiple selectors
    let textEmbElement = searchContainer.querySelector('.property_line__textEmb.property_line__textEmbfirst');
    if (!textEmbElement) {
      textEmbElement = embroideryBox.querySelector('.property_line__textEmb.property_line__textEmbfirst');
    }
    let textValue = '';
    if (textEmbElement) {
      const htmlTextEmb = /** @type {HTMLElement} */ (textEmbElement);
      textValue = (htmlTextEmb.textContent || htmlTextEmb.innerText || '').trim();
      if (textValue) {
        properties['_text'] = textValue;
        properties['first_name'] = textValue.split(',')[0]?.trim() || '';
        properties['designation'] = textValue.split(',')[1]?.trim() || '';
      }
    }

    // Get color from active section or entire box - try multiple selectors
    let colorElement = searchContainer.querySelector('.property_line.property_line_colorValue');
    if (!colorElement) {
      colorElement = embroideryBox.querySelector('.property_line.property_line_colorValue');
    }
    if (colorElement) {
      const htmlColor = /** @type {HTMLElement} */ (colorElement);
      const colorValue = (htmlColor.textContent || htmlColor.innerText || '').trim();
      if (colorValue) {
        properties['Color'] = colorValue;
      }
    }

    // Get font from active section or entire box - try multiple selectors
    let fontElement = searchContainer.querySelector('.property_line_FontStyle');
    if (!fontElement) {
      fontElement = embroideryBox.querySelector('.property_line_FontStyle');
    }
    if (fontElement) {
      const htmlFont = /** @type {HTMLElement} */ (fontElement);
      const fontValue = (htmlFont.textContent || htmlFont.innerText || '').trim();
      if (fontValue) {
        properties['Font'] = fontValue;
      }
    }

    // Get icon from active section or entire box - try multiple selectors
    let iconElement = searchContainer.querySelector('.property_line.property_line_Iconname_Name');
    if (!iconElement) {
      iconElement = embroideryBox.querySelector('.property_line.property_line_Iconname_Name');
    }
    let iconValue = '';
    if (iconElement) {
      const htmlIcon = /** @type {HTMLElement} */ (iconElement);
      iconValue = (htmlIcon.textContent || htmlIcon.innerText || '').trim();
      if (iconValue) {
        properties['Icon'] = iconValue;
      }
    }

    // Get text position from active section or entire box - try multiple selectors
    // Only add _Text Position if Text is present
    let textPositionElement = searchContainer.querySelector('.property_line_TextPositionPlacement');
    if (!textPositionElement) {
      textPositionElement = embroideryBox.querySelector('.property_line_TextPositionPlacement');
    }
    if (textPositionElement && textValue) {
      const htmlTextPos = /** @type {HTMLElement} */ (textPositionElement);
      const textPositionValue = (htmlTextPos.textContent || htmlTextPos.innerText || '').trim();
      if (textPositionValue) {
        properties['_Text Position'] = textPositionValue;
      }
    }

    // Get icon placement from active section or entire box - try multiple selectors
    // Only add _Icon Placement if Icon is present
    let iconPlacementElement = searchContainer.querySelector('.property_line_Iconname_NamePlacement');
    if (!iconPlacementElement) {
      iconPlacementElement = embroideryBox.querySelector('.property_line_Iconname_NamePlacement');
    }
    if (iconPlacementElement && iconValue) {
      const htmlIconPlace = /** @type {HTMLElement} */ (iconPlacementElement);
      const iconPlacementValue = (htmlIconPlace.textContent || htmlIconPlace.innerText || '').trim();
      if (iconPlacementValue) {
        properties['_Icon Placement'] = iconPlacementValue;
      }
    }

    // Get image URL from data attribute
    const imageUrl = embroideryBox.getAttribute('data-selected-variant-img');
    if (imageUrl) {
      console.log("imageUrl,imageUrl",imageUrl);
      properties['customUpload'] = imageUrl;
    }

    return properties;
  }

  /**
   * Collects engraving properties from data attributes for cart
   * @param {HTMLElement | null} engravingBox - The engraving box element
   * @param {string} pairId - The pair ID to link products
   * @param {string} variantId - The engraving variant ID
   * @returns {Record<string, string>} Properties object for the cart
   */
  #getEngravingProperties(engravingBox, pairId, variantId) {
    /** @type {Record<string, string>} */
    const properties = {
      '_PairId': pairId,
      '_Engraving': 'true',
    };

    if (!engravingBox) return properties;

    // Get SKU
    const engravingSku = engravingBox.getAttribute('data-selected-variant-sku');
    if (engravingSku) {
      properties['_sku'] = engravingSku;
    }

    // Get engraving text
    const engravingText = engravingBox.getAttribute('data-engraving-text');
    if (engravingText) {
      properties['Added_text'] = engravingText;
    }

    // Get engraving selected type
    const engravingSelected = engravingBox.getAttribute('data-engraving-selected');
    if (engravingSelected) {
      properties['_Engraving_Selected'] = engravingSelected;
    }

    // Get font type
    const fontType = engravingBox.getAttribute('data-engraving-font-type');
    if (fontType) {
      properties['_Font_Type'] = fontType;
    }

    return properties;
  }

  /**
   * Morphs or removes/adds an element based on current and new element states
   * @param {Element | null | undefined} currentElement - The current element in the DOM
   * @param {Element | null | undefined} newElement - The new element from the server response
   * @param {Element | null} [insertReferenceElement] - Element to insert before if adding new element
   */
  #morphOrUpdateElement(currentElement, newElement, insertReferenceElement = null) {
    if (currentElement && newElement) {
      morph(currentElement, newElement);
    } else if (currentElement && !newElement) {
      currentElement.remove();
    } else if (!currentElement && newElement && insertReferenceElement) {
      insertReferenceElement.insertAdjacentElement('beforebegin', /** @type {Element} */ (newElement.cloneNode(true)));
    }
  }

  /**
   * @param {VariantUpdateEvent} event
   */
  #onVariantUpdate = async (event) => {
    if (event.detail.data.newProduct) {
      this.dataset.productId = event.detail.data.newProduct.id;
    } else if (event.detail.data.productId !== this.dataset.productId) {
      return;
    }

    const { variantId, addToCartButtonContainer } = this.refs;

    const currentAddToCartButton = addToCartButtonContainer?.refs.addToCartButton;
    const newAddToCartButton = event.detail.data.html.querySelector('[ref="addToCartButton"]');

    // Update the variant ID
    variantId.value = event.detail.resource?.id ?? '';

    if (!currentAddToCartButton && !this.refs.acceleratedCheckoutButtonContainer) return;

    // Update the button state
    if (currentAddToCartButton) {
      if (event.detail.resource == null || event.detail.resource.available == false) {
        addToCartButtonContainer.disable();
      } else {
        addToCartButtonContainer.enable();
      }

      // Update the add to cart button text and icon
      if (newAddToCartButton) {
        morph(currentAddToCartButton, newAddToCartButton);
      }
    }

    if (this.refs.acceleratedCheckoutButtonContainer) {
      if (event.detail.resource == null || event.detail.resource.available == false) {
        this.refs.acceleratedCheckoutButtonContainer?.setAttribute('hidden', 'true');
      } else {
        this.refs.acceleratedCheckoutButtonContainer?.removeAttribute('hidden');
      }
    }

    // Set the data attribute for the add to cart button to the product variant media if it exists
    if (event.detail.resource) {
      const productVariantMedia = event.detail.resource.featured_media?.preview_image?.src;
      productVariantMedia &&
        addToCartButtonContainer?.setAttribute('data-product-variant-media', productVariantMedia + '&width=100');
    }

    // Update quantity selector's min/max/step attributes and cart quantity for the new variant
    const quantitySelector = /** @type {any} */ (this.querySelector('quantity-selector-component'));
    const newQuantityInput = /** @type {HTMLInputElement | null} */ (
      event.detail.data.html.querySelector('quantity-selector-component input[ref="quantityInput"]')
    );

    if (quantitySelector?.updateConstraints && newQuantityInput) {
      quantitySelector.updateConstraints(
        newQuantityInput.min,
        newQuantityInput.max || null,
        newQuantityInput.step
      );
    }

    // Check if quantity rules are appearing/disappearing (causes layout shift)
    const quantityRules = this.refs.quantityRules;
    const newQuantityRules = event.detail.data.html.querySelector('.quantity-rules');
    const isQuantityRulesChanging = !!quantityRules !== !!newQuantityRules;

    if (isQuantityRulesChanging && quantitySelector) {
      // Store quantity value before morphing entire container
      const currentQuantityValue = quantitySelector.getValue?.();

      const currentProductFormButtons = this.refs.productFormButtons;
      const newProductFormButtons = event.detail.data.html.querySelector('.product-form-buttons');

      if (currentProductFormButtons && newProductFormButtons) {
        morph(currentProductFormButtons, newProductFormButtons);

        // Get the NEW quantity selector after morphing and update its constraints
        const newQuantitySelector = /** @type {any} */ (this.querySelector('quantity-selector-component'));
        const newQuantityInputElement = /** @type {HTMLInputElement | null} */ (
          event.detail.data.html.querySelector('quantity-selector-component input[ref="quantityInput"]')
        );

        if (newQuantitySelector?.updateConstraints && newQuantityInputElement && currentQuantityValue) {
          // Temporarily set the old value so updateConstraints can snap it properly
          newQuantitySelector.setValue(currentQuantityValue);
          // updateConstraints will snap to valid increment if needed
          newQuantitySelector.updateConstraints(
            newQuantityInputElement.min,
            newQuantityInputElement.max || null,
            newQuantityInputElement.step
          );
        }
      }
    } else {
      // Update elements individually when layout isn't changing
      const quantityLabel = this.querySelector('.quantity-label');
      const newQuantityLabel = event.detail.data.html.querySelector('.quantity-label');
      this.#morphOrUpdateElement(quantityLabel, newQuantityLabel, quantitySelector);

      const addToCartButton = this.querySelector('[ref="addToCartButtonContainer"]');
      this.#morphOrUpdateElement(quantityRules, newQuantityRules, addToCartButton);
    }

    // Fetch and update cart quantity for the new variant
    await this.#fetchAndUpdateCartQuantity();
  };

  /**
   * Disable the add to cart button while the UI is updating before #onVariantUpdate is called.
   * Accelerated checkout button is also disabled via its own event listener not exposed to the theme.
   */
  #onVariantSelected = () => {
    this.refs.addToCartButtonContainer?.disable();
  };
}

if (!customElements.get('product-form-component')) {
  customElements.define('product-form-component', ProductFormComponent);
}

class FlyToCart extends HTMLElement {
  /** @type {Element} */
  source;

  /** @type {Element} */
  destination;

  connectedCallback() {
    this.#animate();
  }

  #animate() {
    const rect = this.getBoundingClientRect();
    const sourceRect = this.source.getBoundingClientRect();
    const destinationRect = this.destination.getBoundingClientRect();

    //Define bezier curve points
    // Maybe add half of the size of the flying thingy to the x and y to make it center properly
    const offset = {
      x: rect.width / 2,
      y: rect.height / 2,
    };
    const startPoint = {
      x: sourceRect.left + sourceRect.width / 2 - offset.x,
      y: sourceRect.top + sourceRect.height / 2 - offset.y,
    };

    const endPoint = {
      x: destinationRect.left + destinationRect.width / 2 - offset.x,
      y: destinationRect.top + destinationRect.height / 2 - offset.y,
    };

    //Calculate the control points
    const controlPoint1 = { x: startPoint.x, y: startPoint.y - 200 }; // Go up 200px
    const controlPoint2 = { x: endPoint.x - 300, y: endPoint.y - 100 }; // Go left 300px and up 100px

    //Animation variables
    /** @type {number | null} */
    let startTime = null;
    const duration = 600; // 600ms

    this.style.opacity = '1';

    /**
     * Animates the flying thingy along the bezier curve.
     * @param {number} currentTime - The current time.
     */
    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Calculate current position along the bezier curve
      const position = bezierPoint(progress, startPoint, controlPoint1, controlPoint2, endPoint);

      //Update the position of the flying thingy
      this.style.setProperty('--x', `${position.x}px`);
      this.style.setProperty('--y', `${position.y}px`);

      // Scale down as it approaches the cart
      const scale = 1 - progress * 0.5;
      this.style.setProperty('--scale', `${scale}`);

      //Continue the animation if not finished
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        //Fade out the flying thingy
        this.style.opacity = '0';
        onAnimationEnd(this, () => this.remove());
      }
    };

    // Position the flying thingy back to the start point
    this.style.setProperty('--x', `${startPoint.x}px`);
    this.style.setProperty('--y', `${startPoint.y}px`);

    //Start the animation
    requestAnimationFrame(animate);
  }
}

/**
 * Calculates a point on a cubic Bézier curve.
 * @param {number} t - The parameter value (0 <= t <= 1).
 * @param {{x: number, y: number}} p0 - The starting point (x, y).
 * @param {{x: number, y: number}} p1 - The first control point (x, y).
 * @param {{x: number, y: number}} p2 - The second control point (x, y).
 * @param {{x: number, y: number}} p3 - The ending point (x, y).
 * @returns {{x: number, y: number}} The point on the curve.
 */
function bezierPoint(t, p0, p1, p2, p3) {
  const cX = 3 * (p1.x - p0.x);
  const bX = 3 * (p2.x - p1.x) - cX;
  const aX = p3.x - p0.x - cX - bX;

  const cY = 3 * (p1.y - p0.y);
  const bY = 3 * (p2.y - p1.y) - cY;
  const aY = p3.y - p0.y - cY - bY;

  const x = aX * Math.pow(t, 3) + bX * Math.pow(t, 2) + cX * t + p0.x;
  const y = aY * Math.pow(t, 3) + bY * Math.pow(t, 2) + cY * t + p0.y;

  return { x, y };
}

if (!customElements.get('fly-to-cart')) {
  customElements.define('fly-to-cart', FlyToCart);
}
