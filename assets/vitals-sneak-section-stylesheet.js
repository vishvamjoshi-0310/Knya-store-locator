document.addEventListener('DOMContentLoaded', function () {
    const container = document.querySelector('.sneak-peek-cards');
    const cards = document.querySelectorAll('.sneak-peek-card');
    const dots = document.querySelectorAll('.sneak-navigation-dot');
    const prevBtn = document.querySelector('.sneak-navigation-button.prev');
    const nextBtn = document.querySelector('.sneak-navigation-button.next');

    let currentSlide = 0;
    const totalSlides = cards.length;
    let scrollTimeout;

    if (totalSlides === 0) return;

    // Get card distance including spacing
    const getCardDistance = () => cards.length > 1 ?
        cards[1].offsetLeft - cards[0].offsetLeft : cards[0].offsetWidth;

    // Update UI elements
    const updateUI = () => {
        dots.forEach((dot, i) => dot.classList.toggle('active', i === currentSlide));
        prevBtn?.classList.toggle('disabled', currentSlide === 0);
        nextBtn?.classList.toggle('disabled', currentSlide === totalSlides - 1);
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
    prevBtn?.addEventListener('click', prevSlide);
    nextBtn?.addEventListener('click', nextSlide);
    dots.forEach((dot, i) => dot.addEventListener('click', () => goToSlide(i)));

    // Handle manual scroll with debouncing
    container.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            const newSlide = Math.round(container.scrollLeft / getCardDistance());
            if (newSlide !== currentSlide && newSlide >= 0 && newSlide < totalSlides) {
                currentSlide = newSlide;
                updateUI();
            }
        }, 100);
    });

    // Initialize
    updateSlider();

    // Shake functionality
    cards.forEach(card => card.addEventListener('click', () => {
        const box = document.getElementById('shakeBox');
        if (box) {
            box.classList.remove('highlight-shake');
            void box.offsetWidth;
            box.classList.add('highlight-shake');
        }
    }));
});