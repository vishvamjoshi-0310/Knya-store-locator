// @ts-nocheck
document.addEventListener('DOMContentLoaded', function () {

  // ── DOM references ────────────────────────────────────────────────────────
  var cityLinks        = document.querySelectorAll('.store-locator-v2__city-item');
  var cards            = Array.prototype.slice.call(document.querySelectorAll('.store-card-v2'));
  var countEl          = document.getElementById('StoreLocatorCount');
  var mobileCountEl    = document.getElementById('StoreLocatorCountMobile');
  var mobileCityEl     = document.getElementById('StoreLocatorMobileCityName');
  var mobileTriggerTextEl = document.querySelector('.store-locator-v2__mobile-city-trigger-text');
  var searchInput      = document.getElementById('StoreLocatorCitySearch');
  var grid             = document.getElementById('StoreLocatorGrid');
  var paginationEl     = document.getElementById('StoreLocatorPagination');
  var paginationPagesEl = document.getElementById('StoreLocatorPaginationPages');
  var drawerOverlay    = document.getElementById('StoreLocatorDrawerOverlay');
  var mobileTrigger    = document.getElementById('StoreLocatorMobileCityTrigger');
  var drawerCloseBtn   = document.getElementById('StoreLocatorDrawerClose');
  var drawerSearchInput = document.getElementById('StoreLocatorDrawerSearch');
  var perPage          = grid ? parseInt(grid.getAttribute('data-per-page'), 10) || 10 : 10;

  // ── Module-level mutable state ────────────────────────────────────────────
  var currentCitySlug = '';
  var visibleCards    = [];
  var totalPages      = 1;
  var currentPage     = 1;

  // ── URL helpers ───────────────────────────────────────────────────────────
  function getSlugFromURL() {
    try {
      var params = new URLSearchParams(window.location.search);
      var cityParam = params.get('city');
      if (cityParam && cityParam.toLowerCase() !== 'all') {
        return cityParam.toLowerCase().trim();
      }
    } catch (e) {}
    return '';
  }

  // ── Core filter function ──────────────────────────────────────────────────
  function applyFilter(slug) {
    currentCitySlug = slug;

    // 1. Update active state on all city links (sidebar + drawer share the same class)
    cityLinks.forEach(function (link) {
      link.classList.remove('is-active');
      var linkSlug = (link.getAttribute('data-city-slug') || '').toLowerCase();
      var isAll = slug === '' && linkSlug === 'all';
      var isMatch = slug !== '' && linkSlug === slug;
      if (isAll || isMatch) link.classList.add('is-active');
    });

    // 2. Recompute visible cards
    visibleCards = cards.filter(function (card) {
      var cardSlug = (card.getAttribute('data-city-slug') || '').toLowerCase();
      return slug === '' || cardSlug === slug;
    });

    // 3. Update count displays
    if (countEl) countEl.textContent = visibleCards.length;
    if (mobileCountEl) mobileCountEl.textContent = visibleCards.length + ' Stores Found';

    // 4. Update mobile header city name and trigger button text
    var activeLink = document.querySelector('.store-locator-v2__city-item.is-active');
    var cityName = activeLink ? (activeLink.getAttribute('data-city-name') || 'All Stores') : 'All Stores';
    if (mobileCityEl) mobileCityEl.textContent = cityName.toUpperCase();
    if (mobileTriggerTextEl) mobileTriggerTextEl.textContent = slug === '' ? 'Select Your City' : cityName;

    // 5. Rebuild pagination and show page 1
    rebuildPagination();
    showPage(1);
  }

  // ── Pagination ────────────────────────────────────────────────────────────
  function rebuildPagination() {
    totalPages = visibleCards.length <= 0 ? 1 : Math.ceil(visibleCards.length / perPage);

    if (!paginationEl || !paginationPagesEl) return;

    paginationPagesEl.innerHTML = '';
    for (var p = 1; p <= totalPages; p++) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'store-locator-v2__pagination-page';
      btn.setAttribute('data-page', p);
      btn.textContent = p;
      paginationPagesEl.appendChild(btn);
    }
  }

  function showPage(page) {
    currentPage = Math.max(1, Math.min(page, totalPages));

    cards.forEach(function (card) {
      var idx = visibleCards.indexOf(card);
      var show = idx !== -1 && idx >= (currentPage - 1) * perPage && idx < currentPage * perPage;
      card.style.display = show ? '' : 'none';
    });

    if (paginationEl) {
      paginationEl.style.display = totalPages > 1 ? '' : 'none';
      var prevBtn = paginationEl.querySelector('.store-locator-v2__pagination-prev');
      var nextBtn = paginationEl.querySelector('.store-locator-v2__pagination-next');
      if (prevBtn) prevBtn.disabled = currentPage <= 1;
      if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
    }

    if (paginationPagesEl) {
      var btns = paginationPagesEl.querySelectorAll('button');
      btns.forEach(function (b) {
        b.classList.toggle('is-active', parseInt(b.getAttribute('data-page'), 10) === currentPage);
      });
    }
  }

  // Delegated click handler for pagination — attached once, never re-bound
  if (paginationEl) {
    paginationEl.addEventListener('click', function (e) {
      var target = e.target;
      if (target.classList.contains('store-locator-v2__pagination-page')) {
        showPage(parseInt(target.getAttribute('data-page'), 10));
      } else if (target.classList.contains('store-locator-v2__pagination-prev')) {
        showPage(currentPage - 1);
      } else if (target.classList.contains('store-locator-v2__pagination-next')) {
        showPage(currentPage + 1);
      }
    });
  }

  // ── Drawer ────────────────────────────────────────────────────────────────
  function openDrawer() {
    if (drawerOverlay) {
      drawerOverlay.classList.add('is-open');
      drawerOverlay.setAttribute('aria-hidden', 'false');
    }
    if (mobileTrigger) mobileTrigger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    if (drawerOverlay) {
      drawerOverlay.classList.remove('is-open');
      drawerOverlay.setAttribute('aria-hidden', 'true');
    }
    if (mobileTrigger) mobileTrigger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    if (drawerSearchInput) {
      drawerSearchInput.value = '';
      // Reset drawer city item visibility after clearing search
      document.querySelectorAll('.store-locator-v2__drawer-city-item').forEach(function (link) {
        link.style.display = '';
      });
    }
  }

  if (mobileTrigger) mobileTrigger.addEventListener('click', openDrawer);
  if (drawerCloseBtn) drawerCloseBtn.addEventListener('click', closeDrawer);
  if (drawerOverlay) {
    drawerOverlay.addEventListener('click', function (e) {
      if (e.target === drawerOverlay) closeDrawer();
    });
  }

  // ── City link click handler (sidebar + drawer, single handler) ────────────
  cityLinks.forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();

      var slug = (link.getAttribute('data-city-slug') || '').toLowerCase();
      if (slug === 'all') slug = '';

      // Skip if already on this city
      if (slug === currentCitySlug) {
        if (link.classList.contains('store-locator-v2__drawer-city-item')) closeDrawer();
        return;
      }

      // Update URL without page reload
      try {
        var newURL = slug === ''
          ? window.location.pathname
          : window.location.pathname + '?city=' + slug;
        history.pushState({ city: slug }, '', newURL);
      } catch (ex) {}

      applyFilter(slug);

      // Close drawer if this was a drawer item
      if (link.classList.contains('store-locator-v2__drawer-city-item')) closeDrawer();
    });
  });

  // ── Browser back / forward ────────────────────────────────────────────────
  window.addEventListener('popstate', function (e) {
    var slug = (e.state && e.state.city != null) ? e.state.city : getSlugFromURL();
    applyFilter(slug);
  });

  // ── Sidebar city search ───────────────────────────────────────────────────
  if (searchInput) {
    searchInput.addEventListener('input', function (e) {
      var query = e.target.value.toLowerCase().trim();
      cityLinks.forEach(function (link, index) {
        // Skip drawer items in the sidebar search
        if (link.classList.contains('store-locator-v2__drawer-city-item')) return;
        if (index === 0) { link.style.display = ''; return; }
        var name = (link.getAttribute('data-city-name') || link.textContent).toLowerCase();
        link.style.display = name.indexOf(query) !== -1 ? '' : 'none';
      });
    });
  }

  // ── Drawer city search ────────────────────────────────────────────────────
  if (drawerSearchInput) {
    drawerSearchInput.addEventListener('input', function (e) {
      var query = e.target.value.toLowerCase().trim();
      document.querySelectorAll('.store-locator-v2__drawer-city-item').forEach(function (link, index) {
        if (index === 0) { link.style.display = ''; return; }
        var name = (link.getAttribute('data-city-name') || link.textContent).toLowerCase();
        link.style.display = name.indexOf(query) !== -1 ? '' : 'none';
      });
    });
  }

  // ── Open/closed status indicator ─────────────────────────────────────────
  function parseHour(timeText) {
    if (!timeText) return null;
    var match = timeText.trim().match(/^(\d+)(am|pm)$/i);
    if (!match) return null;
    var hour = parseInt(match[1], 10);
    var period = match[2].toLowerCase();
    if (period === 'pm' && hour !== 12) hour += 12;
    if (period === 'am' && hour === 12) hour = 0;
    return hour;
  }

  var statusEls = document.querySelectorAll('.store-status');
  if (statusEls.length) {
    var now = new Date();
    var currentHour = now.getHours();
    statusEls.forEach(function (el) {
      var openTime  = el.dataset.openTime;
      var closeTime = el.dataset.closeTime;
      var openHour  = parseHour(openTime);
      var closeHour = parseHour(closeTime);
      if (openHour == null || closeHour == null) return;
      var isOpen = currentHour >= openHour && currentHour < closeHour;
      var labelEl = el.previousElementSibling;
      if (!labelEl) return;
      labelEl.textContent = isOpen ? 'Open' : 'Closed';
      labelEl.style.color = isOpen ? '#34C759' : '#D93025';
      el.textContent = isOpen ? ('Closes ' + closeTime) : ('Opens ' + openTime);
    });
  }

  // ── Weekly hours flyout toggle ────────────────────────────────────────────
  document.querySelectorAll('.store-card-v2__hours-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var wrapper = btn.closest('.store-card-v2__hours-wrapper');
      if (wrapper) wrapper.classList.toggle('is-open');
    });
  });

  // ── Store card click → navigate to detail page ────────────────────────────
  cards.forEach(function (card) {
    var url = card.getAttribute('data-store-url');
    if (!url) return;
    card.style.cursor = 'pointer';
    card.addEventListener('click', function (event) {
      var interactive = event.target.closest('a, button');
      if (interactive && interactive !== card) return;
      window.location.href = url;
    });
    card.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        var activeEl = document.activeElement;
        if (activeEl && activeEl !== card && activeEl.closest('a, button')) return;
        event.preventDefault();
        window.location.href = url;
      }
    });
  });

  // ── Initial render ────────────────────────────────────────────────────────
  // Stamp initial state onto the history entry so popstate always has e.state
  var initialSlug = getSlugFromURL();
  try {
    history.replaceState({ city: initialSlug }, '');
  } catch (ex) {}

  applyFilter(initialSlug);
});
