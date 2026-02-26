import { sectionRenderer } from '@theme/section-renderer';
import { Component } from '@theme/component';
import { FilterUpdateEvent, ThemeEvents } from '@theme/events';
import { debounce, formatMoney, startViewTransition } from '@theme/utilities';

/**
 * Search query parameter.
 * @type {string}
 */
const SEARCH_QUERY = 'q';

/**
 * Handles the main facets form functionality
 *
 * @typedef {Object} FacetsFormRefs
 * @property {HTMLFormElement} facetsForm - The main facets form element
 * @property {HTMLElement | undefined} facetStatus - The facet status element
 *
 * @extends {Component<FacetsFormRefs>}
 */
class FacetsFormComponent extends Component {
  requiredRefs = ['facetsForm'];

  /**
   * Creates URL parameters from form data
   * @param {FormData} [formData] - Optional form data to use instead of the main form
   * @returns {URLSearchParams} The processed URL parameters
   */
  createURLParameters(formData = new FormData(this.refs.facetsForm)) {
    let newParameters = new URLSearchParams(/** @type any */ (formData));

    // Check if form data contains any filter parameters
    const hasFilterParams = Array.from(newParameters.keys()).some(key => key.startsWith('filter.'));
    
    // Check if the form actually contains filter inputs
    // This helps distinguish between:
    // 1. Forms without filter inputs (like mobile sort popup) - should preserve filters
    // 2. Forms with filter inputs that are all unchecked - should NOT preserve filters
    const formHasFilterInputs = this.refs.facetsForm.querySelectorAll('input[name^="filter."]').length > 0;
    
    // If form data doesn't contain filter parameters, preserve existing ones from URL
    // This is important for mobile sort popup which doesn't contain filter inputs
    // BUT: if the form has filter inputs and they're all unchecked, don't preserve filters
    if (!hasFilterParams && !formHasFilterInputs) {
      const currentUrl = new URL(window.location.href);
      const currentParams = new URLSearchParams(currentUrl.search);
      
      // Preserve all filter parameters from current URL
      for (const [key, value] of currentParams.entries()) {
        if (key.startsWith('filter.')) {
          newParameters.set(key, value);
        }
      }
    }

    if (newParameters.get('filter.v.price.gte') === '') newParameters.delete('filter.v.price.gte');
    if (newParameters.get('filter.v.price.lte') === '') newParameters.delete('filter.v.price.lte');

    newParameters.delete('page');

    const searchQuery = this.#getSearchQuery();
    if (searchQuery) newParameters.set(SEARCH_QUERY, searchQuery);

    return newParameters;
  }

