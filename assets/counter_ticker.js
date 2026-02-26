document.addEventListener("DOMContentLoaded", () => {
    function counter(id, start, end, duration) {
        const obj = document.getElementById(id);
        if (!obj) return;

        let current = start;
        const range = end - start;
        const increment = end > start ? 1 : -1;
        const step = Math.abs(Math.floor(duration / range));

        const timer = setInterval(() => {
            current += increment;
            obj.textContent = current;
            if (current === end) {
                clearInterval(timer);
            }
        }, step);
    }

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const ticker = entry.target;
                const span = ticker.querySelector('span[id]');
                if (!span) return;

                const id = span.id;
                const endValue = parseInt(span.dataset.count, 10);
                if (!isNaN(endValue)) {
                    const baseDuration = Math.min(endValue * 20, 4000); // Cap at 4 seconds max
                    const duration = Math.max(baseDuration, 2000); // Minimum 1 second
                    counter(id, 0, endValue, duration);
                    obs.unobserve(ticker);
                }
            }
        });
    }, {
        threshold: 1.0 // fully visible
    });

    document.querySelectorAll('.enable-ticker').forEach(ticker => {
        observer.observe(ticker);
    });
});