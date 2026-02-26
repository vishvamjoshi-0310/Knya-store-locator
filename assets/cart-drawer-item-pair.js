// Function to group cart items by pair_id
function groupCartItemsByPair() {
  // First, remove existing classes to avoid duplicates
  const allCartItems = document.querySelectorAll('.cart-item');
  allCartItems.forEach((item) => {
    item.classList.remove('pair-grouped', 'pair-first', 'pair-last');
  });

  const cartItems = document.querySelectorAll('.cart-item[pair_id]:not([pair_id=""]):not(.additional-cart-item)');
  /** @type {Record<string, Element[]>} */
  const pairGroups = {};
  
  // Group items by pair_id
  cartItems.forEach((item) => {
    const pairId = item.getAttribute('pair_id');
    if (pairId && pairId !== '') {
      if (!pairGroups[pairId]) {
        pairGroups[pairId] = [];
      }
      pairGroups[pairId].push(item);
    }
  });
  
  // Apply CSS classes to each group
  Object.values(pairGroups).forEach((group) => {
    if (group.length > 1) {
      group.forEach((item, index) => {
        item.classList.add('pair-grouped');
        if (index === 0) {
          item.classList.add('pair-first');
        }
        if (index === group.length - 1) {
          item.classList.add('pair-last');
        }
      });
    }
  });
}

// Make function available globally
window.groupCartItemsByPair = groupCartItemsByPair;

// Run grouping with a small delay to ensure DOM is ready
function runGroupingWithDelay() {
  // Use requestAnimationFrame and setTimeout to ensure DOM is fully updated
  requestAnimationFrame(() => {
    setTimeout(() => {
      groupCartItemsByPair();
    }, 100);
  });
}

// Run grouping when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  runGroupingWithDelay();
});

// Listen for cart update events
document.addEventListener('cart:update', function() {
  runGroupingWithDelay();
});

// Use MutationObserver to watch for changes in cart drawer
function setupCartDrawerObserver() {
  const cartDrawer = document.querySelector('.cart-drawer__items') || document.querySelector('.cart-drawer');
  if (!cartDrawer) {
    // Retry after a short delay if cart drawer isn't loaded yet
    setTimeout(setupCartDrawerObserver, 500);
    return;
  }

  const observer = new MutationObserver(function(mutations) {
    let shouldRegroup = false;
    mutations.forEach(function(mutation) {
      // Check if cart items were added, removed, or modified
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        const hasCartItems = Array.from(mutation.addedNodes).some(node => {
          if (node.nodeType === 1 && node instanceof Element) {
            return node.classList.contains('cart-item') || node.querySelector('.cart-item') !== null;
          }
          return false;
        });
        if (hasCartItems) {
          shouldRegroup = true;
        }
      }
      // Check if attributes changed (like pair_id)
      if (mutation.type === 'attributes' && mutation.target instanceof Element && mutation.target.classList.contains('cart-item')) {
        shouldRegroup = true;
      }
    });

    if (shouldRegroup) {
      runGroupingWithDelay();
    }
  });

  // Observe changes to the cart drawer
  observer.observe(cartDrawer, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['pair_id', 'class']
  });
}

// Setup observer when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  setupCartDrawerObserver();
});

// Function to add/remove gift box from cart
function addGiftBox() {
  let cart =
    document.querySelector('cart-notification') ||
    document.querySelector('cart-drawer');
  /** @type {HTMLInputElement|null} */
  let checkbox = document.querySelector('input#giftBox');
  
  if (!checkbox) {
    console.error('Gift box checkbox not found');
    return;
  }
  
  let variantId = checkbox.value;
  /** @type {HTMLElement|null} */
  let giftBoxLoader = document.querySelector('.giftBoxLoader');
  /** @type {HTMLElement|null} */
  let giftInputLabel = document.querySelector('.giftInput label');
  /** @type {HTMLElement|null} */
  let giftBoxInput = document.querySelector("input[name='giftBox']");
  /** @type {HTMLElement|null} */
  let cartNote = document.querySelector('.cart__note');

  if (giftBoxLoader) {
    giftBoxLoader.style.display = 'flex';
  }
  if (giftInputLabel) {
    giftInputLabel.style.pointerEvents = 'none';
  }
  if (giftBoxInput) {
    giftBoxInput.style.visibility = 'hidden';
  }

  let url = '/cart/add.js';
  let quantity = 1;
  /** @type {Record<string, number>} */
  let updatesObj = {};
  /** @type {any} */
  let data = {
    items: [
      {
        id: variantId,
        quantity: quantity,
        properties: {
          "_giftbox": "true"
        }
      },
    ],
  };

  if (!checkbox.checked) {
    if (cartNote && cartNote.classList.contains('ShowCartNote')) {
      cartNote.classList.remove('ShowCartNote');
    }
    url = '/cart/update.js'; // Set the URL for updating the cart.
    let DataKey = checkbox.getAttribute('data-key');
    if (DataKey) {
      updatesObj[DataKey] = 0;
    }
    data = {
      updates: updatesObj,
    };
  } else {
    if (cartNote) {
      cartNote.classList.add('ShowCartNote');
    }
  }

  let options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  };

  fetch(url, options)
    .then((response) => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then((result) => {
      updateCart();
    })
    .catch((error) => {
      console.error('Error:', error);
    });
}