  /**
   * Gets the search query parameter from the current URL
   * @returns {string} The search query
   */
  #getSearchQuery() {
    const url = new URL(window.location.href);
    return url.searchParams.get(SEARCH_QUERY) ?? '';
  }

  get sectionId() {
    const id = this.getAttribute('section-id');
    if (!id) throw new Error('Section ID is required');
    return id;
  }

  /**
   * Updates the URL hash with current filter parameters
   */
  #updateURLHash() {
    const url = new URL(window.location.href);
    const urlParameters = this.createURLParameters();

    url.search = '';
    for (const [param, value] of urlParameters.entries()) {
      url.searchParams.append(param, value);
    }

    history.pushState({ urlParameters: urlParameters.toString() }, '', url.toString());
  }

  /**
   * Updates filters and renders the section
   */
  updateFilters = () => {
    // Store the active mobile filter label before updating
    this.#storeActiveMobileFilterLabel();
    
    // Store the filters drawer open state for quick-filter collections
    this.#storeFiltersDrawerState();
    
    this.#updateURLHash();
    this.dispatchEvent(new FilterUpdateEvent(this.createURLParameters()));
    this.#updateSection();
  };

  /**
   * Stores the filters drawer open state before section update
   */
  #storeFiltersDrawerState() {
    const filtersDrawer = document.querySelector('#filters-drawer');
    if (filtersDrawer) {
      const dialog = filtersDrawer.querySelector('dialog');
      if (dialog && dialog.hasAttribute('open')) {
        sessionStorage.setItem('filtersDrawerShouldStayOpen', 'true');
        
        // Check if this is a three-layer quick filter collection with category filter
        const productGridContainer = document.getElementById('ProductGridContainer');
        const isQuickFilter = productGridContainer && productGridContainer.getAttribute('quick-filter') === 'true';
        const lastInput = (/** @type {any} */ (window).lastChangedInputElement);
        
        // If it's a quick filter and the last changed input is a category filter, ensure drawer stays open
        if (isQuickFilter && lastInput instanceof HTMLInputElement) {
          const filterCategory = lastInput.name.split('.').pop();
          if (filterCategory === 'product_type') {
            // Force the drawer to stay open for category filters in quick filter collections
            sessionStorage.setItem('filtersDrawerShouldStayOpen', 'true');
            sessionStorage.setItem('forceKeepDrawerOpen', 'true');
          }
        }
        
        // Also store the active filter label/panel state
        const activeLabel = document.querySelector('.facets__filter-label-mobile--active');
        if (activeLabel) {
          const filterId = activeLabel.getAttribute('data-filter-id');
          const filterIndex = activeLabel.getAttribute('data-filter-index');
          if (filterId) {
            sessionStorage.setItem('filtersDrawerActivePanel', filterId);
          }
          if (filterIndex !== null) {
            sessionStorage.setItem('filtersDrawerActivePanelIndex', filterIndex);
          }
        }
      } else {
        // Only remove the flag if forceKeepDrawerOpen is not set
        if (sessionStorage.getItem('forceKeepDrawerOpen') !== 'true') {
          sessionStorage.removeItem('filtersDrawerShouldStayOpen');
        }
        sessionStorage.removeItem('filtersDrawerActivePanel');
        sessionStorage.removeItem('filtersDrawerActivePanelIndex');
      }
    }
  }

  /**
   * Restores the filters drawer open state after section update
   */
  #restoreFiltersDrawerState() {
    const shouldStayOpen = sessionStorage.getItem('filtersDrawerShouldStayOpen') === 'true';
    const forceKeepOpen = sessionStorage.getItem('forceKeepDrawerOpen') === 'true';
    
    if (shouldStayOpen || forceKeepOpen) {
      // Use requestAnimationFrame to ensure DOM is fully updated
      requestAnimationFrame(() => {
        setTimeout(() => {
          const filtersDrawer = document.querySelector('#filters-drawer');
          if (filtersDrawer) {
            const dialog = filtersDrawer.querySelector('dialog');
            
            // If dialog is not open, restore it
            if (dialog && !dialog.hasAttribute('open')) {
              // The filters-drawer is the dialog-component itself
              if (filtersDrawer.tagName === 'DIALOG-COMPONENT' && 'showDialog' in filtersDrawer && typeof filtersDrawer.showDialog === 'function') {
                filtersDrawer.showDialog();
              } else {
                // Fallback: set the open attribute and show modal
                dialog.setAttribute('open', '');
                dialog.showModal();
              }
            }
            
            // If forceKeepOpen is set, ensure dialog stays open (double-check after a short delay)
            if (forceKeepOpen) {
              setTimeout(() => {
                const filtersDrawerCheck = document.querySelector('#filters-drawer');
                if (filtersDrawerCheck) {
                  const dialogCheck = filtersDrawerCheck.querySelector('dialog');
                  if (dialogCheck && !dialogCheck.hasAttribute('open')) {
                    if (filtersDrawerCheck.tagName === 'DIALOG-COMPONENT' && 'showDialog' in filtersDrawerCheck && typeof filtersDrawerCheck.showDialog === 'function') {
                      filtersDrawerCheck.showDialog();
                    } else if (dialogCheck) {
                      dialogCheck.setAttribute('open', '');
                      dialogCheck.showModal();
                    }
                  }
                }
              }, 50);
            }
            
            // Restore active filter panel if it was stored
            const storedPanelId = sessionStorage.getItem('filtersDrawerActivePanel');
            const storedPanelIndex = sessionStorage.getItem('filtersDrawerActivePanelIndex');
            
            if (storedPanelId || storedPanelIndex !== null) {
              setTimeout(() => {
                // Helper function to check if a label is the hidden gender filter
                const isHiddenGenderFilter = (/** @type {HTMLElement | null} */ label) => {
                  if (!label) return false;
                  const ariaLabel = label.getAttribute('aria-label');
                  return ariaLabel && ariaLabel.toLowerCase() === 'gender' && 
                         window.getComputedStyle(label).display === 'none';
                };

                // Helper function to get the first visible filter label
                const getFirstVisibleFilterLabel = () => {
                  const labels = document.querySelectorAll('.facets__filter-label-mobile');
                  for (let i = 0; i < labels.length; i++) {
                    const label = labels[i];
                    if (!label) continue;
                    const computedStyle = window.getComputedStyle(label);
                    if (computedStyle.display !== 'none' && !isHiddenGenderFilter(/** @type {HTMLElement} */ (label))) {
                      return label;
                    }
                  }
                  return labels[0] || null; // Fallback to first label if all are hidden
                };

                let activeLabel = null;
                if (storedPanelId) {
                  activeLabel = document.querySelector(`.facets__filter-label-mobile[data-filter-id="${storedPanelId}"]`);
                }
                
                if (!activeLabel && storedPanelIndex !== null) {
                  const labels = document.querySelectorAll('.facets__filter-label-mobile');
                  const index = parseInt(storedPanelIndex, 10);
                  if (labels[index]) {
                    activeLabel = labels[index];
                  }
                }
                
                // Check if the restored label is the hidden gender filter
                if (activeLabel && isHiddenGenderFilter(/** @type {HTMLElement} */ (activeLabel))) {
                  // If it's the hidden gender filter, use the first visible filter instead
                  const firstVisible = getFirstVisibleFilterLabel();
                  if (firstVisible) {
                    activeLabel = firstVisible;
                  }
                }
                
                if (activeLabel) {
                  // Remove active class from all labels
                  document.querySelectorAll('.facets__filter-label-mobile').forEach((label) => {
                    label.classList.remove('facets__filter-label-mobile--active');
                  });
                  
                  // Add active class to the stored label
                  activeLabel.classList.add('facets__filter-label-mobile--active');
                  
                  // Get the corresponding panel and activate it
                  const filterId = activeLabel.getAttribute('data-filter-id');
                  if (filterId) {
                    // Hide all panels
                    document.querySelectorAll('.facets__filter-values-panel').forEach((panel) => {
                      panel.classList.remove('facets__filter-values-panel--active');
                    });
                    
                    // Show the active panel
                    const targetPanel = document.getElementById(filterId);
                    if (targetPanel) {
                      targetPanel.classList.add('facets__filter-values-panel--active');
                    }
                  }
                }
                
                sessionStorage.removeItem('filtersDrawerActivePanel');
                sessionStorage.removeItem('filtersDrawerActivePanelIndex');
              }, 100);
            }
            
            // Re-initialize filter label click handlers after drawer is restored
            // Dispatch a custom event to trigger re-initialization
            const reinitEvent = new CustomEvent('filters-drawer-restored', {
              bubbles: true,
              cancelable: true
            });
            filtersDrawer.dispatchEvent(reinitEvent);
          }
          
          // Remove the flags after attempting to restore, but only if not forcing to keep open
          if (!forceKeepOpen) {
            sessionStorage.removeItem('filtersDrawerShouldStayOpen');
          }
          // Keep forceKeepDrawerOpen until explicitly cleared (will be cleared after all updates complete)
        }, 150);
      });
    } else {
      // Clean up if flag exists but shouldn't stay open
      if (!forceKeepOpen) {
        sessionStorage.removeItem('filtersDrawerShouldStayOpen');
      }
      sessionStorage.removeItem('filtersDrawerActivePanel');
      sessionStorage.removeItem('filtersDrawerActivePanelIndex');
    }
  }

  /**
   * Stores the active mobile filter label before section update
   */
  #storeActiveMobileFilterLabel() {
    // First, try to get the active label from the currently active filter label
    let activeLabel = document.querySelector('.facets__filter-label-mobile--active');
    
    // If no active label, try to determine it from the last changed input element
    if (!activeLabel) {
      const lastInput = (/** @type {any} */ (window).lastChangedInputElement);
      if (lastInput instanceof HTMLInputElement) {
        const filterLabel = lastInput.getAttribute('filter-label');
        if (filterLabel) {
          // Find the filter label button that matches this filter
          const labels = document.querySelectorAll('.facets__filter-label-mobile');
          labels.forEach((label) => {
            const ariaLabel = label.getAttribute('aria-label');
            if (ariaLabel && ariaLabel.toLowerCase() === filterLabel.toLowerCase()) {
              activeLabel = label;
            }
          });
        }
      }
    }
    
    if (activeLabel) {
      const filterId = activeLabel.getAttribute('data-filter-id');
      const filterIndex = activeLabel.getAttribute('data-filter-index');
      if (filterId) {
        sessionStorage.setItem('activeMobileFilterLabel', filterId);
      }
      if (filterIndex !== null) {
        sessionStorage.setItem('activeMobileFilterIndex', filterIndex);
      }
    }
  }

  /**
   * Updates the section
   */
  #updateSection() {
    const viewTransition = !this.closest('dialog');

    if (viewTransition) {
      startViewTransition(() => {
        return sectionRenderer.renderSection(this.sectionId).then(() => {
          this.#restoreActiveMobileFilterLabel();
          this.#restoreFiltersDrawerState();
        });
      }, ['product-grid']);
    } else {
      sectionRenderer.renderSection(this.sectionId).then(() => {
        this.#restoreActiveMobileFilterLabel();
        this.#restoreFiltersDrawerState();
      });
    }
  }

  /**
   * Restores the active mobile filter label after section update
   */
  #restoreActiveMobileFilterLabel() {
    // Use requestAnimationFrame to ensure DOM is fully updated
    requestAnimationFrame(() => {
      // Also add a small delay to ensure the drawer content is fully rendered
      setTimeout(() => {
        const storedFilterId = sessionStorage.getItem('activeMobileFilterLabel');
        const storedFilterIndex = sessionStorage.getItem('activeMobileFilterIndex');
        
        if (storedFilterId || storedFilterIndex !== null) {
          // Check if the drawer is open (if it exists)
          const drawer = document.querySelector('#filters-drawer');
          const dialog = drawer?.querySelector('dialog');
          const isDrawerOpen = !drawer || (dialog && dialog.hasAttribute('open'));
          
          // Only restore if drawer is open or doesn't exist (desktop view)
          if (isDrawerOpen) {
            // Try to find the label by filter ID first
            let activeLabel = null;
            if (storedFilterId) {
              activeLabel = document.querySelector(`.facets__filter-label-mobile[data-filter-id="${storedFilterId}"]`);
            }
            
            // Fallback to filter index if filter ID doesn't work
            if (!activeLabel && storedFilterIndex !== null) {
              const labels = document.querySelectorAll('.facets__filter-label-mobile');
              const index = parseInt(storedFilterIndex, 10);
              if (labels[index]) {
                activeLabel = labels[index];
              }
            }
            
            if (activeLabel) {
              // Remove active class from all labels
              document.querySelectorAll('.facets__filter-label-mobile').forEach((label) => {
                label.classList.remove('facets__filter-label-mobile--active');
              });
              
              // Add active class to the stored label
              activeLabel.classList.add('facets__filter-label-mobile--active');
              
              // Get the corresponding panel and activate it
              const filterId = activeLabel.getAttribute('data-filter-id');
              if (filterId) {
                // Hide all panels
                document.querySelectorAll('.facets__filter-values-panel').forEach((panel) => {
                  panel.classList.remove('facets__filter-values-panel--active');
                });
                
                // Show the active panel
                const targetPanel = document.getElementById(filterId);
                if (targetPanel) {
                  targetPanel.classList.add('facets__filter-values-panel--active');
                }
              }
            }
          }
        }
      }, 50);
    });
  }

  /**
   * Updates filters based on a provided URL
   * @param {string} url - The URL to update filters with
   */
  updateFiltersByURL(url) {
    history.pushState('', '', url);
    this.dispatchEvent(new FilterUpdateEvent(this.createURLParameters()));
    this.#updateSection();
  }
}

