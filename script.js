// Footer year
document.getElementById("year").textContent = new Date().getFullYear();

// Bento cards: a glow that follows the cursor (mouse/trackpad only)
(() => {
  if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  // The glow eases toward the pointer each frame, so it drifts after the cursor
  // rather than snapping to it.
  document.querySelectorAll(".bento .slide").forEach((card) => {
    let x = 0, y = 0, tx = 0, ty = 0, raf = 0;
    const set = () => {
      card.style.setProperty("--mx", `${x}px`);
      card.style.setProperty("--my", `${y}px`);
    };
    const step = () => {
      x += (tx - x) * 0.12;
      y += (ty - y) * 0.12;
      set();
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.5 ? requestAnimationFrame(step) : 0;
    };
    const target = (e) => {
      const r = card.getBoundingClientRect();
      tx = e.clientX - r.left;
      ty = e.clientY - r.top;
    };
    card.addEventListener("pointerenter", (e) => { target(e); x = tx; y = ty; set(); });
    card.addEventListener("pointermove", (e) => {
      target(e);
      if (!raf) raf = requestAnimationFrame(step);
    });
  });
})();

// Hero photo: keep the eyes on the top rule-of-thirds line at any size.
(() => {
  const img = document.querySelector(".hero-photo");
  if (!img) return;
  const EYE_Y = 0.406; // eye line as a fraction of the photo's height (y ≈ 832 of 2048)

  function frame() {
    const W = img.clientWidth, H = img.clientHeight;
    const iw = img.naturalWidth || 1365, ih = img.naturalHeight || 2048;
    if (!W || !H) return;
    const scale = Math.max(W / iw, H / ih);   // object-fit: cover
    const overflow = ih * scale - H;          // how much photo is cropped vertically
    if (overflow <= 0) return;
    const shift = Math.min(Math.max(EYE_Y * ih * scale - H / 3, 0), overflow);
    img.style.objectPosition = `50% ${(shift / overflow) * 100}%`;
  }

  new ResizeObserver(frame).observe(img);
  img.addEventListener("load", frame);
  frame();
})();

// Light / dark toggle. A click saves the choice; until then the site follows the system setting.
(() => {
  const root = document.documentElement;
  const btn = document.querySelector(".theme-toggle");
  const label = () =>
    btn.setAttribute("aria-label", root.dataset.theme === "dark" ? "Switch to light mode" : "Switch to dark mode");

  btn.addEventListener("click", () => {
    root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
    try { localStorage.setItem("theme", root.dataset.theme); } catch (e) {}
    label();
  });

  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    let saved = null;
    try { saved = localStorage.getItem("theme"); } catch (err) {}
    if (!saved) { root.dataset.theme = e.matches ? "dark" : "light"; label(); }
  });
  label();
})();

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
