import { Component } from '@theme/component';
import { fetchConfig, debounce, onAnimationEnd, prefersReducedMotion, resetShimmer } from '@theme/utilities';
import { morphSection, sectionRenderer } from '@theme/section-renderer';
import {
  ThemeEvents,
  CartUpdateEvent,
  QuantitySelectorUpdateEvent,
  CartAddEvent,
  DiscountUpdateEvent,
} from '@theme/events';
import { cartPerformance } from '@theme/performance';

/** @typedef {import('./utilities').TextComponent} TextComponent */

/**
 * A custom element that displays a cart items component.
 *
 * @typedef {object} Refs
 * @property {HTMLElement[]} quantitySelectors - The quantity selector elements.
 * @property {HTMLTableRowElement[]} cartItemRows - The cart item rows.
 * @property {TextComponent} cartTotal - The cart total.
 *
 * @extends {Component<Refs>}
 */
class CartItemsComponent extends Component {
  #debouncedOnChange = debounce(this.#onQuantityChange, 300).bind(this);

  connectedCallback() {
    super.connectedCallback();

    document.addEventListener(ThemeEvents.cartUpdate, this.#handleCartUpdate);
    document.addEventListener(ThemeEvents.discountUpdate, this.handleDiscountUpdate);
    document.addEventListener(ThemeEvents.quantitySelectorUpdate, this.#debouncedOnChange);
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    document.removeEventListener(ThemeEvents.cartUpdate, this.#handleCartUpdate);
    document.removeEventListener(ThemeEvents.quantitySelectorUpdate, this.#debouncedOnChange);
  }

  /**
   * Handles QuantitySelectorUpdateEvent change event.
   * @param {QuantitySelectorUpdateEvent} event - The event.
   */
  #onQuantityChange(event) {
    const { quantity, cartLine: line } = event.detail;

    if (!line) return;

    if (quantity === 0) {
      return this.onLineItemRemove(line);
    }

    this.updateQuantity({
      line,
      quantity,
      action: 'change',
    });
    const lineItemRow = this.refs.cartItemRows[line - 1];

    if (!lineItemRow) return;

    const textComponent = /** @type {TextComponent | undefined} */ (lineItemRow.querySelector('text-component'));
    textComponent?.shimmer();
  }

  /**
   * Handles the line item removal.
   * @param {number} line - The line item index.
   */
  onLineItemRemove(line) {
    this.updateQuantity({
      line,
      quantity: 0,
      action: 'clear',
    });

    const cartItemRowToRemove = this.refs.cartItemRows[line - 1];

    if (!cartItemRowToRemove) return;

    const rowsToRemove = [
      cartItemRowToRemove,
      // Get all nested lines of the row to remove
      ...this.refs.cartItemRows.filter((row) => row.dataset.parentKey === cartItemRowToRemove.dataset.key),
    ];

    // Add class to the row to trigger the animation
    rowsToRemove.forEach((row) => {
      const remove = () => row.remove();

      if (prefersReducedMotion()) return remove();

      row.style.setProperty('--row-height', `${row.clientHeight}px`);
      row.classList.add('removing');

      // Remove the row after the animation ends
      onAnimationEnd(row, remove);
    });
  }

  /**
   * Updates the quantity.
   * @param {Object} config - The config.
   * @param {number} config.line - The line.
   * @param {number} config.quantity - The quantity.
   * @param {string} config.action - The action.
   */
  async updateQuantity(config) {
    const cartPerformaceUpdateMarker = cartPerformance.createStartingMarker(`${config.action}:user-action`);

    this.#disableCartItems();

    const { line, quantity } = config;
    const { cartTotal } = this.refs;

    // Get the line item row element
    const lineItemRow = this.refs.cartItemRows[line - 1];
    let batchUpdatePerformed = false;
    
    // Check if this item has a pair ID and update all matching items
    // This applies to both quantity changes and deletions
    if (lineItemRow) {
      const pairId = lineItemRow.getAttribute('data-lineItems') || lineItemRow.getAttribute('data-lineitem');
      
      if (pairId) {
        try {
          await this.#updateMatchingPairItems(pairId, quantity, lineItemRow);
          batchUpdatePerformed = true;
          
          // If we did a batch deletion (quantity = 0), refresh cart sections directly
          // instead of doing a single line update which may fail if items were removed
          if (quantity === 0) {
            cartTotal?.shimmer();
            
            const cartItemsComponents = document.querySelectorAll('cart-items-component');
            const sectionsToUpdate = new Set([this.sectionId]);
            cartItemsComponents.forEach((item) => {
              if (item instanceof HTMLElement && item.dataset.sectionId) {
                sectionsToUpdate.add(item.dataset.sectionId);
              }
            });
            
            // Fetch updated cart sections
            const sectionsUrl = `${window.location.pathname}?sections=${Array.from(sectionsToUpdate).join(',')}`;
            fetch(sectionsUrl)
              .then((response) => response.text())
              .then((responseText) => {
                const parsedResponseText = JSON.parse(responseText);
                resetShimmer(this);
                
                const newSectionHTML = new DOMParser().parseFromString(
                  parsedResponseText[this.sectionId],
                  'text/html'
                );
                
                const newCartHiddenItemCount = newSectionHTML.querySelector('[ref="cartItemCount"]')?.textContent;
                const newCartItemCount = newCartHiddenItemCount ? parseInt(newCartHiddenItemCount, 10) : 0;
                
                this.dispatchEvent(
                  new CartUpdateEvent({}, this.sectionId, {
                    itemCount: newCartItemCount,
                    source: 'cart-items-component',
                    sections: parsedResponseText,
                  })
                );
                
                morphSection(this.sectionId, parsedResponseText[this.sectionId]);
                this.#updateCartQuantitySelectorButtonStates();
                
                // Remove any duplicate headings after morph
                this.#removeDuplicateHeadings();
                
                // After cart update, check if gift box should be removed (immediate, no delay)
                if (typeof window.updatedGiftBox === 'function') {
                  window.updatedGiftBox();
                }
          })
          .catch((error) => {
            console.error('Error refreshing cart after batch deletion:', error);
          })
          .finally(() => {
            this.#enableCartItems();
            cartPerformance.measureFromMarker(cartPerformaceUpdateMarker);
          });
        
        return; // Exit early, don't do the normal single-line update
      }
        } catch (error) {
          console.error('Error updating matching pair items:', error);
          this.#enableCartItems();
          cartPerformance.measureFromMarker(cartPerformaceUpdateMarker);
          return;
        }
      }
    }

    const cartItemsComponents = document.querySelectorAll('cart-items-component');
    const sectionsToUpdate = new Set([this.sectionId]);
    cartItemsComponents.forEach((item) => {
      if (item instanceof HTMLElement && item.dataset.sectionId) {
        sectionsToUpdate.add(item.dataset.sectionId);
      }
    });

    const body = JSON.stringify({
      line: line,
      quantity: quantity,
      sections: Array.from(sectionsToUpdate).join(','),
      sections_url: window.location.pathname,
    });

    cartTotal?.shimmer();

    fetch(`${Theme.routes.cart_change_url}`, fetchConfig('json', { body }))
      .then((response) => {
        return response.text();
      })
      .then((responseText) => {
        const parsedResponseText = JSON.parse(responseText);

        resetShimmer(this);

        if (parsedResponseText.errors) {
          // Only handle error if the line still exists (for quantity updates)
          // For deletions with batch update, we've already handled the refresh
          if (batchUpdatePerformed && quantity === 0) {
            // Items were already removed, just refresh
            return;
          }
          this.#handleCartError(line, parsedResponseText);
          return;
        }

        const newSectionHTML = new DOMParser().parseFromString(
          parsedResponseText.sections[this.sectionId],
          'text/html'
        );

        // Grab the new cart item count from a hidden element
        const newCartHiddenItemCount = newSectionHTML.querySelector('[ref="cartItemCount"]')?.textContent;
        const newCartItemCount = newCartHiddenItemCount ? parseInt(newCartHiddenItemCount, 10) : 0;

        // Update data-cart-quantity for all matching variants
        this.#updateQuantitySelectors(parsedResponseText);

        this.dispatchEvent(
          new CartUpdateEvent({}, this.sectionId, {
            itemCount: newCartItemCount,
            source: 'cart-items-component',
            sections: parsedResponseText.sections,
          })
        );

        morphSection(this.sectionId, parsedResponseText.sections[this.sectionId]);

        this.#updateCartQuantitySelectorButtonStates();
        
        // Remove any duplicate headings after morph
        this.#removeDuplicateHeadings();
        
        // After cart update, check if gift box should be removed (immediate, no delay)
        if (quantity === 0 && typeof window.updatedGiftBox === 'function') {
          window.updatedGiftBox();
        }
      })
      .catch((error) => {
        console.error(error);
      })
      .finally(() => {
        this.#enableCartItems();
        cartPerformance.measureFromMarker(cartPerformaceUpdateMarker);
      });
  }

  /**
   * Handles the discount update.
   * @param {DiscountUpdateEvent} event - The event.
   */
  handleDiscountUpdate = (event) => {
    this.#handleCartUpdate(event);
  };

  /**
   * Handles the cart error.
   * @param {number} line - The line.
   * @param {Object} parsedResponseText - The parsed response text.
   * @param {string} parsedResponseText.errors - The errors.
   */
  #handleCartError = (line, parsedResponseText) => {
    const quantitySelector = this.refs.quantitySelectors[line - 1];
    const quantityInput = quantitySelector?.querySelector('input');

    if (!quantityInput) {
      console.warn('Quantity input not found for line:', line, '- item may have been removed');
      return;
    }

    quantityInput.value = quantityInput.defaultValue;

    const cartItemError = this.refs[`cartItemError-${line}`];
    const cartItemErrorContainer = this.refs[`cartItemErrorContainer-${line}`];

    if (!(cartItemError instanceof HTMLElement)) {
      console.warn('Cart item error element not found for line:', line, '- item may have been removed');
      return;
    }
    
    if (!(cartItemErrorContainer instanceof HTMLElement)) {
      console.warn('Cart item error container not found for line:', line, '- item may have been removed');
      return;
    }

    cartItemError.textContent = parsedResponseText.errors;
    cartItemErrorContainer.classList.remove('hidden');
  };

  /**
   * Handles the cart update.
   *
   * @param {DiscountUpdateEvent | CartUpdateEvent | CartAddEvent} event
   */
  #handleCartUpdate = (event) => {
    if (event instanceof DiscountUpdateEvent) {
      sectionRenderer.renderSection(this.sectionId, { cache: false });
      return;
    }
    if (event.target === this) return;

    const cartItemsHtml = event.detail.data.sections?.[this.sectionId];
    if (cartItemsHtml) {
      morphSection(this.sectionId, cartItemsHtml);

      // Update button states for all cart quantity selectors after morph
      this.#updateCartQuantitySelectorButtonStates();
      
      // Remove any duplicate empty cart headings
      this.#removeDuplicateHeadings();
    } else {
      sectionRenderer.renderSection(this.sectionId, { cache: false });
    }
  };

  /**
   * Removes duplicate empty cart headings to prevent display issues.
   */
  #removeDuplicateHeadings() {
    // Find all headings with the empty cart ID
    const emptyHeadings = document.querySelectorAll('#cart-drawer-heading-empty');
    
    // If there are multiple headings, keep only the first one and remove the rest
    if (emptyHeadings.length > 1) {
      for (let i = 1; i < emptyHeadings.length; i++) {
        const heading = emptyHeadings[i];
        if (heading) {
          heading.remove();
        }
      }
    }
    
    // Also check for duplicate headings by class
    const emptyHeadingByClass = document.querySelectorAll('.cart-drawer__heading--empty');
    if (emptyHeadingByClass.length > 1) {
      // Keep the first one, remove others that are not the first
      for (let i = 1; i < emptyHeadingByClass.length; i++) {
        const heading = emptyHeadingByClass[i];
        if (heading) {
          // Only remove if it's not the one with the ID (which we already handled)
          if (!heading.id || heading.id !== 'cart-drawer-heading-empty') {
            heading.remove();
          }
        }
      }
    }
  }

