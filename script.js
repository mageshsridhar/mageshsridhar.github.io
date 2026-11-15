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

// Typewriter in the hero
(() => {
  const el = document.querySelector(".typed");
  if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const words = el.dataset.words.split("|");
  let w = 0, i = words[0].length, deleting = true;

  function tick() {
    const word = words[w];
    el.textContent = word.slice(0, i) || "​";
    if (deleting) {
      i--;
      if (i < 0) { deleting = false; w = (w + 1) % words.length; i = 0; }
    } else {
      i++;
      if (i > words[w].length) { deleting = true; i = words[w].length; return setTimeout(tick, 2200); }
    }
    setTimeout(tick, deleting ? 40 : 80);
  }
  setTimeout(tick, 2500);
})();