if (!customElements.get('facets-form-component')) {
  customElements.define('facets-form-component', FacetsFormComponent);
}

/**
 * @typedef {Object} FacetInputsRefs
 * @property {HTMLInputElement[]} facetInputs - The facet input elements
 */

/**
 * Handles individual facet input functionality
 * @extends {Component<FacetInputsRefs>}
 */
class FacetInputsComponent extends Component {
  get sectionId() {
    const id = this.closest('.shopify-section')?.id;
    if (!id) throw new Error('FacetInputs component must be a child of a section');
    return id;
  }

  /**
   * Updates filters and the selected facet summary
   */
  updateFilters() {
    const facetsForm = this.closest('facets-form-component');

    if (!(facetsForm instanceof FacetsFormComponent)) return;

    facetsForm.updateFilters();
    this.#updateSelectedFacetSummary();
  }

  /**
   * Handles keydown events for the facets form
   * @param {KeyboardEvent} event - The keydown event
   */
  handleKeyDown(event) {
    if (!(event.target instanceof HTMLElement)) return;
    const closestInput = event.target.querySelector('input');

    if (!(closestInput instanceof HTMLInputElement)) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      closestInput.checked = !closestInput.checked;
      this.updateFilters();
    }
  }

  /**
   * Handles mouseover events on facet labels
   * @param {MouseEvent} event - The mouseover event
   */
  prefetchPage = debounce((event) => {
    if (!(event.target instanceof HTMLElement)) return;

    const form = this.closest('form');
    if (!form) return;

    const formData = new FormData(form);
    const inputElement = event.target.querySelector('input');

    if (!(inputElement instanceof HTMLInputElement)) return;

    if (!inputElement.checked) formData.append(inputElement.name, inputElement.value);

    const facetsForm = this.closest('facets-form-component');
    if (!(facetsForm instanceof FacetsFormComponent)) return;

    const urlParameters = facetsForm.createURLParameters(formData);

    const url = new URL(window.location.pathname, window.location.origin);

    for (const [key, value] of urlParameters) url.searchParams.append(key, value);

    if (inputElement.checked) url.searchParams.delete(inputElement.name, inputElement.value);

    sectionRenderer.getSectionHTML(this.sectionId, true, url);
  }, 200);

  cancelPrefetchPage = () => this.prefetchPage.cancel();

  /**
   * Updates the selected facet summary
   */
  #updateSelectedFacetSummary() {
    if (!this.refs.facetInputs) return;

    const checkedInputElements = this.refs.facetInputs.filter((input) => input.checked);
    const details = this.closest('details');
    const statusComponent = details?.querySelector('facet-status-component');

    if (!(statusComponent instanceof FacetStatusComponent)) return;

    statusComponent.updateListSummary(checkedInputElements);
  }
}

if (!customElements.get('facet-inputs-component')) {
  customElements.define('facet-inputs-component', FacetInputsComponent);
}

/**
 * @typedef {Object} PriceFacetRefs
 * @property {HTMLInputElement} minInput - The minimum price input
 * @property {HTMLInputElement} maxInput - The maximum price input
 */