  /**
   * Disables the cart items.
   */
  #disableCartItems() {
    this.classList.add('cart-items-disabled');
  }

  /**
   * Enables the cart items.
   */
  #enableCartItems() {
    this.classList.remove('cart-items-disabled');
  }

  /**
   * Updates quantity selectors for all matching variants in the cart.
   * @param {Object} updatedCart - The updated cart object.
   * @param {Array<{variant_id: number, quantity: number}>} [updatedCart.items] - The cart items.
   */
  #updateQuantitySelectors(updatedCart) {
    if (!updatedCart.items) return;

    for (const item of updatedCart.items) {
      const variantId = item.variant_id.toString();
      const selectors = document.querySelectorAll(
        `quantity-selector-component[data-variant-id="${variantId}"], cart-quantity-selector-component[data-variant-id="${variantId}"]`
      );

      for (const selector of selectors) {
        const input = selector.querySelector('input[data-cart-quantity]');
        if (!input) continue;

        input.setAttribute('data-cart-quantity', item.quantity.toString());

        // Update the quantity selector's internal state
        if ('updateCartQuantity' in selector && typeof selector.updateCartQuantity === 'function') {
          selector.updateCartQuantity();
        }
      }
    }
  }

  /**
   * Updates button states for all cart quantity selector components.
   */
  #updateCartQuantitySelectorButtonStates() {
    const cartQuantitySelectors = document.querySelectorAll('cart-quantity-selector-component');
    for (const selector of cartQuantitySelectors) {
      if ('updateButtonStates' in selector && typeof selector.updateButtonStates === 'function') {
        selector.updateButtonStates();
      }
    }
  }

  /**
   * Updates all cart items with matching pair ID.
   * @param {string} pairId - The pair ID from data-lineItems attribute.
   * @param {number} quantity - The quantity to set for all matching items.
   * @param {HTMLElement} elem - The element that triggered the update.
   */
  /**
   * Updates all cart items with matching pair ID.
   * @param {string} pairId - The pair ID from data-lineItems attribute.
   * @param {number} quantity - The quantity to set for all matching items.
   * @param {HTMLElement} elem - The element that triggered the update.
   */
  async #updateMatchingPairItems(pairId, quantity, elem) {
    console.log('Updating matching pair items. Pair ID:', pairId, 'Quantity:', quantity);
    
    // Fetch current cart data
    const cartRes = await fetch('/cart.js');
    
    if (!cartRes.ok) {
      throw new Error('Failed to fetch cart data');
    }

    const cartData = await cartRes.json();

    // Find all items with the same pair ID - check _PairId property
    // Only match items with EXACT same pair ID value to avoid deleting items from other pairs
    const itemsWithSamePairId = cartData.items.filter(/** @param {any} item */ (item) => {
      if (!item.properties) return false;
      // Check for _PairId property - match exact key _PairId (case-sensitive)
      // This ensures we only match items from the same pair, not items from different pairs
      for (const [key, value] of Object.entries(item.properties)) {
        // Only match exact '_PairId' key (not keys containing it) and exact value match
        if (key === '_PairId' && String(value).trim() === String(pairId).trim()) {
          console.log('Found matching item:', item.key, 'with property', key, '=', value, 'matching pairId:', pairId);
          return true;
        }
      }
      return false;
    });

    if (itemsWithSamePairId.length === 0) {
      console.warn('No items found with matching pair ID:', pairId);
      return;
    }

    console.log('Total matching items found:', itemsWithSamePairId.length);
    
    // Log all matching items for debugging
    itemsWithSamePairId.forEach(/** @param {any} item */ (item) => {
      const itemPairId = item.properties?.['_PairId'];
      console.log('Matching item details - Key:', item.key, 'Pair ID:', itemPairId, 'Title:', item.product_title);
    });

    // Find the embroidery/engraving item (optional)
    const embroideryItem = itemsWithSamePairId.find(/** @param {any} item */ (item) => {
      if (!item.properties) return false;
      return item.properties['_Embroidery'] == 'true' || item.properties['_Engraving'] == 'true';
    });

    // Find all main products (excluding embroidery/engraving)
    const mainProducts = itemsWithSamePairId.filter(/** @param {any} item */ (item) => {
      if (!item.properties) return true;
      return item.properties['_Embroidery'] != 'true' && item.properties['_Engraving'] != 'true';
    });

    console.log('Updating quantity to:', quantity, 'for pair ID:', pairId);
    console.log('Main products found:', mainProducts.length, 'Embroidery item:', !!embroideryItem);

    // Update all items with the same pair ID
    if (itemsWithSamePairId.length > 0) {
      // Create a single update object for all items
      /** @type {Record<string, number>} */
      const updatesObj = {};
      itemsWithSamePairId.forEach(/** @param {any} item */ (item) => {
        const itemKey = String(item.key);
        updatesObj[itemKey] = Number(quantity);
      });

      // Send single batch update request
      const cartUpdateRes = await fetch('/cart/update.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          updates: updatesObj
        })
      });

      if (!cartUpdateRes.ok) {
        const errorText = await cartUpdateRes.text();
        throw new Error(`Failed to update cart quantities: ${errorText}`);
      }

      const cartUpdateData = await cartUpdateRes.json();
      console.log('Cart update successful:', cartUpdateData);
    }
  }

  /**
   * Gets the section id.
   * @returns {string} The section id.
   */
  get sectionId() {
    const { sectionId } = this.dataset;

    if (!sectionId) throw new Error('Section id missing');

    return sectionId;
  }
}

if (!customElements.get('cart-items-component')) {
  customElements.define('cart-items-component', CartItemsComponent);
}
