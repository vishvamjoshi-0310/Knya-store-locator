/**
 * Combo Product Price Updater
 * Dynamically updates the price when variants are selected in separate product pickers (top/bottom)
 */

(function() {
  'use strict';

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeComboProductPriceUpdater);
  } else {
    initializeComboProductPriceUpdater();
  }

  function initializeComboProductPriceUpdater() {
    const comboProductSectionElement = document.querySelector('.separate-product-picker')?.closest('.shopify-section');
    if (!comboProductSectionElement) return;

    const productPriceElement = comboProductSectionElement.querySelector('product-price');
    const productPriceContainerElement = productPriceElement?.querySelector('[ref="priceContainer"]');
    if (!productPriceContainerElement) return;

    const topProductPickerFormElement = comboProductSectionElement.querySelector('form[data-picker-form="top"]');
    const bottomProductPickerFormElement = comboProductSectionElement.querySelector('form[data-picker-form="bottom"]');
    if (!topProductPickerFormElement && !bottomProductPickerFormElement) return;

    // Parse variant data from JSON scripts
    const topProductVariantsDataArray = parseVariantsDataFromScriptElement(topProductPickerFormElement, 'top');
    const bottomProductVariantsDataArray = parseVariantsDataFromScriptElement(bottomProductPickerFormElement, 'bottom');

    // Calculate initial minimum price from first available variants
    const initialMinimumPriceInCents = calculateInitialMinimumPriceFromVariants(topProductVariantsDataArray, bottomProductVariantsDataArray);

    // Get variant ID input elements
    const topProductVariantIdInputElement = topProductPickerFormElement?.querySelector('#top_product_variant_id');
    const bottomProductVariantIdInputElement = bottomProductPickerFormElement?.querySelector('#bottom_product_variant_id');

    /** @type {string | null} */
    let currentTopProductVariantId = null;
    /** @type {string | null} */
    let currentBottomProductVariantId = null;

    /**
     * @param {Array<{id: number, price: number, compare_at_price?: number}> | null} variantsArray
     * @param {string | number | null} variantIdToFind
     * @returns {{id: number, price: number, compare_at_price?: number} | null}
     */
    function findVariantByIdFromVariantsArray(variantsArray, variantIdToFind) {
      if (!variantsArray || !variantIdToFind) return null;
      return variantsArray.find(variant => variant.id && variant.id.toString() === variantIdToFind.toString()) || null;
    }

    /**
     * @param {number} priceInCents
     * @returns {string}
     */
    function formatPriceInCentsToCurrencyString(priceInCents) {
      if (typeof priceInCents !== 'number' || isNaN(priceInCents)) return '';
      const priceAmountRounded = Math.round(priceInCents / 100);
      const priceAmountFormattedWithCommas = priceAmountRounded.toLocaleString('en-IN');
      const currencySymbolString = getCurrencySymbolFromPage();
      return `${currencySymbolString} ${priceAmountFormattedWithCommas}`;
    }

    function getCurrencySymbolFromPage() {
      const currencyDataAttributeElement = document.querySelector('[data-currency]');
      const currencyCodeString = currencyDataAttributeElement?.getAttribute('data-currency') || '';
      /** @type {Record<string, string>} */
      const currencySymbolMap = { USD: '$', EUR: '€', GBP: '£', INR: '₹' };
      return currencySymbolMap[currencyCodeString] || (currencyCodeString ? `${currencyCodeString} ` : '₹');
    }

    function calculateCombinedProductPrice() {
      let totalPriceInCents = 0;
      let totalCompareAtPriceInCents = 0;
      let hasCompareAtPriceFlag = false;

      /**
       * @param {string | null} variantId
       * @param {Array<{id: number, price: number, compare_at_price?: number}> | null} variantsArray
       */
      const processVariantPrice = (variantId, variantsArray) => {
        if (!variantId || !variantsArray) return;
        const variantObject = findVariantByIdFromVariantsArray(variantsArray, variantId);
        if (!variantObject) return;
        const variantPriceInCents = variantObject.price || 0;
        totalPriceInCents += variantPriceInCents;
        const variantCompareAtPriceInCents = variantObject.compare_at_price || 0;
        if (variantCompareAtPriceInCents > variantPriceInCents) {
          totalCompareAtPriceInCents += variantCompareAtPriceInCents;
          hasCompareAtPriceFlag = true;
        } else {
          totalCompareAtPriceInCents += variantPriceInCents;
        }
      };

      processVariantPrice(currentTopProductVariantId, topProductVariantsDataArray);
      processVariantPrice(currentBottomProductVariantId, bottomProductVariantsDataArray);

      const finalPriceInCents = Math.max(totalPriceInCents, initialMinimumPriceInCents);
      const finalCompareAtPriceInCents = Math.max(totalCompareAtPriceInCents, initialMinimumPriceInCents);

      return {
        price: finalPriceInCents,
        compareAtPrice: finalCompareAtPriceInCents,
        hasComparePrice: hasCompareAtPriceFlag && finalCompareAtPriceInCents > finalPriceInCents
      };
    }

    function updateProductPriceDisplay() {
      const calculatedPriceDataObject = calculateCombinedProductPrice();
      if (calculatedPriceDataObject.price === 0) return;

      const existingPriceSpanElement = productPriceContainerElement.querySelector('.price');
      const existingComparePriceGroupElement = productPriceContainerElement.querySelector('span[role="group"]');
      const existingDiscountPercentageSpanElement = productPriceContainerElement.querySelector('.discount-percentage');

      const formattedPriceString = formatPriceInCentsToCurrencyString(calculatedPriceDataObject.price);
      const formattedComparePriceString = calculatedPriceDataObject.hasComparePrice 
        ? formatPriceInCentsToCurrencyString(calculatedPriceDataObject.compareAtPrice) 
        : null;

      if (!productPriceContainerElement.style.transition) {
        productPriceContainerElement.style.transition = 'opacity 0.2s ease-in-out';
      }
      productPriceContainerElement.style.opacity = '0.5';

      setTimeout(() => {
        if (existingPriceSpanElement) {
          existingPriceSpanElement.textContent = formattedPriceString;
        } else {
          const newPriceSpanElement = document.createElement('span');
          newPriceSpanElement.className = 'price';
          newPriceSpanElement.textContent = formattedPriceString;
          productPriceContainerElement.appendChild(newPriceSpanElement);
        }

        if (calculatedPriceDataObject.hasComparePrice && formattedComparePriceString) {
          if (existingComparePriceGroupElement) {
            const comparePriceSpanInGroup = existingComparePriceGroupElement.querySelector('.compare-at-price');
            if (comparePriceSpanInGroup) comparePriceSpanInGroup.textContent = formattedComparePriceString;
            existingComparePriceGroupElement.style.display = '';
          } else {
            const newComparePriceGroupElement = document.createElement('span');
            newComparePriceGroupElement.setAttribute('role', 'group');
            const hiddenLabelElement = document.createElement('span');
            hiddenLabelElement.className = 'visually-hidden';
            hiddenLabelElement.textContent = 'Regular price ';
            const newComparePriceSpanElement = document.createElement('span');
            newComparePriceSpanElement.className = 'compare-at-price';
            newComparePriceSpanElement.textContent = formattedComparePriceString;
            newComparePriceGroupElement.appendChild(hiddenLabelElement);
            newComparePriceGroupElement.appendChild(newComparePriceSpanElement);
            const currentPriceSpanElement = productPriceContainerElement.querySelector('.price');
            if (currentPriceSpanElement) {
              productPriceContainerElement.insertBefore(newComparePriceGroupElement, currentPriceSpanElement);
            } else {
              productPriceContainerElement.appendChild(newComparePriceGroupElement);
            }
          }

          const discountPercentageValue = Math.round(
            ((calculatedPriceDataObject.compareAtPrice - calculatedPriceDataObject.price) / calculatedPriceDataObject.compareAtPrice) * 100
          );
          if (discountPercentageValue > 0) {
            if (existingDiscountPercentageSpanElement) {
              existingDiscountPercentageSpanElement.textContent = `SAVE ${discountPercentageValue}%`;
            } else {
              const newDiscountSpanElement = document.createElement('span');
              newDiscountSpanElement.className = 'discount-percentage';
              newDiscountSpanElement.textContent = `SAVE ${discountPercentageValue}%`;
              productPriceContainerElement.appendChild(newDiscountSpanElement);
            }
          } else if (existingDiscountPercentageSpanElement) {
            existingDiscountPercentageSpanElement.remove();
          }
        } else {
          if (existingComparePriceGroupElement) existingComparePriceGroupElement.style.display = 'none';
          if (existingDiscountPercentageSpanElement) existingDiscountPercentageSpanElement.remove();
        }

        productPriceContainerElement.style.opacity = '1';
      }, 100);
    }

    /**
     * @param {string} pickerTypeString
     * @param {string | null} variantIdString
     */
    function handleVariantIdChange(pickerTypeString, variantIdString) {
      if (pickerTypeString === 'top') {
        currentTopProductVariantId = variantIdString || null;
      } else if (pickerTypeString === 'bottom') {
        currentBottomProductVariantId = variantIdString || null;
      }
      if (currentTopProductVariantId || currentBottomProductVariantId) {
        updateProductPriceDisplay();
      }
    }

    function setupVariantIdChangeListeners() {
      const checkAndHandleVariantIdChanges = () => {
        if (topProductVariantIdInputElement) {
          const newTopVariantIdValue = /** @type {HTMLInputElement} */ (topProductVariantIdInputElement).value;
          if (newTopVariantIdValue !== currentTopProductVariantId && newTopVariantIdValue) {
            handleVariantIdChange('top', newTopVariantIdValue);
          }
        }
        if (bottomProductVariantIdInputElement) {
          const newBottomVariantIdValue = /** @type {HTMLInputElement} */ (bottomProductVariantIdInputElement).value;
          if (newBottomVariantIdValue !== currentBottomProductVariantId && newBottomVariantIdValue) {
            handleVariantIdChange('bottom', newBottomVariantIdValue);
          }
        }
      };

      [topProductVariantIdInputElement, bottomProductVariantIdInputElement].forEach((variantIdInputElement, index) => {
        if (!variantIdInputElement) return;
        const pickerTypeString = index === 0 ? 'top' : 'bottom';
        variantIdInputElement.addEventListener('input', () => {
          const variantIdValue = /** @type {HTMLInputElement} */ (variantIdInputElement).value;
          handleVariantIdChange(pickerTypeString, variantIdValue);
        });
        new MutationObserver(checkAndHandleVariantIdChanges).observe(variantIdInputElement, {
          attributes: true,
          attributeFilter: ['value']
        });
      });

      setInterval(checkAndHandleVariantIdChanges, 200);
    }

    function setupFormChangeEventListeners() {
      [topProductPickerFormElement, bottomProductPickerFormElement].forEach((pickerFormElement) => {
        if (!pickerFormElement) return;
        /** @type {string | null} */
        const pickerTypeString = pickerFormElement.getAttribute('data-picker-form');
        const variantIdInputElement = pickerFormElement.querySelector(`#${pickerTypeString}_product_variant_id`);
        if (!variantIdInputElement) return;
        if (!pickerTypeString) return;
        pickerFormElement.addEventListener('change', (changeEvent) => {
          if (changeEvent.target instanceof HTMLInputElement || changeEvent.target instanceof HTMLSelectElement) {
            setTimeout(() => {
              const variantIdValue = /** @type {HTMLInputElement} */ (variantIdInputElement).value;
              if (variantIdValue) handleVariantIdChange(pickerTypeString, variantIdValue);
            }, 150);
          }
        });
      });
    }

    setupVariantIdChangeListeners();
    setupFormChangeEventListeners();
  }

  function parseVariantsDataFromScriptElement(pickerFormElement, pickerTypeString) {
    if (!pickerFormElement) return null;
    const variantsScriptElement = pickerFormElement.querySelector(`script[data-picker-variants="${pickerTypeString}"]`);
    if (!variantsScriptElement) return null;
    try {
      return JSON.parse(variantsScriptElement.textContent || '[]');
    } catch (parseError) {
      console.warn(`Could not parse ${pickerTypeString} variants data:`, parseError);
      return null;
    }
  }

  /**
   * @param {Array<{id: number, price: number, compare_at_price?: number, available?: boolean}> | null} topVariantsArray
   * @param {Array<{id: number, price: number, compare_at_price?: number, available?: boolean}> | null} bottomVariantsArray
   * @returns {number}
   */
  function calculateInitialMinimumPriceFromVariants(topVariantsArray, bottomVariantsArray) {
    let initialPriceInCents = 0;
    /**
     * @param {Array<{id: number, price: number, compare_at_price?: number, available?: boolean}> | null} variantsArray
     * @returns {number}
     */
    const getFirstAvailableVariantPrice = (variantsArray) => {
      if (!variantsArray || variantsArray.length === 0) return 0;
      const firstAvailableVariant = variantsArray.find(variant => variant.available !== false) || variantsArray[0];
      return firstAvailableVariant?.price || 0;
    };
    initialPriceInCents += getFirstAvailableVariantPrice(topVariantsArray);
    initialPriceInCents += getFirstAvailableVariantPrice(bottomVariantsArray);
    return initialPriceInCents;
  }
})();
