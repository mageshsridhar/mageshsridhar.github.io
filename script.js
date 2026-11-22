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
    warmNeighbours();
  }

  // In the carousel a demo only starts downloading once its card is on screen,
  // so a freshly swiped-to card showed its still frame for a moment before the
  // video began. Download the cards either side of the current one ahead of
  // time, so the next video is ready when it slides in. Skipped on desktop
  // (every card is visible there), with reduced motion, and in data-saver mode.
  function warmNeighbours() {
    if (!matchMedia("(max-width: 899px)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (navigator.connection && navigator.connection.saveData) return;
    [current - 1, current + 1].forEach((i) => {
      const v = slides[i] && slides[i].querySelector("video");
      if (v && v.preload !== "auto") { v.preload = "auto"; v.load(); }
    });
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

// Phones and tablets (no hover): each certificate gets a little swing on its
// nail as you scroll it into view, as if the scroll had nudged the wall. The
// push follows the scroll direction, and it settles back to its usual tilt.
(() => {
  if (!matchMedia("(hover: none)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const frames = document.querySelectorAll(".hang");
  if (!frames.length || !("animate" in Element.prototype)) return;

  let lastY = scrollY, dir = 1;
  addEventListener("scroll", () => { dir = scrollY >= lastY ? 1 : -1; lastY = scrollY; }, { passive: true });

  function swing(el) {
    if (el._swinging) return;
    el._swinging = true;
    const tilt = parseFloat(getComputedStyle(el).getPropertyValue("--tilt")) || 0;
    // damped pendulum around the resting tilt: amplitude 3.2°, ~2.2 swings
    const steps = 48, frames = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const a = dir * 3.2 * Math.exp(-3.4 * t) * Math.sin(2 * Math.PI * 2.2 * t);
      frames.push({ transform: `rotate(${(tilt + a).toFixed(3)}deg)` });
    }
    frames[steps] = { transform: `rotate(${tilt}deg)` };
    const anim = el.animate(frames, { duration: 2200, easing: "linear" });
    anim.onfinish = anim.oncancel = () => { el._swinging = false; };
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) swing(e.target); });
  }, { threshold: 0.45 });
  frames.forEach((f) => io.observe(f));
})();