/**
 * Handles price facet functionality
 * @extends {Component<PriceFacetRefs>}
 */
class PriceFacetComponent extends Component {
  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('keydown', this.#onKeyDown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this.#onKeyDown);
  }

  /**
   * Handles keydown events to restrict input to valid characters
   * @param {KeyboardEvent} event - The keydown event
   */
  #onKeyDown = (event) => {
    if (event.metaKey) return;

    const pattern = /[0-9]|\.|,|'| |Tab|Backspace|Enter|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Delete|Escape/;
    if (!event.key.match(pattern)) event.preventDefault();
  };

  /**
   * Updates price filter and results
   */
  updatePriceFilterAndResults() {
    const { minInput, maxInput } = this.refs;

    this.#adjustToValidValues(minInput);
    this.#adjustToValidValues(maxInput);

    const facetsForm = this.closest('facets-form-component');
    if (!(facetsForm instanceof FacetsFormComponent)) return;

    facetsForm.updateFilters();
    this.#setMinAndMaxValues();
    this.#updateSummary();
  }

  /**
   * Adjusts input values to be within valid range
   * @param {HTMLInputElement} input - The input element to adjust
   */
  #adjustToValidValues(input) {
    if (input.value.trim() === '') return;

    const value = Number(input.value);
    const min = Number(formatMoney(input.getAttribute('data-min') ?? ''));
    const max = Number(formatMoney(input.getAttribute('data-max') ?? ''));

    if (value < min) input.value = min.toString();
    if (value > max) input.value = max.toString();
  }

  /**
   * Sets min and max values for the inputs
   */
  #setMinAndMaxValues() {
    const { minInput, maxInput } = this.refs;

    if (maxInput.value) minInput.setAttribute('data-max', maxInput.value);
    if (minInput.value) maxInput.setAttribute('data-min', minInput.value);
    if (minInput.value === '') maxInput.setAttribute('data-min', '0');
    if (maxInput.value === '') minInput.setAttribute('data-max', maxInput.getAttribute('data-max') ?? '');
  }

  /**
   * Updates the price summary
   */
  #updateSummary() {
    const { minInput, maxInput } = this.refs;
    const details = this.closest('details');
    const statusComponent = details?.querySelector('facet-status-component');

    if (!(statusComponent instanceof FacetStatusComponent)) return;

    statusComponent?.updatePriceSummary(minInput, maxInput);
  }
}

if (!customElements.get('price-facet-component')) {
  customElements.define('price-facet-component', PriceFacetComponent);
}

/**
 * Handles clearing of facet filters
 * @extends {Component}
 */
class FacetClearComponent extends Component {
  requiredRefs = ['clearButton'];

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('keyup', this.#handleKeyUp);
    document.addEventListener(ThemeEvents.FilterUpdate, this.#handleFilterUpdate);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener(ThemeEvents.FilterUpdate, this.#handleFilterUpdate);
  }

  /**
   * Clears the filter
   * @param {Event} event - The click event
   */
  clearFilter(event) {
    if (!(event.target instanceof HTMLElement)) return;

    if (event instanceof KeyboardEvent) {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }
      event.preventDefault();
    }

    const container = event.target.closest('facet-inputs-component, price-facet-component');
    container?.querySelectorAll('[type="checkbox"]:checked, input').forEach((input) => {
      if (input instanceof HTMLInputElement) {
        input.checked = false;
        input.value = '';
      }
    });

    const details = event.target.closest('details');
    const statusComponent = details?.querySelector('facet-status-component');

    if (!(statusComponent instanceof FacetStatusComponent)) return;

    statusComponent.clearSummary();

    const facetsForm = this.closest('facets-form-component');
    if (!(facetsForm instanceof FacetsFormComponent)) return;

    facetsForm.updateFilters();
  }

  /**
   * Handles keyup events
   * @param {KeyboardEvent} event - The keyup event
   */
  #handleKeyUp = (event) => {
    if (event.metaKey) return;
    if (event.key === 'Enter') this.clearFilter(event);
  };

  /**
   * Toggle clear button visibility when filters are applied. Happens before the
   * Section Rendering Request resolves.
   *
   * @param {FilterUpdateEvent} event
   */
  #handleFilterUpdate = (event) => {
    const { clearButton } = this.refs;
    if (clearButton instanceof Element) {
      clearButton.classList.toggle('facets__clear--active', event.shouldShowClearAll());
    }
  };
}

if (!customElements.get('facet-clear-component')) {
  customElements.define('facet-clear-component', FacetClearComponent);
}

/**
 * @typedef {Object} FacetRemoveComponentRefs
 * @property {HTMLInputElement | undefined} clearButton - The button to clear filters
 */

/**
 * Handles removal of individual facet filters
 * @extends {Component<FacetRemoveComponentRefs>}
 */
class FacetRemoveComponent extends Component {
  connectedCallback() {
    super.connectedCallback();
    document.addEventListener(ThemeEvents.FilterUpdate, this.#handleFilterUpdate);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener(ThemeEvents.FilterUpdate, this.#handleFilterUpdate);
  }

  /**
   * Removes the filter
   * @param {Object} data - The data object
   * @param {string} data.form - The form to remove the filter from
   * @param {Event} event - The click event
   */
  removeFilter({ form }, event) {
    if (event instanceof KeyboardEvent) {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }
      event.preventDefault();
    }

    const url = this.dataset.url;
    if (!url) return;

    const facetsForm = form ? document.getElementById(form) : this.closest('facets-form-component');

    if (!(facetsForm instanceof FacetsFormComponent)) return;

    facetsForm.updateFiltersByURL(url);
  }

  /**
   * Toggle clear button visibility when filters are applied. Happens before the
   * Section Rendering Request resolves.
   *
   * @param {FilterUpdateEvent} event
   */
  #handleFilterUpdate = (event) => {
    const { clearButton } = this.refs;
    if (clearButton instanceof Element) {
      clearButton.classList.toggle('active', event.shouldShowClearAll());
    }
  };
}

if (!customElements.get('facet-remove-component')) {
  customElements.define('facet-remove-component', FacetRemoveComponent);
}

/**
 * Handles sorting filter functionality
 *
 * @typedef {Object} SortingFilterRefs
 * @property {HTMLDetailsElement} details - The details element
 * @property {HTMLElement} summary - The summary element
 * @property {HTMLElement} listbox - The listbox element
 *
 * @extends {Component}
 */
class SortingFilterComponent extends Component {
  requiredRefs = ['details', 'summary', 'listbox'];

