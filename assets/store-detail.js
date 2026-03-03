document.addEventListener('DOMContentLoaded', function () {
  var hoursBlocks = document.querySelectorAll('.store-detail__hours');

  hoursBlocks.forEach(function (block) {
    var toggle = block.querySelector('.store-detail__hours-toggle');
    var flyout = block.querySelector('.store-detail__hours-flyout');
    if (!toggle || !flyout) return;

    toggle.addEventListener('click', function () {
      var isOpen = block.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  });
});

