document.addEventListener("DOMContentLoaded", function () {
    // Scroll-based Preorder Overlay Visibility
    const preorderOverlay = document.querySelector(".stetho-preoorder-overlay");

    function handleScroll() {
        const scrollPercentage = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
        const isMobile = window.matchMedia("(max-width: 768px)").matches;

        if (!isMobile && preorderOverlay) { // Only apply changes for desktop
            preorderOverlay.style.bottom = scrollPercentage >= 2 ? "16px" : "-10px";
        }
    }

    window.addEventListener("scroll", handleScroll);
});