  /**
   * Handles keyboard navigation in the sorting dropdown
   * @param {KeyboardEvent} event - The keyboard event
   */
  handleKeyDown = (event) => {
    const { listbox } = this.refs;
    if (!(listbox instanceof Element)) return;

    const options = Array.from(listbox.querySelectorAll('[role="option"]'));
    const currentFocused = options.find((option) => option instanceof HTMLElement && option.tabIndex === 0);
    let newFocusIndex = currentFocused ? options.indexOf(currentFocused) : 0;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        newFocusIndex = Math.min(newFocusIndex + 1, options.length - 1);
        this.#moveFocus(options, newFocusIndex);
        break;

      case 'ArrowUp':
        event.preventDefault();
        newFocusIndex = Math.max(newFocusIndex - 1, 0);
        this.#moveFocus(options, newFocusIndex);
        break;

      case 'Enter':
      case ' ':
        if (event.target instanceof Element) {
          const targetOption = event.target.closest('[role="option"]');
          if (targetOption) {
            event.preventDefault();
            this.#selectOption(targetOption);
          }
        }
        break;

      case 'Escape':
        event.preventDefault();
        this.#closeDropdown();
        break;
    }
  };

  /**
   * Handles details toggle event
   */
  handleToggle = () => {
    const { details, summary, listbox } = this.refs;
    if (!(details instanceof HTMLDetailsElement) || !(summary instanceof HTMLElement)) return;

    const isOpen = details.open;
    summary.setAttribute('aria-expanded', isOpen.toString());

    if (isOpen && listbox instanceof Element) {
      // Move focus to selected option when dropdown opens
      const selectedOption = listbox.querySelector('[aria-selected="true"]');
      if (selectedOption instanceof HTMLElement) {
        selectedOption.focus();
      }
    }
  };

  /**
   * Moves focus between options
   * @param {Element[]} options - The option elements
   * @param {number} newIndex - The index of the option to focus
   */
  #moveFocus(options, newIndex) {
    // Remove tabindex from all options
    options.forEach((option) => {
      if (option instanceof HTMLElement) {
        option.tabIndex = -1;
      }
    });

    // Set tabindex and focus on new option
    const targetOption = options[newIndex];
    if (targetOption instanceof HTMLElement) {
      targetOption.tabIndex = 0;
      targetOption.focus();
    }
  }

  /**
   * Selects an option and triggers form submission
   * @param {Element} option - The option element to select
   */
  #selectOption(option) {
    const input = option.querySelector('input[type="radio"]');
    if (input instanceof HTMLInputElement && option instanceof HTMLElement) {
      // Update aria-selected states
      this.querySelectorAll('[role="option"]').forEach((opt) => {
        opt.setAttribute('aria-selected', 'false');
      });
      option.setAttribute('aria-selected', 'true');

      // Trigger click on the input to ensure normal form behavior
      input.click();

      // Close dropdown and return focus (handles tabIndex reset)
      this.#closeDropdown();
    }
  }

  /**
   * Closes the dropdown and returns focus to summary
   */
  #closeDropdown() {
    const { details, summary } = this.refs;
    if (details instanceof HTMLDetailsElement) {
      // Reset focus to match the actual selected option
      const options = this.querySelectorAll('[role="option"]');
      const selectedOption = this.querySelector('[aria-selected="true"]');

      options.forEach((opt) => {
        if (opt instanceof HTMLElement) {
          opt.tabIndex = -1;
        }
      });

      if (selectedOption instanceof HTMLElement) {
        selectedOption.tabIndex = 0;
      }

      details.open = false;
      if (summary instanceof HTMLElement) {
        summary.focus();
      }
    }
  }

  /**
   * Updates filter and sorting
   * @param {Event} event - The change event
   */
  updateFilterAndSorting(event) {
    const facetsForm =
      this.closest('facets-form-component') || this.closest('.shopify-section')?.querySelector('facets-form-component');

    if (!(facetsForm instanceof FacetsFormComponent)) return;
    const isMobile = window.innerWidth < 750;

    const shouldDisable = this.dataset.shouldUseSelectOnMobile === 'true';

    // Because we have a select element on mobile and a bunch of radio buttons on desktop,
    // we need to disable the input during "form-submission" to prevent duplicate entries.
    if (shouldDisable) {
      if (isMobile) {
        const inputs = this.querySelectorAll('input[name="sort_by"]');
        inputs.forEach((input) => {
          if (!(input instanceof HTMLInputElement)) return;
          input.disabled = true;
        });
      } else {
        const selectElement = this.querySelector('select[name="sort_by"]');
        if (!(selectElement instanceof HTMLSelectElement)) return;
        selectElement.disabled = true;
      }
    }

    facetsForm.updateFilters();
    this.updateFacetStatus(event);

    // Re-enable the input after the form-submission
    if (shouldDisable) {
      if (isMobile) {
        const inputs = this.querySelectorAll('input[name="sort_by"]');
        inputs.forEach((input) => {
          if (!(input instanceof HTMLInputElement)) return;
          input.disabled = false;
        });
      } else {
        const selectElement = this.querySelector('select[name="sort_by"]');
        if (!(selectElement instanceof HTMLSelectElement)) return;
        selectElement.disabled = false;
      }
    }

    // Close the details element when a value is selected (only on desktop)
    const { details } = this.refs;
    if (!(details instanceof HTMLDetailsElement)) return;
    // Only close on desktop, not on mobile (mobile uses custom popup)
    if (!isMobile) {
      details.open = false;
    }
  }

  /**
   * Updates the facet status
   * @param {Event} event - The change event
   */
  updateFacetStatus(event) {
    if (!(event.target instanceof HTMLSelectElement)) return;

    const details = this.querySelector('details');
    if (!details) return;

    const facetStatus = details.querySelector('facet-status-component');
    if (!(facetStatus instanceof FacetStatusComponent)) return;

    facetStatus.textContent =
      event.target.value !== details.dataset.defaultSortBy ? event.target.dataset.optionName ?? '' : '';
  }
}

if (!customElements.get('sorting-filter-component')) {
  customElements.define('sorting-filter-component', SortingFilterComponent);
}

/**
 * Handles mobile sort change events from the mobile sort popup
 * Optimized standalone handler for mobile sort popup changes
 * @param {Event} event - The change event
 */
