// Floating Bulk Order CTA Button Visibility Controller
document.addEventListener('DOMContentLoaded', function () {
    const floatingButton = document.querySelector('.floading-bulk-order-cta-parent');
    const targetButton = document.querySelector('.bulk-order-steps-parent .order-button');
    const bannerElement = document.querySelector('.imageWithTextBanner');

    if (!floatingButton || !targetButton) {
        console.warn('Floating button or target button not found');
        return;
    }

    if (!bannerElement) {
        console.warn('Banner element not found');
    }

    // Initially hide the floating button
    floatingButton.style.transform = 'translateY(100%)';
    floatingButton.style.transition = 'transform 0.3s ease-in-out, opacity 0.3s ease-in-out';
    floatingButton.style.opacity = '0';

    // Track visibility state of both elements
    let isTargetButtonVisible = false;
    let isBannerVisible = false;

    // Create intersection observer to watch both elements
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.target === targetButton) {
                isTargetButtonVisible = entry.isIntersecting;
            } else if (entry.target === bannerElement) {
                isBannerVisible = entry.isIntersecting;
            }
        });

        // Show floating button only when both elements are out of viewport
        if (!isTargetButtonVisible && !isBannerVisible) {
            showFloatingButton();
        } else {
            hideFloatingButton();
        }
    }, {
        // Trigger when elements are completely out of view
        threshold: 0,
        rootMargin: '0px'
    });

    // Start observing both elements
    observer.observe(targetButton);
    if (bannerElement) {
        observer.observe(bannerElement);
    }

    function showFloatingButton() {
        floatingButton.style.transform = 'translateY(0)';
        floatingButton.style.opacity = '1';
    }

    function hideFloatingButton() {
        floatingButton.style.transform = 'translateY(100%)';
        floatingButton.style.opacity = '0';
    }

    // Optional: Add click handler to floating button to scroll to original button
    floatingButton.addEventListener('click', function () {
        targetButton.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    });
});