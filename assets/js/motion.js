/* GymHub concept — scroll motion: headlines rise word by word, blocks stamp in on a stagger,
   columns and photos drift at their own depth. Runs before story.js so its reveal picks these up.
   The Rocket System section is left exactly as it was. */
(function () {
  "use strict";
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var root = document.documentElement;
  root.classList.add("motion-on");
  function all(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function outside(el) { return !el.closest("#system"); }

  /* ---------- headlines: each word rises out of its own mask ---------- */
  function word(content, i) {
    var w = document.createElement("span"), inner = document.createElement("span");
    w.className = "w"; inner.className = "w__i";
    inner.style.setProperty("--wi", i);
    inner.appendChild(content); w.appendChild(inner);
    return w;
  }
  var heroTitle = document.getElementById("hero-title");
  all("main h1.display, main h2.display, main h3.display").filter(outside).forEach(function (h) {
    var n = 0;
    Array.prototype.slice.call(h.childNodes).forEach(function (node) {
      if (node.nodeType === 3) {
        var frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          frag.appendChild(/^\s+$/.test(part) ? document.createTextNode(part) : word(document.createTextNode(part), n++));
        });
        h.replaceChild(frag, node);
      } else if (node.nodeType === 1 && node.tagName !== "BR" && !node.classList.contains("dash")) { // the dash keeps its spaces, so it stays inline
        var next = node.nextSibling;
        h.insertBefore(word(node, n++), next);
      }
    });
    h.setAttribute("data-split", "");
    if (h !== heroTitle) h.setAttribute("data-reveal", "");
  });

  /* ---------- blocks: stamp in on a stagger ---------- */
  [
    [".hero__lede, .hero__actions, .hero__fine, .hero .lift-try", 0.32, 0.1],
    [".onbar__intro, .results__intro, .steve__lede, .yourbar__lede, .close__lede, .promise, .filters, .pull, .steve__photo", 0, 0],
    [".rack > .plate-card", 0, 0.08, 3],
    [".record > div", 0, 0.09],
    [".awards > .award", 0, 0.09],
    [".callsteps > li", 0, 0.1],
    [".fit__col", 0, 0.1],
    [".extras__grid > *", 0, 0.1],
    [".faq__list > details", 0, 0.06],
    [".calc .field, .score, .calc__what", 0, 0.08],
    [".book__copy, .book__frame", 0, 0.1]
  ].forEach(function (g) {
    all(g[0]).filter(outside).forEach(function (el, i) {
      if (el.hasAttribute("data-reveal")) return;
      el.setAttribute("data-reveal", "");
      var k = g[3] ? i % g[3] : i;
      el.style.setProperty("--d", Math.min(0.5, g[1] + k * g[2]).toFixed(2) + "s");
    });
  });
  /* once stamped, drop the clip so focus rings and shadows are never cut */
  document.addEventListener("transitionend", function (e) {
    if (e.propertyName === "clip-path" && e.target.classList && e.target.classList.contains("in")) e.target.classList.add("done");
  });

  /* the hero headline rises as soon as its font is in */
  function heroIn() { requestAnimationFrame(function () { if (heroTitle) heroTitle.classList.add("in"); }); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(heroIn); else heroIn();
  setTimeout(heroIn, 1200);

  /* ---------- depth: scroll-linked drift ---------- */
  var narrow = window.matchMedia("(max-width: 820px)");
  var items = [];
  function drift(el, speed) { items.push({ el: el, speed: speed }); }
  all(".awards > .award").forEach(function (el, i) { drift(el, [0, 0.08, 0.03, 0.11][i % 4]); });
  all(".callsteps > li").forEach(function (el, i) { drift(el, [0, 0.05, 0.1][i % 3]); });
  var cards = all(".rack > .plate-card");
  cards.forEach(function (el) { drift(el, 0); });
  var photo = document.querySelector(".steve__photo img");
  var heroCopy = document.querySelector(".hero__copy");

  /* plate numbers count up as their card lands */
  var counts = all(".rack .plate__num").map(function (el) {
    var m = el.textContent.match(/^([^\d]*)([\d.,]+)(.*)$/);
    if (!m) return null;
    var dec = (m[2].split(".")[1] || "").length;
    return { el: el, card: el.closest(".plate-card"), pre: m[1], val: parseFloat(m[2].replace(/,/g, "")), dec: dec, post: m[3], text: el.textContent, done: false };
  }).filter(Boolean);
  counts.forEach(function (c) { c.el.textContent = c.pre + (0).toFixed(c.dec) + c.post; });
  function count(c) {
    c.done = true;
    var delay = parseFloat(c.card.style.getPropertyValue("--d")) * 1000 || 0, t0 = performance.now() + delay;
    (function step(t) {
      var p = Math.min(1, Math.max(0, (t - t0) / 1100)), e = 1 - Math.pow(1 - p, 3);
      c.el.textContent = p >= 1 ? c.text : c.pre + (c.val * e).toFixed(c.dec) + c.post;
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }

  var vh = window.innerHeight, queued = false;
  function measure() {
    vh = window.innerHeight;
    items.forEach(function (it) { it.el.style.setProperty("--py", "0px"); });
    var cols = {};
    items.forEach(function (it) {
      var r = it.el.getBoundingClientRect();
      it.top = r.top + window.scrollY; it.h = r.height; it.live = it.el.offsetParent !== null;
      if (cards.indexOf(it.el) > -1 && it.live) (cols[Math.round(r.left)] = cols[Math.round(r.left)] || []).push(it);
    });
    // rack columns drift at different depths: outer columns steady, the middle one floats
    Object.keys(cols).sort(function (a, b) { return a - b; }).forEach(function (x, ci, keys) {
      var s = keys.length < 2 ? 0 : [0, 0.12, 0.05, 0.1][ci % 4];
      cols[x].forEach(function (it) { it.speed = s; });
    });
    counts.forEach(function (c) { c.top = c.card.getBoundingClientRect().top + window.scrollY; });
    frame();
  }
  function frame() {
    queued = false;
    var y = window.scrollY, mid = y + vh / 2, k = narrow.matches ? 0.6 : 1;
    items.forEach(function (it) {
      if (!it.live || !it.speed || it.top > y + vh + 300 || it.top + it.h < y - 300) return;
      it.el.style.setProperty("--py", (-(it.top + it.h / 2 - mid) * it.speed * k).toFixed(1) + "px");
    });
    if (photo) {
      var pr = photo.getBoundingClientRect();
      if (pr.bottom > -100 && pr.top < vh + 100) photo.style.transform = "scale(1.14) translate3d(0," + (-(pr.top + pr.height / 2 - vh / 2) * 0.07).toFixed(1) + "px,0)";
    }
    if (heroCopy && y < vh * 1.2) { // the hero eases up and out under the ceiling
      var p = Math.min(1, y / (vh * 0.75));
      heroCopy.style.transform = y > 0 ? "translate3d(0," + (-y * 0.18).toFixed(1) + "px,0)" : "";
      heroCopy.style.opacity = (1 - p * p).toFixed(3);
    }
    counts.forEach(function (c) { if (!c.done && c.top < y + vh * 0.9) count(c); });
  }
  function onScroll() { if (!queued) { queued = true; requestAnimationFrame(frame); } }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", measure);
  window.addEventListener("load", measure);
  if (window.ResizeObserver) {
    var lastH = 0;
    new ResizeObserver(function () {
      var h = document.documentElement.scrollHeight;
      if (h !== lastH) { lastH = h; measure(); }
    }).observe(document.body);
  }
  measure();
})();