function handleMobileSortChange(event) {
  // Early returns for performance - check most specific conditions first
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  if (target.type !== 'radio' || target.name !== 'sort_by') return;
  
  // Check if this is from the mobile sort popup
  const popup = target.closest('#mobile-sort-popup');
  if (!popup) return;

  // Find facets form component
  const facetsForm = target.closest('facets-form-component');
  if (!(facetsForm instanceof FacetsFormComponent)) return;

  // Update filters (this triggers the section update)
  facetsForm.updateFilters();

  // Close the mobile sort popup efficiently
  const dialogComponent = document.getElementById('mobile-sort-popup');
  if (dialogComponent) {
    // Prefer the component's closeDialog method
    if ('closeDialog' in dialogComponent && typeof dialogComponent.closeDialog === 'function') {
      dialogComponent.closeDialog();
    } else {
      // Fallback: close dialog directly
      const dialog = dialogComponent.querySelector('dialog');
      if (dialog instanceof HTMLDialogElement) {
        dialog.close();
      }
    }
  }
}

// Listen for change events on mobile sort inputs
document.addEventListener('change', handleMobileSortChange);

/**
 * @typedef {Object} FacetStatusRefs
 * @property {HTMLElement} facetStatus - The facet status element
 */

/**
 * Handles facet status display
 * @extends {Component<FacetStatusRefs>}
 */
class FacetStatusComponent extends Component {
  /**
   * Updates the list summary
   * @param {HTMLInputElement[]} checkedInputElements - The checked input elements
   */
  updateListSummary(checkedInputElements) {
    const checkedInputElementsCount = checkedInputElements.length;

    this.getAttribute('facet-type') === 'swatches'
      ? this.#updateSwatchSummary(checkedInputElements, checkedInputElementsCount)
      : this.#updateBubbleSummary(checkedInputElements, checkedInputElementsCount);
  }

  /**
   * Updates the swatch summary
   * @param {HTMLInputElement[]} checkedInputElements - The checked input elements
   * @param {number} checkedInputElementsCount - The number of checked inputs
   */
  #updateSwatchSummary(checkedInputElements, checkedInputElementsCount) {
    const { facetStatus } = this.refs;
    facetStatus.classList.remove('bubble', 'facets__bubble');

    if (checkedInputElementsCount === 0) {
      facetStatus.innerHTML = '';
      return;
    }

    if (checkedInputElementsCount > 3) {
      facetStatus.innerHTML = checkedInputElementsCount.toString();
      facetStatus.classList.add('bubble', 'facets__bubble');
      return;
    }

    facetStatus.innerHTML = Array.from(checkedInputElements)
      .map((inputElement) => {
        const swatch = inputElement.parentElement?.querySelector('span.swatch');
        return swatch?.outerHTML ?? '';
      })
      .join('');
  }

  /**
   * Updates the bubble summary
   * @param {HTMLInputElement[]} checkedInputElements - The checked input elements
   * @param {number} checkedInputElementsCount - The number of checked inputs
   */
  #updateBubbleSummary(checkedInputElements, checkedInputElementsCount) {
    const { facetStatus } = this.refs;
    const filterStyle = this.dataset.filterStyle;

    facetStatus.classList.remove('bubble', 'facets__bubble');

    if (checkedInputElementsCount === 0) {
      facetStatus.innerHTML = '';
      return;
    }

    if (filterStyle === 'horizontal' && checkedInputElementsCount === 1) {
      facetStatus.innerHTML = checkedInputElements[0]?.dataset.label ?? '';
      return;
    }

    facetStatus.innerHTML = checkedInputElementsCount.toString();
    facetStatus.classList.add('bubble', 'facets__bubble');
  }

  /**
   * Updates the price summary
   * @param {HTMLInputElement} minInput - The minimum price input
   * @param {HTMLInputElement} maxInput - The maximum price input
   */
  updatePriceSummary(minInput, maxInput) {
    const minInputValue = minInput.value;
    const maxInputValue = maxInput.value;
    const { facetStatus } = this.refs;

    if (!minInputValue && !maxInputValue) {
      facetStatus.innerHTML = '';
      return;
    }

    const minInputNum = this.#parseCents(minInputValue, '0');
    const maxInputNum = this.#parseCents(maxInputValue, facetStatus.dataset.rangeMax);
    facetStatus.innerHTML = `${this.#formatMoney(minInputNum)}–${this.#formatMoney(maxInputNum)}`;
  }

  /**
   * Parses a decimal number as cents
   * @param {string} value - The stringified decimal number to parse
   * @param {string} fallback - The fallback value in case `value` is invalid
   * @returns {number} The money value in cents
   */
  #parseCents(value, fallback = '0') {
    const parts = value ? value.trim().split(/[^0-9]/) : (parseInt(fallback, 10) / 100).toString();
    const [wholeStr, fractionStr, ...rest] = parts;
    if (typeof wholeStr !== 'string' || rest.length > 0) return parseInt(fallback, 10);

    const whole = parseInt(wholeStr, 10);
    let fraction = parseInt(fractionStr || '0', 10);

    // Use two most-significant digits, e.g. 1 -> 10, 12 -> 12, 123 -> 12.3, 1234 -> 12.34, etc
    fraction = fraction * Math.pow(10, 2 - fraction.toString().length);

    return whole * 100 + fraction;
  }

  /**
   * Formats money, replicated the implementation of the `money` liquid filters
   * @param {number} moneyValue - The money value
   * @returns {string} The formatted money value
   */
  #formatMoney(moneyValue) {
    if (!(this.refs.moneyFormat instanceof HTMLTemplateElement)) return '';

    const template = this.refs.moneyFormat.content.textContent || '{{amount}}';
    const currency = this.refs.facetStatus.dataset.currency || '';

    return template.replace(/{{\s*(\w+)\s*}}/g, (_, placeholder) => {
      if (typeof placeholder !== 'string') return '';
      if (placeholder === 'currency') return currency;

      let thousandsSeparator = ',';
      let decimalSeparator = '.';
      let precision = CURRENCY_DECIMALS[currency.toUpperCase()] ?? DEFAULT_CURRENCY_DECIMALS;

      if (placeholder === 'amount') {
        // Check first since it's the most common, use defaults.
      } else if (placeholder === 'amount_no_decimals') {
        precision = 0;
      } else if (placeholder === 'amount_with_comma_separator') {
        thousandsSeparator = '.';
        decimalSeparator = ',';
      } else if (placeholder === 'amount_no_decimals_with_comma_separator') {
        // Weirdly, this is correct. It uses amount_with_comma_separator's
        // behaviour but removes decimals, resulting in an unintuitive
        // output that can't possibly include commas, despite the name.
        thousandsSeparator = '.';
        precision = 0;
      } else if (placeholder === 'amount_no_decimals_with_space_separator') {
        thousandsSeparator = ' ';
        precision = 0;
      } else if (placeholder === 'amount_with_space_separator') {
        thousandsSeparator = ' ';
        decimalSeparator = ',';
      } else if (placeholder === 'amount_with_period_and_space_separator') {
        thousandsSeparator = ' ';
        decimalSeparator = '.';
      } else if (placeholder === 'amount_with_apostrophe_separator') {
        thousandsSeparator = "'";
        decimalSeparator = '.';
      }

      return this.#formatCents(moneyValue, thousandsSeparator, decimalSeparator, precision);
    });
  }

  /**
   * Formats money in cents
   * @param {number} moneyValue - The money value in cents (hundredths of one major currency unit)
   * @param {string} thousandsSeparator - The thousands separator
   * @param {string} decimalSeparator - The decimal separator
   * @param {number} precision - The precision
   * @returns {string} The formatted money value
   */
  #formatCents(moneyValue, thousandsSeparator, decimalSeparator, precision) {
    const roundedNumber = (moneyValue / 100).toFixed(precision);

    let [a, b] = roundedNumber.split('.');
    if (!a) a = '0';
    if (!b) b = '';

    // Split by groups of 3 digits
    a = a.replace(/\d(?=(\d\d\d)+(?!\d))/g, (digit) => digit + thousandsSeparator);

    return precision <= 0 ? a : a + decimalSeparator + b.padEnd(precision, '0');
  }

  /**
   * Clears the summary
   */
  clearSummary() {
    this.refs.facetStatus.innerHTML = '';
  }
}

