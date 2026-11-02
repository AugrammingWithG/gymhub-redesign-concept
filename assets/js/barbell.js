/* GymHub concept — WebGL barbell scenes (Three.js r149, global build). */
(function () {
  "use strict";
  var root = document.documentElement;

  function hasWebGL() {
    try {
      var c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
    } catch (e) { return false; }
  }
  if (!window.THREE || !hasWebGL()) { root.classList.add("no-3d"); return; }

  var T = window.THREE;
  T.ColorManagement.legacyMode = false;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* competition plate spec: colour, thickness (m), ink */
  var PLATES = {
    red: { color: "#d7261e", t: 0.054, ink: "#ffffff" },
    blue: { color: "#1f55b5", t: 0.046, ink: "#ffffff" },
    yellow: { color: "#f2c200", t: 0.038, ink: "#171717" },
    green: { color: "#1b7d3d", t: 0.032, ink: "#ffffff" },
    white: { color: "#f2f2ee", t: 0.028, ink: "#171717" }
  };
  var R = 0.225;            // plate radius (450 mm)
  var SLEEVE_START = 0.688; // inside face of the sleeve
  var SLEEVE_END = 1.1;

  var FONT = "Archivo, system-ui, sans-serif";

  /* ---------- textures ---------- */
  function knurlTexture() {
    var c = document.createElement("canvas");
    c.width = c.height = 128;
    var g = c.getContext("2d");
    g.fillStyle = "#808080"; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = "#1a1a1a"; g.lineWidth = 3;
    for (var i = -128; i < 256; i += 16) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 128, 128); g.stroke();
      g.beginPath(); g.moveTo(i + 128, 0); g.lineTo(i, 128); g.stroke();
    }
    var t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.repeat.set(3, 70);
    return t;
  }

  function fitFont(g, text, weight, max, maxW) {
    var size = max;
    do {
      g.font = weight + " " + size + "px " + FONT;
      size -= 4;
    } while (g.measureText(text).width > maxW && size > 20);
  }

  function faceTexture(top, bottom, ink) {
    var S = 1024, c = document.createElement("canvas");
    c.width = c.height = S;
    var g = c.getContext("2d");
    try { g.fontStretch = "expanded"; } catch (e) { /* older canvas */ }
    g.textAlign = "center"; g.textBaseline = "middle";
    var shade = ink === "#ffffff" ? "rgba(0,0,0,.28)" : "rgba(255,255,255,.35)";

    // raised ring near the rim
    g.strokeStyle = ink === "#ffffff" ? "rgba(255,255,255,.18)" : "rgba(0,0,0,.16)";
    g.lineWidth = 6;
    g.beginPath(); g.arc(S / 2, S / 2, 488, 0, Math.PI * 2); g.stroke();

    // main stamp, upper annulus
    fitFont(g, top, "900", 190, 640);
    g.fillStyle = shade; g.fillText(top, S / 2 + 3, 168 + 4);
    g.fillStyle = ink; g.fillText(top, S / 2, 168);

    // unit, lower annulus
    if (bottom) {
      fitFont(g, bottom.toUpperCase(), "750", 70, 560);
      g.fillStyle = ink; g.globalAlpha = 0.92;
      g.fillText(bottom.toUpperCase(), S / 2, S - 176);
      g.globalAlpha = 1;
    }

    // side brand marks
    g.font = "800 46px " + FONT;
    g.fillStyle = ink; g.globalAlpha = 0.55;
    [[-1, -Math.PI / 2], [1, Math.PI / 2]].forEach(function (s) {
      g.save(); g.translate(S / 2 + s[0] * 372, S / 2); g.rotate(s[1]);
      g.fillText("GYMHUB", 0, 0); g.restore();
    });
    g.globalAlpha = 1;

    var t = new T.CanvasTexture(c);
    t.encoding = T.sRGBEncoding;
    t.anisotropy = 8;
    return t;
  }

  /* ---------- environment (a dim gym with strip lights) ---------- */
  function buildEnv(renderer) {
    var room = new T.Scene();
    var box = new T.Mesh(new T.BoxGeometry(12, 6, 12), new T.MeshBasicMaterial({ color: 0x34383d, side: T.BackSide }));
    room.add(box);
    var floor = new T.Mesh(new T.PlaneGeometry(12, 12), new T.MeshBasicMaterial({ color: 0x141516 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -2.95; room.add(floor);
    var strip = new T.MeshBasicMaterial({ color: 0xffffff });
    [-3.5, -1, 1.5, 4].forEach(function (z) {
      var m = new T.Mesh(new T.BoxGeometry(9, 0.1, 0.6), strip);
      m.position.set(0, 2.9, z); room.add(m);
    });
    var panel = new T.MeshBasicMaterial({ color: 0xc9cdd1 });
    var wallA = new T.Mesh(new T.PlaneGeometry(4, 2.4), panel);
    wallA.position.set(5.9, 0.8, 0); wallA.rotation.y = -Math.PI / 2; room.add(wallA);
    var wallB = new T.Mesh(new T.PlaneGeometry(5, 2), new T.MeshBasicMaterial({ color: 0x8a9096 }));
    wallB.position.set(0, 0.6, 5.9); wallB.rotation.y = Math.PI; room.add(wallB);
    var pm = new T.PMREMGenerator(renderer);
    var env = pm.fromScene(room, 0.03).texture;
    pm.dispose();
    return env;
  }

  /* ---------- geometry ---------- */
  var shared = null;
  function getShared() {
    if (shared) return shared;
    shared = {
      knurl: knurlTexture(),
      chrome: new T.MeshStandardMaterial({ color: 0xf2f4f5, metalness: 1, roughness: 0.18 }),
      steel: new T.MeshStandardMaterial({ color: 0xb4bbbf, metalness: 1, roughness: 0.3 }),
      dark: new T.MeshStandardMaterial({ color: 0x1c1e20, metalness: 0.4, roughness: 0.5 })
    };
    shared.shaft = new T.MeshStandardMaterial({
      color: 0xbcc3c7, metalness: 1, roughness: 0.42, bumpMap: shared.knurl, bumpScale: 0.9
    });
    return shared;
  }

  function cyl(r, len, mat, x) {
    var m = new T.Mesh(new T.CylinderGeometry(r, r, len, 48, 1), mat);
    m.rotation.z = Math.PI / 2; m.position.x = x || 0;
    m.castShadow = true;
    return m;
  }

  function makeBar() {
    var s = getShared(), g = new T.Group();
    g.add(cyl(0.014, 1.31, s.shaft, 0));
    [-1, 1].forEach(function (d) {
      g.add(cyl(0.0275, 0.03, s.chrome, d * 0.672));           // shoulder
      g.add(cyl(0.025, SLEEVE_END - SLEEVE_START, s.chrome, d * (SLEEVE_START + SLEEVE_END) / 2));
      g.add(cyl(0.0265, 0.012, s.steel, d * (SLEEVE_END + 0.004))); // end cap
    });
    return g;
  }

  function makePlate(kind, top, bottom) {
    var spec = PLATES[kind], s = getShared(), t = spec.t, h = t / 2, hr = h * 0.78;
    var g = new T.Group();
    var rubberPts = [
      [0.0858, -hr], [0.186, -hr], [0.199, -h], [0.219, -h], [R, -h + 0.005],
      [R, h - 0.005], [0.219, h], [0.199, h], [0.186, hr], [0.0858, hr], [0.0858, -hr]
    ].map(function (p) { return new T.Vector2(p[0], p[1]); });
    var rubber = new T.Mesh(
      new T.LatheGeometry(rubberPts, 96),
      new T.MeshStandardMaterial({ color: spec.color, roughness: 0.58, metalness: 0, side: T.DoubleSide, envMapIntensity: 0.55 })
    );
    rubber.rotation.z = -Math.PI / 2;
    rubber.castShadow = true;
    g.add(rubber);

    var hubPts = [[0.0262, -h * 0.86], [0.0858, -h * 0.86], [0.0858, h * 0.86], [0.0262, h * 0.86], [0.0262, -h * 0.86]]
      .map(function (p) { return new T.Vector2(p[0], p[1]); });
    var hub = new T.Mesh(new T.LatheGeometry(hubPts, 64), s.chrome);
    hub.rotation.z = -Math.PI / 2;
    g.add(hub);

    if (top) {
      var decal = new T.Mesh(
        new T.RingGeometry(0.0875, 0.1872, 96, 1),
        new T.MeshStandardMaterial({
          map: faceTexture(top, bottom, spec.ink), transparent: true, roughness: 0.6,
          polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false
        })
      );
      decal.rotation.y = Math.PI / 2;
      decal.position.x = hr + 0.0009;
      g.add(decal);
    }
    g.userData.t = t;
    return g;
  }

  function makeCollar() {
    var s = getShared(), g = new T.Group();
    g.add(cyl(0.04, 0.052, s.chrome, 0));
    g.add(cyl(0.046, 0.012, s.steel, -0.02));
    g.add(cyl(0.046, 0.012, s.steel, 0.02));
    g.userData.t = 0.052;
    return g;
  }

  /* ---------- easing ---------- */
  function easeSettle(t) { // heavy slide with a small rebound off the stack
    var s = 1.15;
    t = t - 1;
    return t * t * ((s + 1) * t + s) + 1;
  }

  /* ---------- scene ---------- */
  function BarScene(canvas, opts) {
    this.canvas = canvas;
    this.opts = opts;
    this.visible = false;
    this.pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    this.shake = 0;
    this.items = [];
    this.clock = new T.Clock();

    var r = this.renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    r.outputEncoding = T.sRGBEncoding;
    r.toneMapping = T.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true;
    r.shadowMap.type = T.VSMShadowMap;

    var sc = this.scene = new T.Scene();
    sc.environment = buildEnv(r);

    this.camera = new T.PerspectiveCamera(opts.fov || 26, 1, 0.05, 40);

    sc.add(new T.HemisphereLight(0xdfe6ea, 0x0c0d0e, 0.35));
    var key = new T.DirectionalLight(0xffffff, 2.4);
    key.position.set(1.6, 3.4, 2.2);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.radius = 9; key.shadow.blurSamples = 16;
    key.shadow.bias = -0.0004;
    var sc2 = key.shadow.camera; sc2.left = -1.6; sc2.right = 1.6; sc2.top = 1.6; sc2.bottom = -1.6; sc2.near = 0.5; sc2.far = 8;
    sc.add(key);
    var rim = new T.DirectionalLight(0xbfd0ff, 1.1);
    rim.position.set(-2.5, 1.6, -2.4);
    sc.add(rim);

    var floor = new T.Mesh(new T.PlaneGeometry(10, 10), new T.ShadowMaterial({ opacity: 0.6 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    sc.add(floor);

    this.rig = new T.Group();
    this.rig.position.y = R;
    this.rig.add(makeBar());
    sc.add(this.rig);

    this.resize = this.resize.bind(this);
    this.tick = this.tick.bind(this);
    window.addEventListener("resize", this.resize);
    this.resize();

    var self = this;
    new IntersectionObserver(function (en) {
      self.visible = en[0].isIntersecting;
      if (self.visible) { self.clock.getDelta(); requestAnimationFrame(self.tick); }
    }, { rootMargin: "80px" }).observe(canvas);

    if (opts.parallax && !reduceMotion) {
      window.addEventListener("pointermove", function (e) {
        self.pointer.tx = e.clientX / window.innerWidth - 0.5;
        self.pointer.ty = e.clientY / window.innerHeight - 0.5;
      }, { passive: true });
    }
  }

  /* Add a plate pair (near + mirrored far side). slot = stacking order on the sleeve. */
  BarScene.prototype.addPair = function (make) {
    var near = make(true), far = make(false);
    far.rotation.y = Math.PI;
    this.rig.add(near); this.rig.add(far);
    var item = { near: near, far: far, t: near.userData.t, x: 0, from: 0, to: 0, start: 0, dur: 0.75, on: false };
    this.items.push(item);
    this.place(item, SLEEVE_END + 0.5);
    item.to = item.x;
    near.visible = far.visible = false;
    return item;
  };

  BarScene.prototype.place = function (item, x) {
    item.x = x;
    item.near.position.x = x;
    item.far.position.x = -x;
  };

  /* Resolve stacked targets for every loaded item, in slot order. */
  BarScene.prototype.layout = function () {
    var cursor = SLEEVE_START + 0.002;
    this.clock.getDelta();
    var now = this.clock.elapsedTime;
    var delay = 0;
    for (var i = 0; i < this.items.length; i++) {
      var it = this.items[i];
      var target = it.on ? cursor + it.t / 2 : SLEEVE_END + 0.55 + i * 0.02;
      if (it.on) cursor += it.t + 0.003;
      if (Math.abs(target - it.to) > 1e-4 || (it.on && !it.near.visible)) {
        if (it.on && !it.near.visible) { this.place(it, SLEEVE_END + 0.45); it.near.visible = it.far.visible = true; }
        it.from = it.x; it.to = target; it.start = now + delay; it.landed = false;
        if (it.on) delay += this.opts.stagger || 0;
      }
    }
    if (reduceMotion) this.items.forEach(function (it) { it.start = -10; });
    requestAnimationFrame(this.tick);
  };

  BarScene.prototype.setLoaded = function (n) {
    for (var i = 0; i < this.items.length; i++) this.items[i].on = i < n;
    this.layout();
  };

  BarScene.prototype.resize = function () {
    var w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    var frame = this.opts.frame(w / h, w);
    this.frameSpec = frame;
    this.camera.fov = frame.fov;
    this.camera.clearViewOffset();
    if (frame.offsetY || frame.offsetX) this.camera.setViewOffset(w, h, (frame.offsetX || 0) * w, (frame.offsetY || 0) * h, w, h);
    this.camera.updateProjectionMatrix();
    if (!this.visible) this.renderOnce();
  };

  BarScene.prototype.renderOnce = function () {
    var f = this.frameSpec;
    this.camera.position.set(f.pos[0], f.pos[1], f.pos[2]);
    this.camera.lookAt(f.look[0], f.look[1], f.look[2]);
    this.renderer.render(this.scene, this.camera);
  };

  BarScene.prototype.tick = function () {
    if (!this.visible) return;
    this.clock.getDelta();
    var now = this.clock.elapsedTime, moving = false, self = this;

    this.items.forEach(function (it) {
      if (it.x === it.to) return;
      var p = (now - it.start) / it.dur;
      if (p <= 0) { moving = true; return; }
      if (p >= 1) {
        self.place(it, it.to);
        if (!it.on) { it.near.visible = it.far.visible = false; }
        else if (!it.landed) { it.landed = true; if (!reduceMotion) self.shake = 1; }
        return;
      }
      moving = true;
      var e = it.on ? easeSettle(p) : p * p;
      self.place(it, it.from + (it.to - it.from) * e);
    });

    var f = this.frameSpec, pt = this.pointer;
    pt.x += (pt.tx - pt.x) * 0.05; pt.y += (pt.ty - pt.y) * 0.05;
    var drift = reduceMotion ? 0 : Math.sin(now * 0.25) * 0.03;
    this.shake *= 0.86;
    var sk = this.shake > 0.01 ? (Math.random() - 0.5) * 0.006 * this.shake : 0;
    this.camera.position.set(
      f.pos[0] + pt.x * 0.22 + drift,
      f.pos[1] - pt.y * 0.12 + sk,
      f.pos[2] + pt.x * -0.12
    );
    this.camera.lookAt(f.look[0], f.look[1] + sk * 0.5, f.look[2]);
    this.renderer.render(this.scene, this.camera);

    var settling = this.shake > 0.01 || Math.abs(pt.tx - pt.x) > 0.001 || Math.abs(pt.ty - pt.y) > 0.001;
    if (moving || settling || (this.opts.parallax && !reduceMotion)) requestAnimationFrame(this.tick);
  };

  window.GymBarKit = { T: T, makePlate: makePlate, buildEnv: buildEnv, R: R };

  /* ---------- the two scenes ---------- */
  function init() {
    var api = {};
    var heroCanvas = document.getElementById("hero-bar");
    if (heroCanvas) {
      var hero = new BarScene(heroCanvas, {
        parallax: true, stagger: 0.16, fov: 24,
        frame: function (a, w) {
          if (w < 700) return { fov: 25, pos: [2.5, 0.5, 0.42], look: [0.72, 0.27, 0], offsetX: -0.12, offsetY: 0.02 };
          if (a < 1.3) return { fov: 30, pos: [1.9, 0.36, 1.9], look: [0.0, 0.42, 0], offsetX: 0.08, offsetY: -0.13 };
          return { fov: 27, pos: [1.85, 0.3, 1.95], look: [-0.05, 0.42, 0], offsetX: 0.1, offsetY: -0.13 };
        }
      });
      [
        ["red", "+$550K", "revenue / yr"],
        ["blue", "+309", "members"],
        ["yellow", "202", "leads"],
        ["green", "+70%", "profit"]
      ].forEach(function (p) {
        hero.addPair(function (isNear) { return makePlate(p[0], isNear ? p[1] : "GYMHUB", isNear ? p[2] : ""); });
      });
      hero.addPair(function () { return makeCollar(); });
      hero.items.forEach(function (it) { it.dur = 0.85; });
      hero.renderOnce();
      setTimeout(function () { hero.setLoaded(5); }, reduceMotion ? 0 : 350);
      api.hero = hero;
    }

    var sysCanvas = document.getElementById("system-bar");
    if (sysCanvas) {
      var sys = new BarScene(sysCanvas, {
        parallax: false, stagger: 0.08, fov: 26,
        frame: function (a) {
          if (a > 1.6) return { fov: 24, pos: [2.25, 0.55, 1.15], look: [0.55, 0.24, 0], offsetY: 0 };
          if (a > 1) return { fov: 27, pos: [2.15, 0.6, 1.25], look: [0.6, 0.24, 0], offsetY: 0 };
          return { fov: 32, pos: [2.0, 0.66, 1.3], look: [0.68, 0.22, 0], offsetY: 0 };
        }
      });
      [
        ["red", "SALES", "step 1"],
        ["blue", "RETAIN", "step 2"],
        ["yellow", "LEADS", "step 3"],
        ["green", "TEAM", "step 4"],
        ["white", "SYSTEMS", "step 5"]
      ].forEach(function (p) {
        sys.addPair(function (isNear) { return makePlate(p[0], isNear ? p[1] : "GYMHUB", isNear ? p[2] : ""); });
      });
      sys.addPair(function () { return makeCollar(); });
      sys.renderOnce();
      api.system = sys;
    }
    window.GymBar = api;
    document.dispatchEvent(new CustomEvent("gymbar:ready"));
  }

  var fontReady = document.fonts && document.fonts.load ? document.fonts.load("900 100px Archivo") : Promise.resolve();
  Promise.race([fontReady, new Promise(function (r) { setTimeout(r, 1500); })]).then(init, init);
})();
