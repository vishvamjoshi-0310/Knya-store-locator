document.addEventListener('DOMContentLoaded', function () {
    const buttons = document.querySelectorAll('.vitals-featured-content-card-button');

    buttons.forEach((button) => {
        button.addEventListener('click', function (e) {
            e.preventDefault();
            this.classList.add('clicked');

            const url = this.dataset.url;

            setTimeout(() => {
                if (url) {
                    window.location.href = url;
                }
            }, 400);
        });
    });

    // Carousel Logic
    const container = document.querySelector('.vitals-featured-content-inner');
    const cards = document.querySelectorAll('.vitals-featured-content-card');
    const dots = document.querySelectorAll('.featured-navigation-dot');
    const prevBtn = document.querySelector('.featured-navigation-button.prev');
    const nextBtn = document.querySelector('.featured-navigation-button.next');

    let currentSlide = 0;
    const totalSlides = cards.length;
    let scrollTimeout;

    if (totalSlides === 0 || !container) return;

    // Get card distance including spacing
    const getCardDistance = () => cards.length > 1 ?
        cards[1].offsetLeft - cards[0].offsetLeft : cards[0].offsetWidth;

    // Update UI elements
    const updateUI = () => {
        dots.forEach((dot, i) => dot.classList.toggle('active', i === currentSlide));
        if (prevBtn) prevBtn.classList.toggle('disabled', currentSlide === 0);
        if (nextBtn) nextBtn.classList.toggle('disabled', currentSlide === totalSlides - 1);
    };

    // Main update function
    const updateSlider = () => {
        container.scrollTo({ left: currentSlide * getCardDistance(), behavior: 'smooth' });
        updateUI();
    };

    // Navigation functions
    const goToSlide = (slide) => { currentSlide = slide; updateSlider(); };
    const prevSlide = () => currentSlide > 0 && goToSlide(currentSlide - 1);
    const nextSlide = () => currentSlide < totalSlides - 1 && goToSlide(currentSlide + 1);

    // Event listeners
    if (prevBtn) prevBtn.addEventListener('click', prevSlide);
    if (nextBtn) nextBtn.addEventListener('click', nextSlide);
    dots.forEach((dot, i) => dot.addEventListener('click', () => goToSlide(i)));

    // Handle manual scroll with debouncing
    container.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            const distance = getCardDistance();
            if (distance > 0) {
                const newSlide = Math.round(container.scrollLeft / distance);
                if (newSlide !== currentSlide && newSlide >= 0 && newSlide < totalSlides) {
                    currentSlide = newSlide;
                    updateUI();
                }
            }
        }, 100);
    });

    // Initialize
    updateUI();
});