if (!customElements.get('facet-status-component')) {
  customElements.define('facet-status-component', FacetStatusComponent);
}

/**
 * Default currency decimals used in most currenies
 * @constant {number}
 */
const DEFAULT_CURRENCY_DECIMALS = 2;

/**
 * Decimal precision for currencies that have a non-default precision
 * @type {Record<string, number>}
 */
const CURRENCY_DECIMALS = {
  BHD: 3,
  BIF: 0,
  BYR: 0,
  CLF: 4,
  CLP: 0,
  DJF: 0,
  GNF: 0,
  IQD: 3,
  ISK: 0,
  JOD: 3,
  JPY: 0,
  KMF: 0,
  KRW: 0,
  KWD: 3,
  LYD: 3,
  MRO: 5,
  OMR: 3,
  PYG: 0,
  RWF: 0,
  TND: 3,
  UGX: 0,
  UYI: 0,
  UYW: 4,
  VND: 0,
  VUV: 0,
  XAF: 0,
  XAG: 0,
  XAU: 0,
  XBA: 0,
  XBB: 0,
  XBC: 0,
  XBD: 0,
  XDR: 0,
  XOF: 0,
  XPD: 0,
  XPF: 0,
  XPT: 0,
  XSU: 0,
  XTS: 0,
  XUA: 0,
};

/**
 * Tracks the last input element that triggered a filter change
 * This is used to pass the element to renderProductGridContainer
 * @type {HTMLInputElement | null}
 */
let lastChangedInputElement = null;
/** @type {any} */
(window).lastChangedInputElement = null; // Expose globally

// Listen for change events on filter inputs to track the triggering element
document.addEventListener('change', function(event) {
  const target = event.target;
  if (target instanceof HTMLInputElement && 
      (target.type === 'checkbox' || target.type === 'radio') &&
      (target.closest('facets-form-component') || target.closest('.filter_content_div'))) {
    lastChangedInputElement = target;
    /** @type {any} */
    (window).lastChangedInputElement = target; // Expose globally
    
    // Also store it in section-renderer if available
    if (typeof (/** @type {any} */ (window).setLastFilterChangeElement) === 'function') {
      (/** @type {any} */ (window).setLastFilterChangeElement)(target);
    }
  }
}, true); // Use capture phase to catch events early

/**
 * Renders the product grid container with quick filter integration
 * This function integrates the three-layer quick filter with the vertical filter system
 * @param {string} html - The HTML string from the section rendering
 * @param {HTMLElement} element - The element that triggered the filter change
 */
