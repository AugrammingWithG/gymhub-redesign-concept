/* GymHub concept — the scroll story: one bar, one lift, top to bottom. */
(function () {
  "use strict";
  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var narrow = window.matchMedia("(max-width: 820px)");
  var nav = document.getElementById("nav");
  var canvas = document.getElementById("stage");
  var stage = null;

  root.classList.add("story-on");
  if (!reduce && !root.classList.contains("no-3d")) root.classList.add("story-pins");

  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href^='#']");
    if (!a) return;
    var id = a.getAttribute("href");
    var el = id.length > 1 && document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    var offset = -(nav ? nav.offsetHeight : 0);
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + offset, behavior: reduce ? "auto" : "smooth" });
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
    el.focus({ preventScroll: true });
    history.replaceState(null, "", id);
  });

  /* ---------- the one reveal: stamped in from below ---------- */
  var reveals = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));
  function reveal() {
    var line = window.innerHeight * 0.9;
    reveals = reveals.filter(function (el) {
      if (el.getBoundingClientRect().top < line) { el.classList.add("in"); return false; }
      return true;
    });
  }

  /* ---------- camera keys (desktop / phone) ---------- */
  function key(d, m, rest) {
    return { d: Object.assign({}, rest, d), m: Object.assign({}, rest, m) };
  }
  var K = {
    hero: key({ pos: [2.45, 0.6, 2.25], look: [0.05, 0.42, 0], fov: 30, ox: -0.24, oy: 0.07 },
              { pos: [2.6, 0.55, 0.62], look: [0.55, 0.3, 0], fov: 72, ox: 0, oy: -0.36, rack: 0 },
              { lift: 0, beamY: 0.44, warm: 0, op: 1, follow: 0, rack: 1 }),
    stuck: key({ pos: [2.45, 0.5, 0.9], look: [0.32, 0.42, 0], fov: 34, ox: -0.2, oy: -0.02 },
               { pos: [2.3, 0.6, 1.0], look: [0.4, 0.4, 0], fov: 52, ox: 0, oy: 0.24 },
               { lift: 0, beamY: 0.55, warm: 0, op: 1, follow: 0 }),
    freed: key({ pos: [2.45, 0.5, 0.9], look: [0.32, 0.42, 0], fov: 34, ox: -0.2, oy: -0.02 },
               { pos: [2.3, 0.6, 1.0], look: [0.4, 0.42, 0], fov: 52, ox: 0, oy: 0.24 },
               { lift: 0, beamY: 2.8, warm: 0.4, op: 1, follow: 0 }),
    risen: key({ pos: [2.45, 0.55, 0.9], look: [0.32, 0.5, 0], fov: 34, ox: -0.2, oy: -0.02 },
               { pos: [2.3, 0.65, 1.0], look: [0.4, 0.5, 0], fov: 54, ox: 0, oy: 0.2 },
               { lift: 0.42, beamY: 2.8, warm: 1, op: 1, follow: 0 }),
    onbar: key({ pos: [2.35, 0.5, 0.5], look: [0.66, 0.3, 0], fov: 30, ox: -0.24, oy: 0 },
               { pos: [2.1, 0.62, 0.75], look: [0.72, 0.3, 0], fov: 50, ox: 0, oy: 0.35 },
               { lift: 0, beamY: 2.8, warm: 0.3, op: 1, follow: 0 }),
    yours: key({ pos: [2.6, 0.55, 0.7], look: [0.55, 0.32, 0], fov: 36, ox: -0.25, oy: 0 },
               { pos: [2.2, 0.6, 1.1], look: [0.5, 0.32, 0], fov: 50, ox: 0, oy: 0.3 },
               { lift: 0, beamY: 2.8, warm: 0.3, op: 1, follow: 0 }),
    lift: key({ pos: [2.3, 0.6, 1.05], look: [0.3, 0.62, 0], fov: 44, ox: -0.18, oy: -0.12 },
              { pos: [2.2, 0.55, 1.4], look: [0.3, 0.45, 0], fov: 54, ox: 0, oy: 0.26 },
              { lift: 0, beamY: 2.8, warm: 0.6, op: 1, follow: 0.12 })
  };
  /* the hero rack fits the right half: squarer screens pull the camera back along its line of sight */
  var heroPos = K.hero.d.pos.slice();
  function fitHero() {
    var f = Math.max(1, Math.min(1.4, 2.15 / (window.innerWidth / window.innerHeight))), L = K.hero.d.look;
    K.hero.d.pos = heroPos.map(function (p, i) { return L[i] + (p - L[i]) * f; });
  }
  function hidden(k) { return { d: Object.assign({}, k.d, { op: 0 }), m: Object.assign({}, k.m, { op: 0 }) }; }
  /* the calculator bar backs away and sinks as the System's own bar takes over */
  K.gone = key({ pos: [3.2, 0.7, 1.1], look: [0.55, 0.36, 0], fov: 40, ox: -0.25, oy: 0.12 },
               { pos: [2.8, 0.75, 1.5], look: [0.5, 0.36, 0], fov: 56, ox: 0, oy: 0.42 },
               { lift: 0, beamY: 2.8, warm: 0.3, op: 0, follow: 0 });
  /* without pinning the problem/solution/reward rows run full width, so the stage sits that scene out */
  if (!root.classList.contains("story-pins")) { K.stuck = hidden(K.stuck); K.freed = hidden(K.freed); K.risen = hidden(K.risen); }

  /* ---------- the track: scroll positions mapped to keys ---------- */
  var S = {
    hero: document.getElementById("top"),
    ceiling: document.getElementById("ceiling"),
    onbar: document.getElementById("results"),
    rack: document.getElementById("rack-section"),
    steve: document.getElementById("steve"),
    yours: document.getElementById("your-bar"),
    system: document.getElementById("system"),
    close: document.getElementById("lift")
  };
  var track = [], marks = {};
  function top(el) { return el.getBoundingClientRect().top + window.scrollY; }
  function span(el) { return Math.max(1, el.offsetHeight - window.innerHeight); }
  function build() {
    fitHero();
    var vh = window.innerHeight, c = top(S.ceiling), cs = span(S.ceiling), o = top(S.onbar), os = span(S.onbar);
    var y = top(S.yours), yh = S.yours.offsetHeight, cl = top(S.close);
    marks = { c: c, cs: cs, o: o, os: os, rack: top(S.rack), y: y, yh: yh, sys: top(S.system), cl: cl };
    track = [
      [0, K.hero],
      [c - vh * 0.55, K.hero],
      [c, K.stuck],
      [c + cs * 0.3, K.stuck],
      [c + cs * 0.48, K.freed],
      [c + cs * 0.62, K.freed],
      [c + cs * 0.82, K.risen],
      [c + cs, K.risen],
      [o, K.onbar],
      [o + os, K.onbar],
      [marks.rack - vh * 0.15, hidden(K.onbar)],
      [y - vh * 0.6, hidden(K.yours)],
      [y - vh * 0.1, K.yours],
      [y + yh - vh * 0.95, K.yours],
      [y + yh - vh * 0.5, K.gone],
      [cl - vh * 0.75, hidden(K.lift)],
      [cl - vh * 0.2, K.lift],
      [Infinity, K.lift]
    ];
    chapterTops = chapters.map(top);
  }

  function smooth(t) { return t * t * (3 - 2 * t); }
  function mix(a, b, t) { return a + (b - a) * t; }
  function viewAt(yPos) {
    var m = narrow.matches ? "m" : "d", i = 0;
    while (i < track.length - 2 && yPos > track[i + 1][0]) i++;
    var A = track[i], B = track[i + 1];
    var t = B[0] === A[0] || B[0] === Infinity ? 0 : Math.min(1, Math.max(0, (yPos - A[0]) / (B[0] - A[0])));
    t = reduce ? Math.round(t) : smooth(t);
    var a = A[1][m], b = B[1][m];
    return {
      pos: [mix(a.pos[0], b.pos[0], t), mix(a.pos[1], b.pos[1], t), mix(a.pos[2], b.pos[2], t)],
      look: [mix(a.look[0], b.look[0], t), mix(a.look[1], b.look[1], t), mix(a.look[2], b.look[2], t)],
      fov: mix(a.fov, b.fov, t), ox: mix(a.ox, b.ox, t), oy: mix(a.oy, b.oy, t),
      lift: mix(a.lift, b.lift, t), beamY: mix(a.beamY, b.beamY, t), warm: mix(a.warm, b.warm, t),
      op: mix(a.op, b.op, t), rack: mix(a.rack || 0, b.rack || 0, t), follow: t < 0.5 ? a.follow : b.follow
    };
  }

  /* ---------- chapter state from scroll ---------- */
  var rows = Array.prototype.slice.call(document.querySelectorAll(".lift__row"));
  var bars = Array.prototype.slice.call(document.querySelectorAll(".onbar__item"));
  var chapters = Array.prototype.slice.call(document.querySelectorAll(".chapter"));
  var progressPlates = Array.prototype.slice.call(document.querySelectorAll(".minibar__plates i"));
  var calcDirty = true;
  var sysStage = document.querySelector(".system__stage"), sysCanvas = document.getElementById("system-bar");

  var chapterTops = [];

  function activate(list, n) { list.forEach(function (el, i) { el.classList.toggle("is-active", i === n); }); }

  var queued = false;
  function update() {
    queued = false;
    var yPos = window.scrollY, vh = window.innerHeight;
    if (reveals.length) reveal();

    var cp = (yPos - marks.c) / marks.cs;
    activate(rows, cp < 0.38 ? 0 : cp < 0.66 ? 1 : 2);

    var op = (yPos - marks.o) / marks.os;
    var beats = [0.1, 0.3, 0.5, 0.7].filter(function (b) { return op >= b; }).length;
    activate(bars, beats - 1);
    bars.forEach(function (el, i) { el.classList.toggle("is-loaded", i < beats); });

    if (nav) nav.classList.toggle("is-solid", yPos > 24);
    document.body.classList.toggle("at-close", yPos > marks.cl - vh * 0.6);
    chapterTops.forEach(function (t, i) {
      if (progressPlates[i]) progressPlates[i].classList.toggle("on", yPos + vh * 0.5 >= t);
    });

    if (sysCanvas && !reduce) { // the System bar rises in once the stage bar has cleared
      var sp = Math.min(1, Math.max(0, (vh - sysStage.getBoundingClientRect().top) / (vh * 0.45)));
      sp = smooth(sp);
      sysCanvas.style.opacity = sp.toFixed(3);
      sysCanvas.style.transform = sp < 1 ? "translateY(" + ((1 - sp) * 48).toFixed(1) + "px)" : "";
    }

    if (!stage) return;
    var v = viewAt(yPos);
    Object.assign(stage.view, v);
    canvas.style.opacity = v.op.toFixed(3);
    var showing = v.op > 0.01;
    if (showing !== stage.visible) { stage.visible = showing; }

    if (yPos < marks.o - vh * 0.4) stage.showPlan("gym");
    else if (yPos < marks.y - vh) stage.showPlan("results", 2 + beats);
    else if (yPos < marks.cl - vh) {
      if (calcDirty) loadCalc(); else stage.showPlan("calc");
    } else stage.showPlan("finale");

    if (showing) stage.request();
  }
  function onScroll() { if (!queued) { queued = true; requestAnimationFrame(update); } }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", function () { build(); onScroll(); });
  window.addEventListener("load", function () { build(); onScroll(); });
  /* fonts and images settle after load and move every section; re-measure when the page height changes */
  if (window.ResizeObserver) {
    var lastH = 0;
    new ResizeObserver(function () {
      var h = document.documentElement.scrollHeight;
      if (h !== lastH) { lastH = h; build(); onScroll(); }
    }).observe(document.body);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { build(); onScroll(); });

  /* ---------- hold to lift ---------- */
  function Lift(btn) {
    var mode = btn.dataset.lift, msg = document.getElementById(btn.getAttribute("aria-describedby"));
    var label = btn.querySelector(".lift-btn__label");
    var holding = false, p = 0, state = "idle", last = 0, held = false;
    var word = document.querySelector(".ceiling-word");

    function contact() { return stage.view.beamY - 0.014 - window.GymBarKit.R - stage.view.lift; }
    function set(y) { stage.hold.y = y; stage.request(); }
    function animate(from, to, dur, ease, done) {
      var t0 = performance.now();
      stage.busy = true;
      (function step(now) {
        var k = Math.min(1, (now - t0) / (reduce ? 1 : dur));
        set(from + (to - from) * ease(k));
        if (k < 1) requestAnimationFrame(step); else { stage.busy = false; if (done) done(); }
      })(t0);
    }
    function dropFrom(y, done) {
      animate(y, 0, 380 + y * 300, function (k) { return k * k; }, function () {
        if (y > 0.05 && !reduce) { stage.shake = 0.7; stage.burst(0.8, 0.02, 0.1, 0.6); stage.burst(-0.8, 0.02, 0.1, 0.6); }
        state = "idle"; if (done) done();
      });
    }
    function slam() {
      state = "slam";
      if (!reduce) {
        stage.shake = 1.8;
        stage.burst(0.45, stage.view.beamY, 0, 0.8); stage.burst(-0.45, stage.view.beamY, 0, 0.8);
      }
      if (word) { word.classList.remove("is-hit"); void word.offsetWidth; word.classList.add("is-hit"); }
      msg.textContent = "That’s your ceiling. Scroll down to see how owners broke through.";
      label.textContent = "Try again";
      setTimeout(function () { dropFrom(stage.hold.y); }, reduce ? 0 : 140);
    }
    function success() {
      state = "up";
      animate(stage.hold.y, 0.62, 650, function (k) { return 1 - Math.pow(1 - k, 3); }, function () {
        if (!reduce) { stage.burst(0.8, 0.85, 0, 1); stage.burst(-0.8, 0.85, 0, 1); stage.shake = 0.5; }
      });
      msg.textContent = "Lifted. Now plan yours on a free call with Steve.";
      label.textContent = "Lift again";
      var cta = document.querySelector(".close__cta");
      if (cta) cta.classList.add("is-ready");
    }
    function loop(now) {
      if (!holding || state !== "rising") return;
      var dt = Math.min(0.12, (now - last) / 1000); last = now;
      p = reduce ? 1 : Math.min(1, p + dt / 0.9);
      btn.style.setProperty("--p", p.toFixed(3));
      var target = mode === "slam" ? contact() : 0.5;
      var strain = reduce ? 0 : (Math.random() - 0.5) * 0.006 * p;
      set(target * p * p + strain);
      if (!reduce) stage.shake = Math.max(stage.shake, 0.12 * p);
      if (p >= 1) { holding = false; btn.classList.remove("is-holding"); btn.style.setProperty("--p", 0); if (mode === "slam") slam(); else success(); return; }
      requestAnimationFrame(loop);
    }
    function press() {
      if (!stage || holding) return;
      if (state === "up") { state = "busy"; dropFrom(stage.hold.y); return; }
      if (state !== "idle") return;
      holding = true; held = true; state = "rising"; p = 0; last = performance.now();
      btn.classList.add("is-holding");
      stage.busy = true;
      requestAnimationFrame(loop);
    }
    function release() {
      if (!holding) return;
      holding = false;
      btn.classList.remove("is-holding");
      btn.style.setProperty("--p", 0);
      if (state === "rising") { state = "busy"; stage.busy = false; dropFrom(stage.hold.y); }
    }
    btn.addEventListener("pointerdown", function (e) { e.preventDefault(); if (btn.setPointerCapture) btn.setPointerCapture(e.pointerId); press(); });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (t) { btn.addEventListener(t, release); });
    btn.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    btn.addEventListener("keydown", function (e) {
      if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); press(); }
    });
    btn.addEventListener("keyup", function (e) { if (e.key === " " || e.key === "Enter") { e.preventDefault(); release(); } });
    btn.addEventListener("click", function (e) { e.preventDefault(); if (!held && !stage) msg.textContent = "Your browser can’t show the 3D bar, but the ceiling is real. Scroll on."; held = false; });
  }

  /* ---------- load your bar ---------- */
  var mIn = document.getElementById("calc-members"), pIn = document.getElementById("calc-price");
  var calcErr = document.getElementById("calc-error");
  var out = {
    now: document.getElementById("calc-now"), nowRev: document.getElementById("calc-now-rev"),
    goal: document.getElementById("calc-goal"), goalRev: document.getElementById("calc-goal-rev"),
    what: document.getElementById("calc-what"), plates: document.getElementById("calc-plates")
  };
  var calc = { sideKg: 72 };
  function money(v) { return v >= 1e6 ? "$" + (v / 1e6).toFixed(v >= 1e7 ? 0 : 1).replace(/\.0$/, "") + "M" : "$" + Math.round(v / 1000) + "K"; }
  function kg(v) { return (v < 10 ? Math.round(v * 10) / 10 : Math.round(v)).toLocaleString("en-AU") + " kg"; }
  function readCalc() {
    var m = Math.round(Number(mIn.value)), pr = Number(pIn.value);
    var bad = [];
    if (!(m >= 1 && m <= 20000)) bad.push("members between 1 and 20,000");
    if (!(pr >= 1 && pr <= 2000)) bad.push("a monthly price between $1 and $2,000");
    mIn.setAttribute("aria-invalid", m >= 1 && m <= 20000 ? "false" : "true");
    pIn.setAttribute("aria-invalid", pr >= 1 && pr <= 2000 ? "false" : "true");
    if (bad.length) { calcErr.hidden = false; calcErr.textContent = "Enter " + bad.join(" and ") + "."; return; }
    calcErr.hidden = true;
    var yearly = m * pr * 12, nowKg = yearly / 1000, more = Math.ceil(100000 / 12 / pr);
    out.now.textContent = kg(nowKg); out.nowRev.textContent = money(yearly) + " a year";
    out.goal.textContent = kg(nowKg + 100); out.goalRev.textContent = money(yearly + 100000) + " a year";
    out.what.innerHTML = "+100 kg is two red plates a side. At $" + pr.toLocaleString("en-AU") +
      " a month that’s about <b>" + more.toLocaleString("en-AU") + " more members</b>, or the same revenue from pricing, retention and PT.";
    calc.sideKg = nowKg / 2;
    calcDirty = true;
    out.plates.innerHTML = "";
    var left = Math.floor(calc.sideKg / 2.5) * 2.5;
    [[25, "red"], [20, "blue"], [15, "yellow"], [10, "green"], [5, "white"], [2.5, "collar"]].forEach(function (k) {
      while (left >= k[0] && out.plates.children.length < 12) { var i = document.createElement("i"); i.setAttribute("data-plate", k[1]); out.plates.appendChild(i); left -= k[0]; }
    });
    ["goal", "goal"].forEach(function () { var i = document.createElement("i"); i.setAttribute("data-plate", "red"); i.className = "goal"; out.plates.appendChild(i); });
    onScroll();
  }
  function loadCalc() {
    calcDirty = false;
    var r = stage.loadCalc(calc.sideKg);
    if (r.shown < r.total) out.what.insertAdjacentHTML("beforeend", " <span class=\"calc__cap\">The bar shows the first " + r.shown + " plates a side.</span>");
  }
  var calcTimer;
  [mIn, pIn].forEach(function (el) {
    if (!el) return;
    el.addEventListener("input", function () { clearTimeout(calcTimer); calcTimer = setTimeout(readCalc, 280); });
  });
  var calcForm = document.getElementById("calc");
  if (calcForm) calcForm.addEventListener("submit", function (e) { e.preventDefault(); readCalc(); });

  /* ---------- boot ---------- */
  function boot() {
    stage = window.GymBar && window.GymBar.stage;
    if (stage) {
      stage.busy = false;
      document.querySelectorAll(".lift-btn").forEach(Lift);
    } else {
      document.querySelectorAll(".lift-btn").forEach(function (b) { b.hidden = true; });
    }
    build();
    update();
  }
  if (mIn) readCalc();
  build();
  update();
  if (window.GymBar && window.GymBar.stage) boot();
  else document.addEventListener("gymbar:ready", boot);
  if (root.classList.contains("no-3d")) boot();
})();
