function toggleFAQ(item) {
  const answer = item.querySelector(".faq-answer");
  const isOpen = item.classList.contains("open");

  document.querySelectorAll(".faq-item").forEach(faq => {
    if (faq !== item) {
      faq.classList.remove("open");
      faq.querySelector(".faq-answer").style.maxHeight = null;
    }
  });

  if (!isOpen) {
    item.classList.add("open");
    answer.style.maxHeight = (answer.scrollHeight + 50) + "px";
  } else {
    item.classList.remove("open");
    answer.style.maxHeight = null;
  }
}