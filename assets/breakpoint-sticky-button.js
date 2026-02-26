(function() {
  'use strict';

  function initStickyButton() {
    const bannerSection = document.querySelector('.breakpoint-banner-section');
    const bannerButton = document.querySelector('.breakpoint-banner-mobile-button');
    const feelingSection = document.querySelector('.breakpoint-feeling-section');
    const supportSection = document.querySelector('.breakpoint-support-section');
    const newStickyCTA = document.getElementById('anonymous-btn');

    if (!bannerSection || !feelingSection || !newStickyCTA) {
      console.warn('Required sections or buttons not found');
      return;
    }

    // Create OLD sticky CTA (clone of banner button) for feeling section only
    const oldStickyCTA = bannerButton ? bannerButton.cloneNode(true) : null;
    if (oldStickyCTA) {
      oldStickyCTA.classList.add('breakpoint-banner-sticky-button');
      oldStickyCTA.style.display = 'none';
      document.body.appendChild(oldStickyCTA);
    }

    const oldTextSpan = oldStickyCTA ? oldStickyCTA.querySelector('.breakpoint-banner-cta-text') : null;

    // Setup NEW sticky CTA positioning
    newStickyCTA.style.position = 'fixed';
    newStickyCTA.style.bottom = window.innerWidth > 768 ? '81px' : '24px';
    newStickyCTA.style.right = window.innerWidth > 768 ? '92px' : '24px';
    newStickyCTA.style.zIndex = '1000';

    function handleScroll() {
      const bannerRect = bannerSection.getBoundingClientRect();
      const feelingRect = feelingSection.getBoundingClientRect();
      const supportRect = supportSection ? supportSection.getBoundingClientRect() : null;

      // Check if banner is visible (any part in viewport)
      const isBannerVisible = bannerRect.bottom > 0;

      // Check if support section is visible (any part in viewport)
      const isSupportVisible = supportRect && 
                               supportRect.top < window.innerHeight && 
                               supportRect.bottom > 0;

      // Check when CTA button location is ON the feeling section
      // The CTA button is at bottom right, so check if feeling section overlaps with CTA position
      const viewportHeight = window.innerHeight;
      const ctaBottomPosition = window.innerWidth > 768 ? 81 : 24;
      const ctaTopPosition = viewportHeight - ctaBottomPosition - 60; // Approximate button height
      
      // Add 20% early transition offset
      const earlyTransitionOffset = viewportHeight * (window.innerWidth > 768 ? 0.82 : 0.96); // 20% of viewport height
      
      // Feeling section is active when it overlaps with the CTA button location
      // But we subtract the offset from bottom check to trigger change 20% earlier
      const isFeelingActive = feelingRect.top <= ctaTopPosition && 
                             feelingRect.bottom >= (ctaBottomPosition + earlyTransitionOffset);

      // LOGIC FOR NEW STICKY CTA
      // Show when: banner is NOT visible AND support is NOT visible AND feeling is NOT active
      if (isBannerVisible || isSupportVisible || isFeelingActive) {
        newStickyCTA.style.display = 'none';
      } else {
        newStickyCTA.style.display = 'block';
      }

      // LOGIC FOR OLD STICKY CTA
      // Show ONLY when CTA location is on feeling section
      if (oldStickyCTA) {
        if (isFeelingActive && !isBannerVisible) {
          // Show old CTA with text animation
          oldStickyCTA.style.position = 'fixed';
          oldStickyCTA.style.bottom = window.innerWidth > 768 ? '81px' : '24px';
          oldStickyCTA.style.right = window.innerWidth > 768 ? '92px' : '24px';
          oldStickyCTA.style.display = 'block';
          oldStickyCTA.style.zIndex = '1000';
          
          if (oldTextSpan) {
            oldTextSpan.classList.remove('hide-text');
            oldTextSpan.classList.add('show-text');
          }
        } else {
          oldStickyCTA.style.display = 'none';
          
          if (oldTextSpan) {
            oldTextSpan.classList.remove('show-text');
            oldTextSpan.classList.add('hide-text');
          }
        }
      }
    }

    // Throttle scroll events for performance
    let ticking = false;
    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(function() {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    }

    // Initial check
    handleScroll();

    // Listen to scroll events
    window.addEventListener('scroll', onScroll, { passive: true });

    // Handle resize events
    window.addEventListener('resize', function() {
      if (newStickyCTA) {
        newStickyCTA.style.bottom = window.innerWidth > 768 ? '81px' : '24px';
        newStickyCTA.style.right = window.innerWidth > 768 ? '92px' : '24px';
      }
      if (oldStickyCTA) {
        oldStickyCTA.style.bottom = window.innerWidth > 768 ? '81px' : '24px';
        oldStickyCTA.style.right = window.innerWidth > 768 ? '92px' : '24px';
      }
      handleScroll();
    }, { passive: true });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStickyButton);
  } else {
    initStickyButton();
  }
})();