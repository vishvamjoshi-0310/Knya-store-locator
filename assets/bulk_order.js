document.addEventListener("DOMContentLoaded", function () {
    const steps = document.querySelectorAll(".bulk-order-steps .step-number");
    let current = 0;

    function activateNextStep() {
        if (current === steps.length - 1) {
            steps.forEach(step => step.classList.remove("active"));
            current = 0;
            setTimeout(() => {
                steps[current].classList.add("active");
                setTimeout(activateNextStep, 3000);
            }, 100);
        } else {
            current = current + 1;
            steps[current].classList.add("active");
            setTimeout(activateNextStep, 3000);
        }
    }

    activateNextStep();
});