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
    // the active dot takes the colour of the card on screen
    dots.style.setProperty("--dot", getComputedStyle(slides[current]).getPropertyValue("--tint"));
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
      const p = Math.max(-1, Math.min(1, (s.offsetLeft + s.offsetWidth / 2 - mid) / (s.offsetWidth + 8)));
      s.style.setProperty("--p", p.toFixed(3));
      s.style.setProperty("--ap", Math.abs(p).toFixed(3));
    });
  }

  // The dot follows the card nearest the centre live, every frame of a swipe,
  // so it changes as soon as the next card passes the middle.
  let liveRaf = 0;
  function liveDot() {
    liveRaf = 0;
    const i = nearest();
    if (i !== current) { current = i; mark(); }
  }

  function onScroll() {
    if (!raf) raf = requestAnimationFrame(depth);
    if (!liveRaf) liveRaf = requestAnimationFrame(liveDot);
    // and once more after scrolling settles, in case the last frame was missed
    clearTimeout(settleTimer);
    settleTimer = setTimeout(liveDot, 120);
  }
  addEventListener("resize", () => { if (!raf) raf = requestAnimationFrame(depth); });

  // Where supported (Chrome/Edge), the browser announces which card a swipe
  // will snap to as soon as it knows, before the card has moved there:
  // switch the dot right away.
  const wrappers = [...track.querySelectorAll(".snap")];
  track.addEventListener("scrollsnapchanging", (e) => {
    const i = wrappers.indexOf(e.snapTargetInline);
    if (i >= 0 && i !== current) { current = i; mark(); }
  });

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

// Phone menu: the floating button grows into a panel with the avatar, theme
// switch and section links. It closes on a link tap, Escape, a tap outside, or
// when the screen gets wider.
(() => {
  const header = document.querySelector(".nav");
  const btn = document.querySelector(".menu-toggle");
  const nav = document.getElementById("site-nav");
  if (!btn || !nav) return;

  // the panel's open height, measured at its open width
  function measure() {
    // Measure with transitions off, and settle back to the closed size before
    // turning them on again; otherwise the measuring itself starts a shrink
    // animation and the grow skips straight to the end.
    header.style.transition = "none";
    header.classList.add("measuring");
    header.style.setProperty("--open-h", header.offsetHeight + "px");
    header.classList.remove("measuring");
    void header.offsetWidth;
    header.style.transition = "";
  }

  function setOpen(open) {
    if (open) measure();
    header.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", open);
    btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }
  const isOpen = () => header.classList.contains("open");

  btn.addEventListener("click", (e) => {
    setOpen(!isOpen());
    // keyboard users (Enter/Space give detail 0) land on the first link
    if (isOpen() && e.detail === 0) nav.querySelector("a").focus({ preventScroll: true });
  });
  header.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });   // section links and the avatar
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen()) { setOpen(false); btn.focus(); }
  });
  document.addEventListener("click", (e) => { if (isOpen() && !header.contains(e.target)) setOpen(false); });
  matchMedia("(min-width: 601px)").addEventListener("change", (e) => { if (e.matches) setOpen(false); });
})();

// In-page links (nav, avatar): a slow, eased glide to the section. The
// browser's own smooth scroll is short and quick, so the scroll is animated
// here: 1.3–2s depending on distance, easing in and out. The section lands
// below the sticky bar (the scroll-padding-top set in the CSS). Touching or
// wheeling the page cancels it; with reduced motion it jumps straight there.
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const root = document.documentElement;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);   // ease-in-out cubic
  let raf = 0;

  function stop() {
    cancelAnimationFrame(raf); raf = 0;
    root.style.scrollBehavior = "";
    removeEventListener("wheel", stop); removeEventListener("touchstart", stop); removeEventListener("keydown", stop);
  }

  function glideTo(target) {
    stop();
    const pad = parseFloat(getComputedStyle(root).scrollPaddingTop) || 0;
    const max = root.scrollHeight - innerHeight;
    const from = scrollY;
    const to = Math.max(0, Math.min(max, target.getBoundingClientRect().top + scrollY - pad));
    const dist = Math.abs(to - from);
    if (reduce.matches || dist < 2) return scrollTo(0, to);
    const duration = Math.min(2000, 1300 + dist * 0.15);
    root.style.scrollBehavior = "auto";   // per-frame scrollTo must not be smoothed again
    addEventListener("wheel", stop, { passive: true });
    addEventListener("touchstart", stop, { passive: true });
    addEventListener("keydown", stop);
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / duration);
      scrollTo(0, from + (to - from) * ease(t));
      if (t < 1) raf = requestAnimationFrame(step); else stop();
    };
    raf = requestAnimationFrame(step);
  }

  document.addEventListener("click", (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const id = link.getAttribute("href").slice(1);
    const target = id ? document.getElementById(id) : null;
    if (!target) return;
    e.preventDefault();
    glideTo(target);
    history.pushState(null, "", "#" + id);
  });
})();

// Footer: the current time in Tempe (Arizona time, no daylight saving),
// refreshed every 20 seconds. Without JS the line just says where.
(() => {
  const el = document.getElementById("local-time");
  if (!el) return;
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/Phoenix", hour: "numeric", minute: "2-digit" });
  const tick = () => { el.textContent = fmt.format(new Date()); };
  tick();
  el.parentElement.hidden = false;
  setInterval(tick, 20000);
})();
