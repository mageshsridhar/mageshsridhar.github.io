// Footer year
document.getElementById("year").textContent = new Date().getFullYear();

// Project carousel: arrows, dots, keyboard
(() => {
  const track = document.querySelector(".track");
  const slides = [...track.querySelectorAll(".slide")];
  const dots = document.querySelector(".dots");
  let current = 0;

  slides.forEach((slide, i) => {
    const dot = document.createElement("button");
    dot.setAttribute("role", "tab");
    dot.setAttribute("aria-label", slide.querySelector("h3").textContent);
    dot.addEventListener("click", () => go(i));
    dots.appendChild(dot);
  });

  let settleTimer;

  function mark() {
    [...dots.children].forEach((d, i) => d.setAttribute("aria-selected", i === current));
  }

  function go(i) {
    current = (i + slides.length) % slides.length;
    track.scrollTo({ left: current * track.clientWidth, behavior: "smooth" });
    mark();
  }

  // Only read the position back once scrolling has settled (swipes / trackpad)
  function onScroll() {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => {
      current = Math.round(track.scrollLeft / track.clientWidth);
      mark();
    }, 120);
  }

  document.querySelector(".prev").addEventListener("click", () => go(current - 1));
  document.querySelector(".next").addEventListener("click", () => go(current + 1));
  track.addEventListener("scroll", onScroll, { passive: true });
  track.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") go(current + 1);
    if (e.key === "ArrowLeft") go(current - 1);
  });
  mark();
})();

// Hero "animations" Lottie (same file as the original Framer site)
(() => {
  const el = document.getElementById("hero-lottie");
  if (!el || !window.lottie) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const anim = lottie.loadAnimation({
    container: el,
    renderer: "svg",
    loop: !reduce,
    autoplay: !reduce,
    path: "assets/animations.json",
  });
  // With reduced motion, show the finished lettering instead of animating
  if (reduce) anim.addEventListener("DOMLoaded", () => anim.goToAndStop(anim.totalFrames - 1, true));
})();