// Make function available globally
window.addGiftBox = addGiftBox;

// Default function to refresh cart drawer
/** @type {(cartData?: any) => Promise<void>} */
async function updateCart(cartData) {
  try {
    // If cart data is provided, use it; otherwise fetch from server
    let cart = cartData;
    
    if (!cart) {
      const response = await fetch('/cart.js');
      if (!response.ok) {
        throw new Error('Failed to fetch cart');
      }
      cart = await response.json();
    }

    // Dispatch cart:update event to refresh cart components
    const cartUpdateEvent = new CustomEvent('cart:update', {
      bubbles: true,
      detail: {
        resource: cart,
        sourceId: 'cart-drawer-item-pair',
        data: {
          source: 'cart-drawer-item-pair',
          itemCount: cart.item_count || 0
        }
      }
    });
    
    document.dispatchEvent(cartUpdateEvent);

    // Also try to refresh cart-items-component directly if available
    const cartItemsComponents = document.querySelectorAll('cart-items-component');
    if (cartItemsComponents.length > 0 && cartItemsComponents[0]) {
      // Trigger a re-render by fetching the section HTML
      const sectionId = cartItemsComponents[0].getAttribute('data-section-id');
      if (sectionId) {
        try {
          const sectionResponse = await fetch(`/sections/cart-drawer?section_id=${sectionId}`);
          if (sectionResponse.ok) {
            const sectionHTML = await sectionResponse.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(sectionHTML, 'text/html');
            const newCartItems = doc.querySelector('cart-items-component');
            const firstCartComponent = cartItemsComponents[0];
            
            if (newCartItems && firstCartComponent && firstCartComponent.parentElement) {
              // Update the cart items wrapper
              const cartItemsWrapper = firstCartComponent.querySelector('.cart-items__wrapper');
              const newCartItemsWrapper = newCartItems.querySelector('.cart-items__wrapper');
              
              if (cartItemsWrapper && newCartItemsWrapper) {
                cartItemsWrapper.innerHTML = newCartItemsWrapper.innerHTML;
              }
            }
          }
        } catch (error) {
          console.warn('Could not refresh cart section:', error);
        }
      }
    }

    // Re-run grouping after cart update
    runGroupingWithDelay();
  } catch (error) {
    console.error('Error updating cart:', error);
  }
}

// Make function available globally
window.updateCart = updateCart;

// Helper function to check if an item is a gift box item
/** @type {(item: any) => boolean} */
function isGiftBoxItem(item) {
  // Check by _giftbox property
  if (item.properties && item.properties._giftbox === 'true') {
    return true;
  }
  
  // Check by product handle (gift-box or gift-box-lab-coats)
  const handle = item.handle || item.product_handle || '';
  if (handle) {
    const handleLower = handle.toLowerCase();
    if (handleLower.includes('gift-box') || handleLower.includes('giftbox')) {
      return true;
    }
  }
  
  // Check by full title (includes variant, e.g., "Gift Box - Lab coats")
  if (item.title) {
    const title = item.title.toLowerCase();
    if (title.includes('gift box') || title.includes('giftbox')) {
      return true;
    }
  }
  
  // Check by product title
  if (item.product_title) {
    const productTitle = item.product_title.toLowerCase();
    if (productTitle.includes('gift box') || productTitle.includes('giftbox')) {
      return true;
    }
  }
  
  // Check by variant title
  if (item.variant_title) {
    const variantTitle = item.variant_title.toLowerCase();
    if (variantTitle.includes('gift box') || variantTitle.includes('giftbox')) {
      return true;
    }
  }
  
  return false;
}

// Flag to prevent infinite loops when removing gift box items
let isRemovingGiftBox = false;

// Helper functions to disable/enable checkout button
/** @type {() => void} */
function disableCheckoutButton() {
  const checkoutButtons = document.querySelectorAll('#checkout, .cart__checkout-button, button[name="checkout"]');
  checkoutButtons.forEach((button) => {
    if (button instanceof HTMLButtonElement) {
      button.disabled = true;
      button.setAttribute('data-gift-box-disabled', 'true');
    }
  });
  
  // Also prevent form submission
  const cartForms = document.querySelectorAll('#cart-form, form[action="/cart"]');
  cartForms.forEach((form) => {
    if (form instanceof HTMLFormElement) {
      form.setAttribute('data-gift-box-disabled', 'true');
    }
  });
}

/** @type {() => void} */
function enableCheckoutButton() {
  const checkoutButtons = document.querySelectorAll('#checkout, .cart__checkout-button, button[name="checkout"]');
  checkoutButtons.forEach((button) => {
    if (button instanceof HTMLButtonElement && button.hasAttribute('data-gift-box-disabled')) {
      // Only re-enable if cart is not empty
      const cartForm = button.closest('form') || document.getElementById('cart-form');
      if (cartForm) {
        const isEmpty = cartForm.querySelector('.cart-item') === null;
        if (!isEmpty) {
          button.disabled = false;
        }
      } else {
        button.disabled = false;
      }
      button.removeAttribute('data-gift-box-disabled');
    }
  });
  
  // Re-enable form submission
  const cartForms = document.querySelectorAll('#cart-form, form[action="/cart"]');
  cartForms.forEach((form) => {
    if (form instanceof HTMLFormElement) {
      form.removeAttribute('data-gift-box-disabled');
    }
  });
}