// Experience map: lays out the streets, puts the stops on corners, routes
// between them along the streets, and draws the route as you scroll.
(() => {
  if (!document.getElementById("xp-map")) return;
  const NS = "http://www.w3.org/2000/svg";
  const map = document.getElementById("xp-map");
  const streets = document.getElementById("xp-streets");
  const route = document.getElementById("xp-route");
  const [ahead, edge, line] = route.querySelectorAll("path");
  const pins = [...map.querySelectorAll(".xp-pin")];
  const places = [...map.querySelectorAll(".xp-place")];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let len = 1, stopAt = [];

  const el = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.append(e); return e; };

  // Lay out a small street grid, put the three stops on street corners, and
  // route between them along the streets (right-angle turns, rounded corners).
  function build() {
    const W = map.clientWidth, H = map.clientHeight, phone = W < 520;
    streets.setAttribute("viewBox", `0 0 ${W} ${H}`);
    route.setAttribute("viewBox", `0 0 ${W} ${H}`);
    streets.replaceChildren();

    // street lines: columns (avenues) and rows (streets)
    const cols = phone ? [0.08, 0.18, 0.62, 0.9].map((f) => Math.round(f * W)) : [0.09, 0.29, 0.47, 0.72, 0.92].map((f) => Math.round(f * W));
    const rows = [0.26, 0.41, 0.56, 0.71, 0.87].map((f) => Math.round(f * H));
    const roadW = phone ? 13 : 15;

    // blocks between streets, a couple of them parks and one a lake
    const xs = [0, ...cols, W], ys = [0, ...rows, H];
    for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < ys.length - 1; j++) {
      const x = xs[i] + roadW / 2 + 4, y = ys[j] + roadW / 2 + 4, w = xs[i + 1] - xs[i] - roadW - 8, h = ys[j + 1] - ys[j] - roadW - 8;
      if (w < 8 || h < 8) continue;
      const kind = (i === xs.length - 2 && j === 1) ? "xp-water" : ((i === 3 && j === 3) || (i === 0 && j === 5) || (i === 4 && j === 4)) ? "xp-park" : "xp-block";
      el("rect", { x, y, width: w, height: h, rx: kind === "xp-water" ? 22 : 8, class: kind }, streets);
    }
    const draw = (d, cls) => { el("path", { d, class: "xp-edge " + cls, "stroke-width": roadW + 2 }, streets); el("path", { d, class: "xp-road " + cls, "stroke-width": roadW }, streets); };
    cols.forEach((x, i) => draw(`M${x} 0V${H}`, i === 1 ? "xp-avenue" : ""));
    rows.forEach((y) => draw(`M0 ${y}H${W}`, ""));
    // street names written on the roads themselves (centred in the road, running
    // along it), on stretches the route, pins and cards don't cover
    const name = (t, x, y, vertical) => {
      const n = el("text", { x, y, "text-anchor": "middle", "dominant-baseline": "central",
        transform: vertical ? `rotate(-90 ${x} ${y})` : "" }, streets);
      n.textContent = t;
    };
    const mid = (a, b) => Math.round((a + b) / 2);
    name("University Dr", Math.round(W * (phone ? .8 : .82)), rows[1], false);
    name("Apache Blvd", Math.round(W * (phone ? .8 : .82)), rows[3], false);
    name("Mill Ave", cols[0], rows[2], true);   // the first avenue, between the route's two turns
    if (!phone) name("Rural Rd", cols[4], mid(rows[3], rows[4]), true);   // phones: the cards cover that road
    if (!phone) name("College Ave", cols[3], mid(rows[0], rows[1]), true);

    // the stops sit on street corners; the route runs down the first avenue,
    // across, down the second, and back across to the destination
    const [c1, c2] = [cols[0], phone ? cols[1] : cols[2]];   // desktop: stop 2 is one avenue further right
    const stops = [[c1, rows[0]], [c2, rows[2]], [c1, rows[4]]];
    const turns = [[c1, rows[0]], [c1, rows[1]], [c2, rows[1]], [c2, rows[2]], [c2, rows[3]], [c1, rows[3]], [c1, rows[4]]];
    const r = 16;
    let d = `M${turns[0][0]} ${turns[0][1]}`;
    for (let i = 1; i < turns.length - 1; i++) {
      const [px, py] = turns[i - 1], [x, y] = turns[i], [nx, ny] = turns[i + 1];
      const inx = Math.sign(x - px), iny = Math.sign(y - py), outx = Math.sign(nx - x), outy = Math.sign(ny - y);
      if (inx === outx && iny === outy) { d += ` L${x} ${y}`; continue; }   // straight through (a stop)
      d += ` L${x - inx * r} ${y - iny * r} Q${x} ${y} ${x + outx * r} ${y + outy * r}`;
    }
    d += ` L${turns.at(-1)[0]} ${turns.at(-1)[1]}`;
    [ahead, edge, line].forEach((p) => p.setAttribute("d", d));
    len = line.getTotalLength();
    stopAt = stops.map(([x, y]) => { let best = 0, bd = Infinity; for (let t = 0; t <= len; t += 3) { const p = line.getPointAtLength(t); const dd = (p.x - x) ** 2 + (p.y - y) ** 2; if (dd < bd) { bd = dd; best = t; } } return best; });
    [edge, line].forEach((p) => { p.style.strokeDasharray = `${len} ${len}`; });

    // pins on the corners, each place card to the right of its pin
    stops.forEach(([x, y], i) => {
      Object.assign(pins[i].style, { left: x + "px", top: y + "px" });
      const card = places[i], left = x + 30, maxW = W - left - 14;
      card.style.left = left + "px";
      card.style.width = Math.min(maxW, phone ? maxW : 400) + "px";
      card.style.top = y - card.offsetHeight / 2 + "px";
    });
    update();
  }

  // Draw the route as the map scrolls through the screen.
  const wrap = document.getElementById("xp-scroll");
  const stage = document.getElementById("xp-stage");
  const DRAW_SHARE = 1 / 1.5;   // share of the pinned scroll spent drawing (1 of 1.5 screens)
  function update() {
    // 0 when the title and map first pin, 1 once you've scrolled the extra distance
    const w = wrap.getBoundingClientRect(), stick = parseFloat(getComputedStyle(stage).top) || 0;
    let p = (stick - w.top) / (w.height - stage.offsetHeight);
    p = reduce ? 1 : Math.max(0, Math.min(1, p));
    // The route draws over the first screen of extra scroll; the last half
    // screen holds the finished route (all three stops) before the map unpins.
    const drawn = Math.min(1, p / DRAW_SHARE) * len;
    [edge, line].forEach((path) => { path.style.strokeDashoffset = `${len - drawn}`; });
    stopAt.forEach((at, i) => { const on = drawn >= at - 2; pins[i].classList.toggle("is-reached", on); places[i].classList.toggle("is-reached", on); });
  }

  addEventListener("scroll", () => requestAnimationFrame(update), { passive: true });
  addEventListener("resize", build);
  document.fonts.ready.then(build);
  addEventListener("load", build);
  build();
})();

