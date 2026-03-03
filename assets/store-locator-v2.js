document.addEventListener('DOMContentLoaded', function () {
  var cityLinks = document.querySelectorAll('.store-locator-v2__city-item');
  var cards = Array.prototype.slice.call(document.querySelectorAll('.store-card-v2'));
  var countEl = document.getElementById('StoreLocatorCount');
  var searchInput = document.getElementById('StoreLocatorCitySearch');
  var grid = document.getElementById('StoreLocatorGrid');
  var paginationEl = document.getElementById('StoreLocatorPagination');
  var paginationPagesEl = document.getElementById('StoreLocatorPaginationPages');
  var perPage = grid ? parseInt(grid.getAttribute('data-per-page'), 10) || 10 : 10;

  var currentCitySlug = '';
  try {
    var params = new URLSearchParams(window.location.search);
    var cityParam = params.get('city');
    if (cityParam && cityParam.toLowerCase() !== 'all') currentCitySlug = cityParam.toLowerCase().trim();
  } catch (e) {}

  cityLinks.forEach(function (link) {
    link.classList.remove('is-active');
    var slug = (link.getAttribute('data-city-slug') || '').toLowerCase();
    if ((currentCitySlug === '' && slug === 'all') || (currentCitySlug !== '' && slug === currentCitySlug)) {
      link.classList.add('is-active');
    }
  });

  var drawerCityItems = document.querySelectorAll('.store-locator-v2__drawer-city-item');
  drawerCityItems.forEach(function (link) {
    link.classList.remove('is-active');
    var slug = (link.getAttribute('data-city-slug') || '').toLowerCase();
    if ((currentCitySlug === '' && slug === 'all') || (currentCitySlug !== '' && slug === currentCitySlug)) {
      link.classList.add('is-active');
    }
  });

  var visibleCards = cards.filter(function (card) {
    var slug = (card.getAttribute('data-city-slug') || '').toLowerCase();
    return currentCitySlug === '' || slug === currentCitySlug;
  });

  if (countEl) countEl.textContent = visibleCards.length;
  var mobileCountEl = document.getElementById('StoreLocatorCountMobile');
  if (mobileCountEl) mobileCountEl.textContent = visibleCards.length + ' Stores Found';
  var mobileCityEl = document.getElementById('StoreLocatorMobileCityName');
  var activeLink = document.querySelector('.store-locator-v2__city-item.is-active');
  if (mobileCityEl && activeLink) {
    mobileCityEl.textContent = (activeLink.getAttribute('data-city-name') || 'All Stores').toUpperCase();
  }

  var totalPages = visibleCards.length <= 0 ? 1 : Math.ceil(visibleCards.length / perPage);
  var currentPage = 1;

  function showPage(page) {
    currentPage = Math.max(1, Math.min(page, totalPages));
    cards.forEach(function (card) {
      var idx = visibleCards.indexOf(card);
      var show = idx !== -1 && idx >= (currentPage - 1) * perPage && idx < currentPage * perPage;
      card.style.display = show ? '' : 'none';
    });
    if (paginationEl) {
      paginationEl.style.display = totalPages > 1 ? '' : 'none';
      paginationEl.querySelector('.store-locator-v2__pagination-prev').disabled = currentPage <= 1;
      paginationEl.querySelector('.store-locator-v2__pagination-next').disabled = currentPage >= totalPages;
    }
    if (paginationPagesEl) {
      var btns = paginationPagesEl.querySelectorAll('button');
      btns.forEach(function (b) {
        b.classList.toggle('is-active', parseInt(b.getAttribute('data-page'), 10) === currentPage);
      });
    }
  }

  if (paginationEl && paginationPagesEl) {
    paginationPagesEl.innerHTML = '';
    for (var p = 1; p <= totalPages; p++) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'store-locator-v2__pagination-page' + (p === 1 ? ' is-active' : '');
      btn.setAttribute('data-page', p);
      btn.textContent = p;
      btn.addEventListener('click', function () { showPage(parseInt(this.getAttribute('data-page'), 10)); });
      paginationPagesEl.appendChild(btn);
    }
    var prevBtn = paginationEl.querySelector('.store-locator-v2__pagination-prev');
    var nextBtn = paginationEl.querySelector('.store-locator-v2__pagination-next');
    if (prevBtn) prevBtn.addEventListener('click', function () { showPage(currentPage - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { showPage(currentPage + 1); });
  }

  showPage(1);

  if (searchInput) {
    searchInput.addEventListener('input', function (event) {
      var query = event.target.value.toLowerCase().trim();
      cityLinks.forEach(function (link, index) {
        if (index === 0) { link.style.display = ''; return; }
        var name = (link.getAttribute('data-city-name') || link.textContent).toLowerCase();
        link.style.display = name.indexOf(query) !== -1 ? '' : 'none';
      });
    });
  }

  var drawerOverlay = document.getElementById('StoreLocatorDrawerOverlay');
  var mobileTrigger = document.getElementById('StoreLocatorMobileCityTrigger');
  var drawerCloseBtn = document.getElementById('StoreLocatorDrawerClose');
  var drawerSearchInput = document.getElementById('StoreLocatorDrawerSearch');

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
    if (drawerSearchInput) drawerSearchInput.value = '';
    drawerCityItems.forEach(function (link) { link.style.display = ''; });
  }

  if (mobileTrigger) {
    mobileTrigger.addEventListener('click', function () { openDrawer(); });
  }
  if (drawerOverlay) {
    drawerOverlay.addEventListener('click', function (e) {
      if (e.target === drawerOverlay) closeDrawer();
    });
  }
  if (drawerCloseBtn) {
    drawerCloseBtn.addEventListener('click', function () { closeDrawer(); });
  }
  drawerCityItems.forEach(function (link) {
    link.addEventListener('click', function () { closeDrawer(); });
  });
  if (drawerSearchInput) {
    drawerSearchInput.addEventListener('input', function (event) {
      var query = event.target.value.toLowerCase().trim();
      drawerCityItems.forEach(function (link, index) {
        if (index === 0) { link.style.display = ''; return; }
        var name = (link.getAttribute('data-city-name') || link.textContent).toLowerCase();
        link.style.display = name.indexOf(query) !== -1 ? '' : 'none';
      });
    });
  }

  // Open/closed indicator based on current time
  var statusEls = document.querySelectorAll('.store-status');

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

  if (statusEls.length) {
    var now = new Date();
    var currentHour = now.getHours();
    statusEls.forEach(function (el) {
      var openTime = el.dataset.openTime;
      var closeTime = el.dataset.closeTime;
      var openHour = parseHour(openTime);
      var closeHour = parseHour(closeTime);
      if (openHour == null || closeHour == null) return;
      var isOpen = currentHour >= openHour && currentHour < closeHour;
      var labelEl = el.previousElementSibling;
      if (!labelEl) return;
      labelEl.textContent = isOpen ? 'Open' : 'Closed';
      labelEl.style.color = isOpen ? '#34C759' : '#D93025';
    });
  }

  // Weekly hours flyout toggle
  var hourToggles = document.querySelectorAll('.store-card-v2__hours-toggle');
  hourToggles.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var wrapper = btn.closest('.store-card-v2__hours-wrapper');
      if (!wrapper) return;
      wrapper.classList.toggle('is-open');
    });
  });
});
