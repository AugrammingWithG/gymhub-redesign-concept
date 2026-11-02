/* GymHub concept — page behaviour */
(function () {
  "use strict";
  var root = document.documentElement;
  root.classList.add("js");

  /* nav turns solid once the hero scrolls under it */
  var nav = document.getElementById("nav");
  function onScroll() { nav.classList.toggle("is-solid", window.scrollY > 24); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* results filter */
  var filters = document.querySelectorAll(".filter");
  var cards = document.querySelectorAll(".plate-card");
  filters.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var f = btn.dataset.filter;
      filters.forEach(function (b) {
        var on = b === btn;
        b.classList.toggle("is-on", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
      cards.forEach(function (c) { c.hidden = f !== "all" && c.dataset.plate !== f; });
    });
  });

  /* system: each step in view loads its plate */
  var steps = Array.prototype.slice.call(document.querySelectorAll(".step"));
  var countEl = document.getElementById("load-count");
  var readout = document.getElementById("load-readout");
  var loaded = -1;
  function setStep(n) {
    if (n === loaded) return;
    loaded = n;
    steps.forEach(function (s, i) { s.classList.toggle("is-active", i === n - 1); });
    if (countEl) countEl.textContent = n;
    if (readout) readout.firstChild.textContent = n === 6 ? "Locked in: " : "Bar loaded: ";
    if (window.GymBar && window.GymBar.system) window.GymBar.system.setLoaded(n);
  }
  /* the last step whose top has passed the trigger line is the active one,
     so jumps and anchor links land on the right load, not just smooth scrolls */
  var narrow = window.matchMedia("(max-width: 820px)");
  var queued = false;
  function syncStep() {
    queued = false;
    var line = window.innerHeight * (narrow.matches ? 0.74 : 0.55);
    var n = 0;
    steps.forEach(function (s, i) { if (s.getBoundingClientRect().top < line) n = i + 1; });
    setStep(n);
  }
  if (steps.length) {
    window.addEventListener("scroll", function () {
      if (!queued) { queued = true; requestAnimationFrame(syncStep); }
    }, { passive: true });
    window.addEventListener("resize", syncStep);
    syncStep();
  }
  document.addEventListener("gymbar:ready", function () {
    if (loaded > 0 && window.GymBar.system) window.GymBar.system.setLoaded(loaded);
  });

  /* Calendly loads only when asked for */
  var calBtn = document.getElementById("cal-load");
  if (calBtn) {
    calBtn.addEventListener("click", function () {
      var frame = document.getElementById("cal");
      var iframe = document.createElement("iframe");
      iframe.src = "https://calendly.com/stevegrant270/90day-growth-plan-with-steve?hide_gdpr_banner=1&background_color=ffffff&primary_color=d7261e";
      iframe.title = "Book a free 90-day gym growth plan call with Steve Grant";
      iframe.loading = "lazy";
      frame.innerHTML = "";
      frame.classList.add("is-loaded");
      frame.appendChild(iframe);
      iframe.focus();
    });
  }

  /* ebook form (concept: validates, then confirms without sending) */
  var form = document.getElementById("ebook");
  if (form) {
    var err = document.getElementById("eb-error");
    var done = document.getElementById("eb-done");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var problems = [];
      [["eb-name", "your first name"], ["eb-gym", "your gym’s name"], ["eb-email", "an email address"]].forEach(function (f) {
        var el = document.getElementById(f[0]);
        var bad = !el.value.trim() || (el.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim()));
        el.setAttribute("aria-invalid", bad ? "true" : "false");
        if (bad) problems.push(f[1]);
      });
      if (problems.length) {
        err.hidden = false;
        err.textContent = "Add " + problems.join(", ").replace(/, ([^,]*)$/, " and $1") + " so Steve can send the ebook.";
        form.querySelector("[aria-invalid='true']").focus();
        return;
      }
      err.hidden = true;
      form.classList.add("is-done");
      done.hidden = false;
      done.focus();
    });
  }

  /* redesign notes layer for the pitch */
  var toggle = document.getElementById("notes-toggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var on = toggle.getAttribute("aria-pressed") !== "true";
      toggle.setAttribute("aria-pressed", on ? "true" : "false");
      document.body.classList.toggle("notes-on", on);
    });
    if (/[?&]notes=1/.test(location.search)) toggle.click();
  }
})();