// Interests Dock icons. Each sits still until hovered with a mouse (it loops
// while hovered, then finishes its cycle) or tapped on a touch screen (one
// cycle). The keyframes live in style.css as paused animations; this moves them
// along, and draws the two parts that need geometry or randomness: the camera's
// shutter press and aperture blades, and the tumbleweed's uneven hops.
(() => {
  const dock = document.querySelector(".dock");
  if (!dock) return;
  const camera = dock.querySelector(".app-photography svg");
  const tumble = dock.querySelector(".tw-y");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Camera: six blade edges, each from one corner of the opening past the next
  // corner out to the lens ring; shrinking and turning the opening swings the
  // blades closed. Pressing the shutter button closes them in the same motion,
  // the flash fires at the bottom of the press, a light click shows, and
  // releasing the button opens the blades again.
  const CX = 32, CY = 36.5, R = 8.5, OPEN = 5.4, SHUT = 1, PERIOD = 3400;
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const ramp = (u, a, b) => Math.min(1, Math.max(0, (u - a) / (b - a)));
  const blades = camera.querySelector(".blades"), shutter = camera.querySelector(".shutter");
  const flashWin = camera.querySelector(".flash-window"), click = camera.querySelector(".click");
  function drawCamera(u) {
    const k = ease(ramp(u, 0.2, 0.34)) - ease(ramp(u, 0.46, 0.66));
    const r = OPEN - (OPEN - SHUT) * k;
    const th = -0.3 + (OPEN - r) * 0.17;
    const V = [...Array(6)].map((_, i) => [r * Math.cos(th + (i * Math.PI) / 3), r * Math.sin(th + (i * Math.PI) / 3)]);
    let d = "";
    for (let i = 0; i < 6; i++) {
      const [px, py] = V[i], [qx, qy] = V[(i + 1) % 6];
      let dx = qx - px, dy = qy - py;
      const L = Math.hypot(dx, dy); dx /= L; dy /= L;
      const b = px * dx + py * dy, c = px * px + py * py - R * R;
      const t = -b + Math.sqrt(b * b - c);
      d += `M${(CX + px).toFixed(2)} ${(CY + py).toFixed(2)}L${(CX + px + dx * t).toFixed(2)} ${(CY + py + dy * t).toFixed(2)}`;
    }
    blades.setAttribute("d", d);
    shutter.setAttribute("transform", `translate(0 ${(k * 1.8).toFixed(2)})`);
    flashWin.setAttribute("fill-opacity", Math.max(0, 1 - Math.abs(u - 0.37) / 0.04).toFixed(3));
    const cl = ramp(u, 0.34, 0.46);
    click.setAttribute("opacity", (cl > 0 && cl < 1 ? 0.7 * (cl < 0.15 ? cl / 0.15 : 1 - (cl - 0.15) / 0.85) : 0).toFixed(3));
    click.setAttribute("transform", `translate(16.75 15.5) scale(${(0.85 + 0.3 * cl).toFixed(3)}) translate(-16.75 -15.5)`);
  }

  // Tumbleweed: each bounce gets its own height and length, with the odd low
  // skip, so the rhythm never repeats. Hops flatten out near the resting spot
  // (the ends of the cycle), so it always starts and stops on the ground.
  const ROLL = 4000;
  let hop = null;
  function drawTumble(t) {
    if (!hop || t < hop.start || t >= hop.start + hop.dur) {
      const skip = Math.random() < 0.3;
      const start = hop && t >= hop.start && t - (hop.start + hop.dur) < 100 ? hop.start + hop.dur : t;
      hop = { start, dur: skip ? 180 + Math.random() * 140 : 380 + Math.random() * 420, h: skip ? 0.6 + Math.random() * 1.2 : 2 + Math.random() * 4.5 };
    }
    const p = (t - hop.start) / hop.dur, at = t % ROLL;
    const flat = Math.min(1, at / 350, (ROLL - at) / 350);
    tumble.setAttribute("transform", `translate(0 ${(-hop.h * 4 * p * (1 - p) * flat).toFixed(2)})`);
  }

  drawCamera(0);   // a still, open lens
  if (reduce) return;

  // One cycle of each icon (ms), where in it to begin (skips the quiet lead-in,
  // so the icon answers straight away), and anything drawn by hand.
  const ICONS = {
    "app-percussion": { period: 3000, lead: 200 },
    "app-photography": { period: PERIOD, lead: PERIOD * 0.18, draw: (t) => drawCamera((t % PERIOD) / PERIOD) },
    "app-design": { period: 3200 },
    "app-parks": { period: ROLL, draw: drawTumble },
    "app-sunsets": { period: 5000 },
  };
  const EASE = 450;   // ms spent picking up speed and, on the last cycle, slowing to a stop

  Object.entries(ICONS).forEach(([name, { period, lead = 0, draw }]) => {
    const app = dock.querySelector("." + name);
    let t = 0, from = 0, last = 0, raf = 0, hovered = false, touch = false;

    function frame(now) {
      const left = period - (t % period);
      let rate = Math.min(1, 0.35 + (t - from) / EASE);
      if (!hovered) rate = Math.min(rate, Math.max(0.12, Math.sqrt(left / EASE)));
      const step = Math.min(100, now - last) * rate;
      last = now;
      const done = step >= left && !hovered;
      t = done ? Math.round((t + left) / period) * period : t + step;   // land exactly on the resting frame
      app.getAnimations({ subtree: true }).forEach((a) => {
        if (a.animationName && a.animationName.startsWith("di-")) a.currentTime = t + lead;
      });
      if (draw) draw(t + lead);
      raf = done ? 0 : requestAnimationFrame(frame);
    }
    function play() {
      if (raf) return;   // already going: let it finish
      from = t; last = performance.now();
      raf = requestAnimationFrame(frame);
    }

    // Decided per event, not per device, so an iPad with a trackpad gets hover.
    app.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") { hovered = true; play(); } });
    app.addEventListener("pointerleave", () => { hovered = false; });
    app.addEventListener("pointerdown", (e) => { touch = e.pointerType !== "mouse"; });
    app.addEventListener("click", () => { if (touch) play(); });   // a tap, not a scroll
  });
})();
