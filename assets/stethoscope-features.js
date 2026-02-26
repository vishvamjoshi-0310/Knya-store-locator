document.addEventListener("DOMContentLoaded", function () {
  const tabs = document.querySelectorAll(".feature-tab");
  const contents = document.querySelectorAll(".feature-content");
  const dotsContainer = document.querySelector(".dots-container");
  const prevButton = document.querySelector(".stetho-feature-prev-icon");
  const nextButton = document.querySelector(".stetho-feature-next-icon");
  let currentIndex = 0;
  let interval;

  function getSlideInterval() {
    return window.innerWidth <= 768 ? 5000 : 3000;
  }

  function startAutoSlide() {
    if (!interval) {
      interval = setInterval(nextSlide, getSlideInterval());
    }
  }

  function stopAutoSlide() {
    clearInterval(interval);
    interval = null;
  }

  function updateActiveTab(index) {
    tabs.forEach(tab => tab.classList.remove("active"));
    contents.forEach(content => {
      content.style.opacity = "0";
      content.style.display = "none";
    });
    dots.forEach(dot => dot.classList.remove("active"));

    tabs[index].classList.add("active");
    contents[index].style.display = "flex";
    setTimeout(() => {
      contents[index].style.opacity = "1";
    }, 10);

    dots[index].classList.add("active");
  }

  function nextSlide() {
    currentIndex = (currentIndex + 1) % tabs.length;
    updateActiveTab(currentIndex);
  }

  function prevSlide() {
    currentIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    updateActiveTab(currentIndex);
  }

  // Generate dots dynamically
  if (tabs.length > 1) {
    tabs.forEach((_, index) => {
      const dot = document.createElement("span");
      dot.classList.add("dot");
      if (index === 0) dot.classList.add("active");
      dot.dataset.index = index;
      dotsContainer.appendChild(dot);
    });
  }

  const dots = document.querySelectorAll(".dot");

  updateActiveTab(0);
  startAutoSlide();

  tabs.forEach((tab, index) => {
    tab.addEventListener("mouseenter", function () {
      stopAutoSlide();
      currentIndex = index;
      updateActiveTab(currentIndex);
    });
  
    tab.addEventListener("mouseleave", function () {
      startAutoSlide();
    });
  });


  dots.forEach(dot => {
    dot.addEventListener("click", function () {
      stopAutoSlide();
      currentIndex = parseInt(this.dataset.index);
      updateActiveTab(currentIndex);
      startAutoSlide();
    });
  });

  prevButton.addEventListener("click", function () {
    stopAutoSlide();
    prevSlide();
    startAutoSlide();
  });

  nextButton.addEventListener("click", function () {
    stopAutoSlide();
    nextSlide();
    startAutoSlide();
  });

  window.addEventListener("resize", function () {
    stopAutoSlide();
    startAutoSlide();
  });
});