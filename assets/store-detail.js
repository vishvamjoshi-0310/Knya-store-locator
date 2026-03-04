document.addEventListener('DOMContentLoaded', function () {
  /** @type {NodeListOf<HTMLElement>} */
  var hoursBlocks = document.querySelectorAll('.store-detail__hours');

  hoursBlocks.forEach(function (node) {
    /** @type {HTMLElement} */
    var block = node;
    /** @type {HTMLElement|null} */
    var toggle = block.querySelector('.store-detail__hours-toggle');
    /** @type {HTMLElement|null} */
    var flyout = block.querySelector('.store-detail__hours-flyout');
    if (!toggle || !flyout) return;

    toggle.addEventListener('click', function () {
      /** @type {HTMLElement|null} */
      var button = block.querySelector('.store-detail__hours-toggle');
      if (!button) return;
      var isOpen = block.classList.toggle('is-open');
      button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  });

  // Open/closed indicator based on current time for store detail
  /** @type {NodeListOf<HTMLElement>} */
  var statusEls = document.querySelectorAll('.store-detail__info-open');

  /**
   * @param {string} timeText
   * @returns {number|null}
   */
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
      /** @type {string} */
      var openTimeAttr = el.getAttribute('data-open-time') || '';
      /** @type {string} */
      var closeTimeAttr = el.getAttribute('data-close-time') || '';
      var openHour = parseHour(openTimeAttr);
      var closeHour = parseHour(closeTimeAttr);
      if (openHour == null || closeHour == null) return;
      var isOpen = currentHour >= openHour && currentHour < closeHour;
      el.textContent = isOpen ? 'Open' : 'Closed';
      el.style.color = isOpen ? '#34C759' : '#D93025';
      var timeEl = el.parentElement ? el.parentElement.querySelector('.store-detail__status-time') : null;
      if (timeEl) {
        timeEl.textContent = isOpen ? 'Closes ' + closeTimeAttr : 'Opens ' + openTimeAttr;
      }
    });
  }
});

