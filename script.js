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
  const EYE_Y = 0.333;  // eye line as a fraction of the (cropped) photo's height
  const HAIR_Y = 0.079; // top of the hair, same units

  function frame() {
    const W = img.clientWidth, H = img.clientHeight;
    const iw = img.naturalWidth || 958, ih = img.naturalHeight || 950;
    if (!W || !H) return;
    const scale = Math.max(W / iw, H / ih);   // object-fit: cover
    const overflow = ih * scale - H;          // how much photo is cropped vertically
    if (overflow <= 0) return;
    let shift = Math.max(EYE_Y * ih * scale - H / 3, 0);
    // On wide frames that would cut into the hair: keep a little room above the head
    shift = Math.min(shift, Math.max(HAIR_Y * ih * scale - H * 0.04, 0), overflow);
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

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

  // Switch themes smoothly. Where View Transitions are supported, the new theme
  // spreads out in a circle from the toggle button; elsewhere colors cross-fade.
  function setTheme(next, origin) {
    const apply = () => { root.dataset.theme = next; label(); };
    if (reduceMotion.matches) return apply();

    if (document.startViewTransition && origin) {
      const r = origin.getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      const t = document.startViewTransition(apply);
      t.ready.then(() => {
        root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 600, easing: "cubic-bezier(.4, 0, .2, 1)", pseudoElement: "::view-transition-new(root)" }
        );
      }).catch(() => {});
      return;
    }

    root.classList.add("theme-fade");
    apply();
    setTimeout(() => root.classList.remove("theme-fade"), 450);
  }

  btn.addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    try { localStorage.setItem("theme", next); } catch (e) {}
    setTheme(next, btn);
  });

  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    let saved = null;
    try { saved = localStorage.getItem("theme"); } catch (err) {}
    if (!saved) setTheme(e.matches ? "dark" : "light");   // system switch: cross-fade
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

  // The slide nearest the middle of the track
  function nearest() {
    const mid = track.scrollLeft + track.clientWidth / 2;
    let best = 0, dist = Infinity;
    slides.forEach((s, i) => {
      const d = Math.abs(s.offsetLeft + s.offsetWidth / 2 - mid);
      if (d < dist) { dist = d; best = i; }
    });
    return best;
  }

  function go(i) {
    current = (i + slides.length) % slides.length;
    const s = slides[current];
    track.scrollTo({ left: s.offsetLeft + s.offsetWidth / 2 - track.clientWidth / 2, behavior: "smooth" });
    mark();
  }

  // Each card gets --p, its distance from the centre in card widths
  // (0 = centred, -1 = one card to the left), and --ap, the same without the
  // sign. CSS shrinks and blurs the side cards by that amount.
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  let raf = 0;
  function depth() {
    raf = 0;
    if (reduce.matches || getComputedStyle(track).overflowX !== "auto") return;
    const mid = track.scrollLeft + track.clientWidth / 2;
    slides.forEach((s) => {
      const p = Math.max(-1, Math.min(1, (s.offsetLeft + s.offsetWidth / 2 - mid) / (s.offsetWidth + 12)));
      s.style.setProperty("--p", p.toFixed(3));
      s.style.setProperty("--ap", Math.abs(p).toFixed(3));
    });
  }

  // Only read the position back once scrolling has settled (swipes / trackpad)
  function onScroll() {
    if (!raf) raf = requestAnimationFrame(depth);
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => {
      current = nearest();
      mark();
    }, 120);
  }
  addEventListener("resize", () => { if (!raf) raf = requestAnimationFrame(depth); });

  document.querySelector(".prev").addEventListener("click", () => go(current - 1));
  document.querySelector(".next").addEventListener("click", () => go(current + 1));
  track.addEventListener("scroll", onScroll, { passive: true });
  track.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") go(current + 1);
    if (e.key === "ArrowLeft") go(current - 1);
  });
  mark();
  depth();
})();

// Project demos: each video loads and plays only while its card is on screen,
// and pauses when it scrolls away. With reduced motion, the poster frame stays.
(() => {
  const videos = document.querySelectorAll("video.screen");
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting }) => {
      if (isIntersecting) target.play().catch(() => {});   // e.g. Low Power Mode: poster stays
      else target.pause();
    });
  }, { rootMargin: "200px" });
  videos.forEach((v) => io.observe(v));
})();
