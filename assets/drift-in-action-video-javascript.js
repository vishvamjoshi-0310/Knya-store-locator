 document.addEventListener('DOMContentLoaded', function () {
    const videoContainer = document.querySelector('.drift-video-container');
    if (!videoContainer) return;

    const videos = videoContainer.querySelectorAll('.drift-video-container video');

    const videoObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target;

          if (entry.isIntersecting) {
            if (video.paused) {
              const playPromise = video.play();

              if (playPromise !== undefined) {
                playPromise.catch((error) => {
                  console.error('Autoplay was prevented', error);
                });
              }
            }
          } else {
            if (!video.paused) {
              video.pause();
            }
          }
        });
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: 0.5,
      }
    );

    videos.forEach((video) => {
      videoObserver.observe(video);
    });
  });