// Prevent form submission when gift box is being removed
document.addEventListener('submit', function(event) {
  const form = event.target;
  if (form instanceof HTMLFormElement && 
      (form.id === 'cart-form' || form.action.includes('/cart')) &&
      (isRemovingGiftBox || form.hasAttribute('data-gift-box-disabled'))) {
    event.preventDefault();
    event.stopPropagation();
    return false;
  }
}, true);

// Prevent checkout button clicks when operations are in progress
document.addEventListener('click', function(event) {
  const target = event.target;
  if (target instanceof HTMLElement) {
    const checkoutButton = target.closest('#checkout, .cart__checkout-button, button[name="checkout"]');
    if (checkoutButton instanceof HTMLButtonElement && 
        (isRemovingGiftBox || checkoutButton.hasAttribute('data-gift-box-disabled'))) {
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  }
}, true);

// Function to remove gift box items from cart when conditions are not met
/** @type {(cartData?: any) => Promise<void>} */
async function updatedGiftBox(cartData) {
  // Prevent concurrent executions
  if (isRemovingGiftBox) {
    return;
  }

  try {
    // Use provided cart data or fetch it
    /** @type {any} */
    let cart = cartData;
    if (!cart) {
      const cartResponse = await fetch('/cart.js');
      cart = await cartResponse.json();
    }
    
    // Early exit if no items
    if (!cart.items || cart.items.length === 0 || cart.item_count === 0) {
      return;
    }

    // Quick check: if checkbox exists, conditions might be met - verify first
    const giftBoxCheckbox = document.querySelector('input[data-gift-box-type]');
    
    // Find all gift box items and count non-gift-box items in single pass
    /** @type {string[]} */
    let giftBoxItems = [];
    /** @type {number} */
    let nonGiftBoxItemCount = 0;
    
    if (cart.items && Array.isArray(cart.items)) {
      for (const item of cart.items) {
        const isGiftBox = isGiftBoxItem(item);
        
        if (isGiftBox && item.key) {
          giftBoxItems.push(item.key);
        } else {
          // Count non-gift-box items (excluding gift box and custom embroidery)
          if (item.product_title && !item.product_title.toLowerCase().includes('custom embroidery')) {
            nonGiftBoxItemCount += item.quantity || 1;
          }
        }
      }
    }
    
    // Early exit if no gift box items found
    if (giftBoxItems.length === 0) {
      return;
    }
    
    // Determine if gift box should be removed:
    // 1. Checkbox doesn't exist (conditions not met)
    // 2. Cart only has gift box items (no other products)
    // 3. Cart is effectively empty (only gift box and custom embroidery)
    const shouldRemoveGiftBox = !giftBoxCheckbox || nonGiftBoxItemCount === 0;
    
    if (shouldRemoveGiftBox) {
      isRemovingGiftBox = true;
      
      // Disable checkout button before starting removal
      disableCheckoutButton();
      
      /** @type {Record<string, number>} */
      const updates = {};
      giftBoxItems.forEach((key) => {
        updates[key] = 0;
      });

      try {
        // Remove gift box items immediately
        const updateResponse = await fetch('/cart/update.js', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ updates }),
        });

        if (updateResponse.ok) {
          // Refresh cart immediately without delay
          updateCart();
          // Reset flag and re-enable checkout after cart update completes
          setTimeout(() => {
            isRemovingGiftBox = false;
            enableCheckoutButton();
          }, 300);
        } else {
          isRemovingGiftBox = false;
          enableCheckoutButton();
        }
      } catch (error) {
        isRemovingGiftBox = false;
        enableCheckoutButton();
        throw error;
      }
    }
  } catch (error) {
    console.error('Error checking cart for gift box items:', error);
    isRemovingGiftBox = false;
    enableCheckoutButton();
  }
}

// Make function available globally
window.updatedGiftBox = updatedGiftBox;

// Run updatedGiftBox on cart update events with minimal delay
/** @type {ReturnType<typeof setTimeout> | undefined} */
let giftBoxUpdateTimeout;
document.addEventListener('cart:update', function(event) {
  // Debounce to avoid multiple rapid calls, but use shorter delay
  if (giftBoxUpdateTimeout) {
    clearTimeout(giftBoxUpdateTimeout);
  }
  // Use cart data from event if available to avoid extra fetch
  /** @type {any} */
  const customEvent = event;
  const cartData = customEvent.detail?.resource || customEvent.detail?.data?.resource || null;
  giftBoxUpdateTimeout = setTimeout(() => {
    updatedGiftBox(cartData);
  }, 50);
});

// Run updatedGiftBox when DOM is loaded with minimal delay
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(() => {
    updatedGiftBox();
  }, 100);
});