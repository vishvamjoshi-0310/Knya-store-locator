  document.addEventListener('DOMContentLoaded', function () {
    const mobileContainer = document.querySelector('.mobile-cards');
    const desktopContainer = document.querySelector('.desktop-cards');
    const paginationContainer = document.querySelector('.bulk-order-testimonials-pagination');
    const paginationDots = document.querySelector('.pagination-dots');
    const prevBtn = document.querySelector('.pagination-prev');
    const nextBtn = document.querySelector('.pagination-next');
    const currentPageSpan = document.querySelector('.current-page');
    const totalPagesSpan = document.querySelector('.total-pages');
    const currentPaginationCounter = document.querySelector('.pagination-counter .current-page');

    let currentPage = 0;
    let totalPages = 0;
    let activeContainer = null;

    // Initialize pagination
    function initPagination() {
      const isMobile = window.innerWidth <= 767;

      if (isMobile) {
        activeContainer = mobileContainer;
        mobileContainer.style.display = 'flex';
        desktopContainer.style.display = 'none';
      } else {
        activeContainer = desktopContainer;
        mobileContainer.style.display = 'none';
        desktopContainer.style.display = 'flex';
      }

      const groups = activeContainer.querySelectorAll('.testimonials-group');
      totalPages = groups.length;

      // Hide pagination if only one page or no groups
      if (totalPages <= 1) {
        if (paginationContainer) {
          paginationContainer.style.display = 'none';
        }
        return;
      }

      // Show pagination container
      if (paginationContainer) {
        paginationContainer.style.display = 'flex';
      }

      // Reset to first page if current page is out of bounds
      if (currentPage >= totalPages) {
        currentPage = 0;
      }

      // Generate dots
      generateDots();

      // Update display
      updatePagination();
      showCurrentPage();
    }

    // Generate pagination dots
    function generateDots() {
      paginationDots.innerHTML = '';
      for (let i = 0; i < totalPages; i++) {
        const dot = document.createElement('button');
        dot.className = 'pagination-dot';
        dot.setAttribute('aria-label', `Go to page ${i + 1}`);
        if (i === currentPage) {
          dot.classList.add('active');
        }
        dot.addEventListener('click', () => goToPage(i));
        paginationDots.appendChild(dot);
      }
    }

    // Show current page
    function showCurrentPage() {
      const groups = activeContainer.querySelectorAll('.testimonials-group');
      const isMobile = window.innerWidth <= 767;

      if (isMobile) {
        // Mobile: slide horizontally (right to left) including gap
        const containerWidth = activeContainer.offsetWidth;
        const gap = 16; // Gap between groups
        const translateX = -(currentPage * (containerWidth + gap));
        activeContainer.style.transform = `translateX(${translateX}px)`;
      } else {
        // Desktop: slide horizontally including gap
        const containerWidth = activeContainer.offsetWidth;
        const gap = 16; // Gap between groups
        const translateX = -(currentPage * (containerWidth + gap));
        activeContainer.style.transform = `translateX(${translateX}px)`;
      }
    }

    // Update pagination controls
    function updatePagination() {
      // Update counter
      currentPageSpan.textContent = String(currentPage + 1).padStart(2, '0');
      totalPagesSpan.textContent = String(totalPages).padStart(2, '0');

      // Update button states
      prevBtn.classList.toggle('disabled', currentPage === 0);
      nextBtn.classList.toggle('disabled', currentPage === totalPages - 1);
      currentPaginationCounter.classList.toggle('disabled', currentPage !== totalPages - 1);

      // Update dots
      document.querySelectorAll('.pagination-dot').forEach((dot, index) => {
        dot.classList.toggle('active', index === currentPage);
      });
    }

    // Go to specific page
    function goToPage(pageIndex) {
      if (pageIndex >= 0 && pageIndex < totalPages) {
        currentPage = pageIndex;
        showCurrentPage();
        updatePagination();
      }
    }

    // Previous page
    prevBtn.addEventListener('click', () => {
      if (currentPage > 0) {
        goToPage(currentPage - 1);
      }
    });

    // Next page
    nextBtn.addEventListener('click', () => {
      if (currentPage < totalPages - 1) {
        goToPage(currentPage + 1);
      }
    });

    // Handle window resize with debounce
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        initPagination();
      }, 100);
    });

    // Initialize
    initPagination();
  });