/** @type {any} */
(window).renderProductGridContainer = function (/** @type {string} */ html, /** @type {HTMLElement} */ element) {
  const productGridContainer = document.getElementById('ProductGridContainer');
  
  if (!productGridContainer || productGridContainer.getAttribute('quick-filter') !== 'true') {
    return;
  }

  // Safety check: ensure element has required properties
  let inputElement = null;
  if (element instanceof HTMLInputElement) {
    inputElement = element;
  } else {
    // Try to get the last changed input as fallback
    const fallbackElement = lastChangedInputElement || 
      document.querySelector('input[type="checkbox"]:checked, input[type="radio"]:checked');
    
    if (fallbackElement instanceof HTMLInputElement) {
      inputElement = fallbackElement;
    } else {
      return;
    }
  }

  const name = inputElement.name || '';
  const defaultValue = inputElement.defaultValue || inputElement.value || '';
  
  // Get filter label from the input element's filter-label attribute
  const filterLabel = inputElement.getAttribute('filter-label') || '';
  
  // Get category label from parent container (ul.desktop-list or .filter_content_div)
  const parentContainer = inputElement.closest('ul.desktop-list[category-label], .filter_content_div[category-label]');
  const categoryLabel = parentContainer ? (parentContainer.getAttribute('category-label') || '') : '';

  // Store both filter value and label in sessionStorage
  if (!sessionStorage.getItem('flag-filter_check')) {
    sessionStorage.setItem('flag-filter_check', `${defaultValue}`);
  }

  const filterCategory = name.split('.').pop();
  
  // Now you have access to:
  // - defaultValue: the filter value
  // - filterLabel: the filter label name
  // - categoryLabel: the category label (e.g., 'category', 'gender', etc.)

  let checkedFiltersList = screen.width > 600 
    ? document.querySelectorAll('ul.desktop-list[category-label]:not([category-label="gender"]) input[type="checkbox"]:checked') 
    : document.querySelectorAll('.filter_content_div[category-label]:not([category-label="gender"]) input[type="checkbox"]:checked');

  checkedFiltersList?.forEach(input => {
    if (!(input instanceof HTMLInputElement)) return;
    let thirdLevelList = document.querySelectorAll(`.inner-third-level[for-label='${input.getAttribute('filter-label')}'][for-value='${input.value.toLowerCase()}']`);
    thirdLevelList?.forEach(list => {
      if (list instanceof HTMLElement) list.classList.add('active');
    });
  });

  let filterCheck = sessionStorage.getItem('flag-filter_check');

  let categoryCheckedList = screen.width > 600 
    ? document.querySelectorAll('ul.desktop-list[category-label=category] li input[type="checkbox"]:checked') 
    : document.querySelectorAll('.filter_content_div[category-label=category] li input[type="checkbox"]:checked');
  if (filterCategory == 'product_type' && filterCheck != defaultValue) {
    sessionStorage.setItem('flag-filter_check', `${defaultValue}`);

    categoryCheckedList?.forEach(item => {
      if (item instanceof HTMLInputElement) item.checked = false;
    });

    document.querySelectorAll('.inner-second-level.active')?.forEach(item => {
      if (item instanceof HTMLElement) item.classList.remove('active');
    });

    categoryCheckedList?.forEach(item => {
      if (!(item instanceof HTMLInputElement)) return;
      if (item.value == defaultValue) {
        // Ensure drawer stays open when category filter is selected in quick filter collections
        const filtersDrawer = document.querySelector('#filters-drawer');
        if (filtersDrawer) {
          const dialog = filtersDrawer.querySelector('dialog');
          if (dialog && dialog.hasAttribute('open')) {
            sessionStorage.setItem('filtersDrawerShouldStayOpen', 'true');
            sessionStorage.setItem('forceKeepDrawerOpen', 'true');
          }
        }
        
        item.checked = true;

        const changeEvent = new Event('change', { bubbles: true, cancelable: true });
        item.dispatchEvent(changeEvent);

        sessionStorage.setItem('filter-clicked', 'true');

        document.querySelector(`.inner-second-level[filter-value='${defaultValue.toLowerCase()}']`)?.classList.add('active');

        document.querySelectorAll('.inner-third-level')?.forEach(el => {
          if (el instanceof HTMLElement) {
            el.style.display = el.getAttribute('category-value') === defaultValue.toLowerCase() ? 'block' : 'none';
          }
        });

        return;
      }
    });
  } else {
    if (categoryCheckedList.length === 0) {
      if (sessionStorage.getItem('disabled_clicked') != 'true') {
        document.querySelectorAll('.inner-second-level.active')?.forEach(item => {
          if (item instanceof HTMLElement) item.classList.remove('active');
        });
        const allSecondLevel = document.querySelector('.inner-second-level');
        if (allSecondLevel instanceof HTMLElement) allSecondLevel.classList.add('active');
        document.querySelectorAll('.inner-third-level')?.forEach(el => {
          if (el instanceof HTMLElement) {
            el.style.display = el.getAttribute('category-value') === 'all' ? 'block' : 'none';
          }
        });
      }
    } else if (categoryCheckedList.length === 1) {
      document.querySelectorAll('.inner-second-level.active')?.forEach(item => {
        if (item instanceof HTMLElement) item.classList.remove('active');
      });

      let secondFilterChecked = document.querySelector(`.inner-second-level[filter-value='${defaultValue?.toLowerCase()}']`);

      let categoryChecked = screen.width > 600 
        ? document.querySelector('ul.desktop-list[category-label=category] input[type="checkbox"]:checked') 
        : document.querySelector('.filter_content_div[category-label=category] input[type="checkbox"]:checked');

      if (categoryChecked && categoryChecked instanceof HTMLInputElement) {
        const activeElement = document.querySelector(`.inner-second-level[filter-value='${categoryChecked.value.toLowerCase()}']`);
        if (activeElement instanceof HTMLElement) activeElement.classList.add('active');
        document.querySelectorAll('.inner-third-level')?.forEach(el => {
          if (el instanceof HTMLElement) {
            el.style.display = el.getAttribute('category-value') === categoryChecked.value.toLowerCase() ? 'block' : 'none';
          }
        });
      }

      if (secondFilterChecked && secondFilterChecked instanceof HTMLElement) {
        secondFilterChecked.classList.add('active');
      }
    }
  }

  // Update the product grid container HTML
  const fragment = new DOMParser().parseFromString(html, 'text/html');
  const newProductGridContainer = fragment.getElementById('ProductGridContainer');
  
  if (newProductGridContainer) {
    productGridContainer.innerHTML = newProductGridContainer.innerHTML;
  }

  // Dispatch filter-changed event
  var event = new CustomEvent('filter-changed', {
    detail: {
      message: 'Filter-Changed'
    }
  });
  document.dispatchEvent(event);

  // Handle disabled inputs on mobile
  if (screen.width <= 600 && typeof (/** @type {any} */ (window).dispatchDisabledInput) === 'function') {
    (/** @type {any} */ (window).dispatchDisabledInput)();
  }

  // Handle quick filter updates
  if (productGridContainer.getAttribute('quick-filter') == 'true') {
    sessionStorage.removeItem('disabled_clicked');
    
    if (typeof (/** @type {any} */ (window).handleDisabledFilter) === 'function') {
      (/** @type {any} */ (window).handleDisabledFilter)();
    }
    
    if (typeof (/** @type {any} */ (window).handleThirdLevelDisabledFilter) === 'function') {
      (/** @type {any} */ (window).handleThirdLevelDisabledFilter)();
    }
    
    // Clear forceKeepDrawerOpen after a delay to allow all updates to complete
    // This ensures the drawer stays open during the entire filter update process
    setTimeout(() => {
      // Only clear if drawer is still open (user hasn't manually closed it)
      const filtersDrawer = document.querySelector('#filters-drawer');
      if (filtersDrawer) {
        const dialog = filtersDrawer.querySelector('dialog');
        if (dialog && dialog.hasAttribute('open')) {
          // Drawer is still open, clear the force flag but keep shouldStayOpen
          sessionStorage.removeItem('forceKeepDrawerOpen');
        } else {
          // Drawer was closed, clear all flags
          sessionStorage.removeItem('forceKeepDrawerOpen');
          sessionStorage.removeItem('filtersDrawerShouldStayOpen');
        }
      } else {
        sessionStorage.removeItem('forceKeepDrawerOpen');
        sessionStorage.removeItem('filtersDrawerShouldStayOpen');
      }
    }, 500);
  }
};

// Type declaration for window properties
if (typeof window !== 'undefined') {
  /** @type {any} */
  const win = window;
  win.renderProductGridContainer = win.renderProductGridContainer;
  win.lastChangedInputElement = win.lastChangedInputElement;
} 