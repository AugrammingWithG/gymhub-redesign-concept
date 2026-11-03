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
    yellow: { color: "#f5e600", t: 0.038, ink: "#171717" },
    green: { color: "#21a567", t: 0.032, ink: "#ffffff" },
    white: { color: "#f2f2ee", t: 0.028, ink: "#171717" },
    black: { color: "#16233f", t: 0.06, ink: "#c5cfe6" },
    change: { color: "#aeb6ba", t: 0.02, ink: "#171717", small: 0.118 }
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

  var faceCache = {};
  function faceTexture(top, bottom, ink) {
    var cacheKey = top + "|" + bottom + "|" + ink;
    if (faceCache[cacheKey]) return faceCache[cacheKey];
    var S = 512, c = document.createElement("canvas");
    var k = S / 1024;
    c.width = c.height = S;
    var g = c.getContext("2d");
    try { g.fontStretch = "expanded"; } catch (e) { /* older canvas */ }
    g.scale(k, k); S = 1024;
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
    t.anisotropy = 4;
    faceCache[cacheKey] = t;
    return t;
  }

  /* ---------- environment (a dim gym with strip lights) ---------- */
  function buildEnv(renderer) {
    var room = new T.Scene();
    var box = new T.Mesh(new T.BoxGeometry(12, 6, 12), new T.MeshBasicMaterial({ color: 0x34383d, side: T.BackSide }));
    room.add(box);
    var floor = new T.Mesh(new T.PlaneGeometry(12, 12), new T.MeshBasicMaterial({ color: 0x061a3c }));
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
    var wallC = new T.Mesh(new T.PlaneGeometry(8, 2.6), panel);
    wallC.position.set(0, 0.9, -5.9); room.add(wallC);
    var wallD = new T.Mesh(new T.PlaneGeometry(6, 2.2), new T.MeshBasicMaterial({ color: 0x9aa0a6 }));
    wallD.position.set(-5.9, 0.8, 0); wallD.rotation.y = Math.PI / 2; room.add(wallD);
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
      chrome: new T.MeshStandardMaterial({ color: 0xf2f4f5, metalness: 1, roughness: 0.26, side: T.DoubleSide }),
      steel: new T.MeshStandardMaterial({ color: 0xb4bbbf, metalness: 1, roughness: 0.3 }),
      dark: new T.MeshStandardMaterial({ color: 0x1c1e20, metalness: 0.4, roughness: 0.5 })
    };
    shared.shaft = new T.MeshStandardMaterial({
      color: 0xbcc3c7, metalness: 1, roughness: 0.42, bumpMap: shared.knurl, bumpScale: 2.2
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
    if (spec.small) {
      var disc = new T.Mesh(new T.LatheGeometry([[0.0262, -h], [spec.small, -h], [spec.small, h], [0.0262, h], [0.0262, -h]]
        .map(function (p) { return new T.Vector2(p[0], p[1]); }), 64), s.steel);
      disc.rotation.z = -Math.PI / 2; disc.castShadow = true;
      g.add(disc);
      g.userData.t = t;
      return g;
    }
    var rubberPts = [
      [0.0858, -hr], [0.186, -hr], [0.199, -h], [0.219, -h], [R, -h + 0.005],
      [R, h - 0.005], [0.219, h], [0.199, h], [0.186, hr], [0.0858, hr], [0.0858, -hr]
    ].map(function (p) { return new T.Vector2(p[0], p[1]); });
    var rubber = new T.Mesh(
      new T.LatheGeometry(rubberPts, 64),
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
        new T.RingGeometry(0.0875, 0.1872, 64, 1),
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

  /* Show everything once to upload textures and compile shaders up front. */
  BarScene.prototype.prewarm = function () {
    var r = this.renderer, hidden = [];
    this.scene.traverse(function (o) {
      if (!o.visible) { hidden.push(o); o.visible = true; }
      if (o.material && o.material.map) r.initTexture(o.material.map);
    });
    r.compile(this.scene, this.camera);
    hidden.forEach(function (o) { o.visible = false; });
  };

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
    this.view = opts.view || null;
    this.visible = false;
    this.pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    this.shake = 0;
    this.items = [];
    this.clock = new T.Clock();

    var r = this.renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
    r.outputEncoding = T.sRGBEncoding;
    r.toneMapping = T.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true;
    r.shadowMap.type = T.PCFSoftShadowMap;

    var sc = this.scene = new T.Scene();
    sc.environment = buildEnv(r);

    this.camera = new T.PerspectiveCamera(opts.fov || 26, 1, 0.05, 40);

    sc.add(new T.HemisphereLight(0xdfe6f5, 0x061a3c, 0.4));
    var key = new T.DirectionalLight(0xffffff, 2.4);
    key.position.set(1.6, 3.4, 2.2);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.0004;
    var sc2 = key.shadow.camera; sc2.left = -1.6; sc2.right = 1.6; sc2.top = 1.6; sc2.bottom = -1.6; sc2.near = 0.5; sc2.far = 8;
    sc.add(key);
    this.key = key;
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
      if (self.visible) { self.clock.getDelta(); self.request(); }
    }, { rootMargin: "80px" }).observe(canvas);

    if (opts.parallax && !reduceMotion) {
      window.addEventListener("pointermove", function (e) {
        self.pointer.tx = e.clientX / window.innerWidth - 0.5;
        self.pointer.ty = e.clientY / window.innerHeight - 0.5;
        if (self.visible) self.request();
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
    // off screen there is nothing to watch: snap, so plans never cross mid-slide when the stage fades back in
    if (reduceMotion || !this.visible) this.items.forEach(function (it) { it.start = -10; });
    this.request();
  };

  BarScene.prototype.request = function () {
    if (!this.raf) this.raf = requestAnimationFrame(this.tick);
  };

  /* Plates live in named plans; showing a plan slides its first n plates on and the rest off. */
  BarScene.prototype.definePlan = function (id, items) {
    (this.plans || (this.plans = {}))[id] = items;
    return items;
  };

  BarScene.prototype.showPlan = function (id, n) {
    var plan = this.plans && this.plans[id];
    if (!plan) return;
    if (n == null) n = plan.length;
    if (this.planId === id && this.planN === n) return;
    this.planId = id; this.planN = n;
    this.items.forEach(function (it) { it.on = false; });
    plan.forEach(function (it, i) { it.on = i < n; });
    this.layout();
  };

  /* Remove a plan's plates once they have slid off. */
  BarScene.prototype.dropItems = function (items) {
    var self = this;
    items.forEach(function (it) {
      self.rig.remove(it.near); self.rig.remove(it.far);
      var k = self.items.indexOf(it);
      if (k > -1) self.items.splice(k, 1);
    });
  };

  /* Chalk dust: a short-lived particle burst at a world point. */
  BarScene.prototype.burst = function (x, y, z, amount) {
    if (reduceMotion) return;
    var n = Math.round(140 * (amount || 1));
    var pos = new Float32Array(n * 3), vel = [];
    for (var i = 0; i < n; i++) {
      pos[i * 3] = x + (Math.random() - 0.5) * 0.06;
      pos[i * 3 + 1] = y + (Math.random() - 0.5) * 0.04;
      pos[i * 3 + 2] = z + (Math.random() - 0.5) * 0.06;
      var a = Math.random() * Math.PI * 2, sp = 0.25 + Math.random() * 0.9;
      vel.push(Math.cos(a) * sp, 0.3 + Math.random() * 0.9, Math.sin(a) * sp);
    }
    var geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.BufferAttribute(pos, 3));
    var pts = new T.Points(geo, new T.PointsMaterial({ color: 0xf2f2ee, size: 0.011, transparent: true, opacity: 0.9, depthWrite: false }));
    this.scene.add(pts);
    (this.dust || (this.dust = [])).push({ pts: pts, vel: vel, born: this.clock.elapsedTime, life: 1.3 });
    this.request();
  };

  /* A steel beam above the bar: the ceiling. */
  function brushedTexture() { // horizontal grain for rolled steel
    var c = document.createElement("canvas");
    c.width = 1024; c.height = 64;
    var g = c.getContext("2d");
    g.fillStyle = "#8a8f94"; g.fillRect(0, 0, 1024, 64);
    for (var i = 0; i < 900; i++) {
      var y = Math.random() * 64, l = 40 + Math.random() * 400, x = Math.random() * 1024;
      g.strokeStyle = Math.random() < 0.5 ? "rgba(30,32,35," + (0.02 + Math.random() * 0.05) + ")" : "rgba(220,224,228," + (0.02 + Math.random() * 0.05) + ")";
      g.lineWidth = 0.6 + Math.random() * 1.2;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y + (Math.random() - 0.5) * 0.8); g.stroke();
    }
    for (var k = 0; k < 6; k++) { // faint mill-scale blotches
      g.fillStyle = "rgba(40,42,46," + (0.04 + Math.random() * 0.05) + ")";
      g.beginPath(); g.ellipse(Math.random() * 1024, Math.random() * 64, 60 + Math.random() * 120, 6 + Math.random() * 10, 0, 0, Math.PI * 2); g.fill();
    }
    var t = new T.CanvasTexture(c);
    t.wrapS = T.MirroredRepeatWrapping; t.wrapT = T.RepeatWrapping; // mirrored so tile edges always meet
    t.repeat.set(2, 1);
    t.encoding = T.sRGBEncoding;
    t.anisotropy = 8;
    return t;
  }

  BarScene.prototype.addCeiling = function () {
    var grain = brushedTexture();
    var steel = new T.MeshStandardMaterial({ color: 0x9ea4a9, map: grain, metalness: 0.8, roughness: 0.38, envMapIntensity: 1.15 });
    var bolt = getShared().steel;
    var beam = new T.Group();
    [[0.012, 0.006], [0.012, 0.094]].forEach(function (f) { // bottom and top flanges
      var m = new T.Mesh(new T.BoxGeometry(7, f[0], 0.11), steel);
      m.position.y = f[1]; m.castShadow = true; beam.add(m);
    });
    var web = new T.Mesh(new T.BoxGeometry(7, 0.08, 0.014), steel);
    web.position.y = 0.05; web.castShadow = true; beam.add(web);
    var plateMat = new T.MeshStandardMaterial({ color: 0x6f757a, metalness: 0.7, roughness: 0.5 });
    [-1.9, -0.7, 0.7, 1.9].forEach(function (x) { // bolted splice plates on both faces of the web
      [-1, 1].forEach(function (side) {
        var sp = new T.Mesh(new T.BoxGeometry(0.17, 0.066, 0.008), plateMat);
        sp.position.set(x, 0.05, side * 0.011); beam.add(sp);
        [[-0.055, 0.025], [0.055, 0.025], [-0.055, -0.025], [0.055, -0.025]].forEach(function (b) {
          var head = new T.Mesh(new T.CylinderGeometry(0.008, 0.008, 0.008, 6), bolt);
          head.rotation.x = Math.PI / 2; head.position.set(x + b[0], 0.05 + b[1], side * 0.019); beam.add(head);
        });
      });
    });
    this.scene.add(beam);
    this.beam = beam;
    return beam;
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
    if (this.view) { this._w = -1; this.request(); return; }
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
    this.raf = null;
    if (!this.visible) return;
    this.clock.getDelta();
    var now = this.clock.elapsedTime, moving = false, self = this;

    if (this.view) this.applyView();

    if (this.dust && this.dust.length) {
      this.dust = this.dust.filter(function (d) {
        var age = now - d.born, arr = d.pts.geometry.attributes.position.array, dt = 1 / 60;
        if (age > d.life) { self.scene.remove(d.pts); d.pts.geometry.dispose(); d.pts.material.dispose(); return false; }
        for (var i = 0; i < d.vel.length; i += 3) {
          d.vel[i + 1] -= 2.4 * dt; d.vel[i] *= 0.985; d.vel[i + 2] *= 0.985;
          arr[i] += d.vel[i] * dt; arr[i + 1] = Math.max(0.002, arr[i + 1] + d.vel[i + 1] * dt); arr[i + 2] += d.vel[i + 2] * dt;
        }
        d.pts.geometry.attributes.position.needsUpdate = true;
        d.pts.material.opacity = 0.9 * (1 - age / d.life);
        moving = true;
        return true;
      });
    }

    this.items.forEach(function (it) {
      if (it.x === it.to) return;
      var p = (now - it.start) / it.dur;
      if (p <= 0) { moving = true; return; }
      if (p >= 1) {
        self.place(it, it.to);
        if (!it.on) { it.near.visible = it.far.visible = false; }
        else if (!it.landed) { it.landed = true; if (!reduceMotion && !self.view) self.shake = 1; } // the stage close-ups stay steady
        return;
      }
      moving = true;
      var e = it.on ? easeSettle(p) : p * p;
      self.place(it, it.from + (it.to - it.from) * e);
    });

    var f = this.view || this.frameSpec, pt = this.pointer;
    var hy = this.view ? (this.hold ? this.hold.y : 0) * (this.view.follow || 0) : 0;
    pt.x += (pt.tx - pt.x) * 0.05; pt.y += (pt.ty - pt.y) * 0.05;
    var drift = 0;
    this.shake *= 0.86;
    var sk = this.shake > 0.01 ? (Math.random() - 0.5) * 0.006 * this.shake : 0;
    var par = this.view ? 0.5 : 1;
    this.camera.position.set(
      f.pos[0] + (pt.x * 0.22 + drift) * par,
      f.pos[1] - pt.y * 0.12 * par + sk + hy * 0.6,
      f.pos[2] + pt.x * -0.12 * par
    );
    this.camera.lookAt(f.look[0], f.look[1] + sk * 0.5 + hy, f.look[2]);
    this.renderer.render(this.scene, this.camera);

    var settling = this.shake > 0.01 || Math.abs(pt.tx - pt.x) > 0.001 || Math.abs(pt.ty - pt.y) > 0.001;
    if (moving || settling || this.busy) this.request();
  };

  /* Stage only: camera, lift, ceiling and light come from an externally driven view object. */
  BarScene.prototype.applyView = function () {
    var v = this.view, w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (v.fov !== this._fov || v.ox !== this._ox || v.oy !== this._oy || w !== this._w || h !== this._h) {
      this._fov = v.fov; this._ox = v.ox; this._oy = v.oy; this._w = w; this._h = h;
      this.camera.fov = v.fov;
      this.camera.setViewOffset(w, h, (v.ox || 0) * w, (v.oy || 0) * h, w, h);
      this.camera.updateProjectionMatrix();
    }
    this.rig.position.y = R + (v.lift || 0) + (this.hold ? this.hold.y : 0);
    if (this.beam) { this.beam.position.y = v.beamY; this.beam.visible = v.beamY < 2.4; }
    var warm = v.warm || 0;
    this.renderer.toneMappingExposure = 1.05 + warm * 0.14;
    if (this.key) this.key.color.setRGB(1, 1 - warm * 0.08, 1 - warm * 0.2);
  };

  window.GymBarKit = { T: T, makePlate: makePlate, buildEnv: buildEnv, R: R, PLATES: PLATES };

  /* ---------- the two scenes ---------- */
  function init() {
    var api = {};
    var stageCanvas = document.getElementById("stage");
    if (stageCanvas) {
      var small = window.matchMedia("(max-width: 820px)").matches;
      var view = { pos: [1.85, 0.3, 1.95], look: [-0.05, 0.42, 0], fov: 31, ox: 0.12, oy: -0.165, lift: 0, beamY: 0.62, warm: 0, follow: 0 };
      var stage = new BarScene(stageCanvas, { parallax: !small, stagger: 0.12, fov: 31, view: view });
      stage.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1 : 1.25));
      if (small) stage.renderer.shadowMap.enabled = false;
      stage.hold = { y: 0 };
      stage.addCeiling();
      stage.visible = true;

      var plate = function (kind, top, bottom) {
        return stage.addPair(function (isNear) { return makePlate(kind, isNear ? top : null, isNear ? bottom : ""); });
      };
      var gym = [plate("black", "YOUR GYM", "solid"), plate("black", "YOUR GYM", "solid")];
      var results = [
        plate("red", "+$550K", "revenue / yr"),
        plate("blue", "+309", "members"),
        plate("yellow", "202", "leads"),
        plate("green", "+70%", "profit")
      ];
      stage.definePlan("gym", gym);
      stage.definePlan("results", gym.concat(results));
      stage.definePlan("finale", [
        plate("red", "SALES", "loaded"), plate("blue", "RETAIN", "loaded"), plate("yellow", "LEADS", "loaded"),
        plate("green", "TEAM", "loaded"), plate("white", "SYSTEMS", "loaded"),
        stage.addPair(function () { return makeCollar(); })
      ]);
      stage.items.forEach(function (it) { it.dur = 0.8; });

      /* Calculator plans: real competition loading per side, then two red plates for +$100K. */
      var KG = [[25, "red"], [20, "blue"], [15, "yellow"], [10, "green"], [5, "white"], [2.5, "change"]];
      var calcItems = [];
      stage.loadCalc = function (sideKg) {
        var list = [], left = Math.floor(sideKg / 2.5) * 2.5, room = SLEEVE_END - SLEEVE_START - 0.11 - 0.06;
        KG.forEach(function (k) { while (left >= k[0]) { list.push(k); left -= k[0]; } });
        var used = 0, shown = [];
        list.forEach(function (k) { var t = PLATES[k[1]].t + 0.003; if (used + t <= room) { shown.push(k); used += t; } });
        var old = calcItems;
        calcItems = shown.map(function (k) { return plate(k[1], k[0] + " KG", "your gym"); })
          .concat([plate("red", "+$25K", "the goal"), plate("red", "+$25K", "the goal")]);
        calcItems.forEach(function (it) { it.dur = 0.7; });
        stage.definePlan("calc", calcItems);
        stage.planId = null;
        stage.showPlan("calc", shown.length);
        setTimeout(function () { if (stage.planId === "calc") { stage.planN = -1; stage.showPlan("calc", calcItems.length); } }, reduceMotion ? 0 : 650);
        setTimeout(function () { stage.dropItems(old); }, 1400);
        return { shown: shown.length, total: list.length };
      };

      stage.prewarm();
      stage.showPlan("gym");
      api.stage = stage;
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
      sys.prewarm();
      sys.renderOnce();
      api.system = sys;
    }
    window.GymBar = api;
    document.dispatchEvent(new CustomEvent("gymbar:ready"));
  }

  var fontReady = document.fonts && document.fonts.load ? document.fonts.load("900 100px Archivo") : Promise.resolve();
  Promise.race([fontReady, new Promise(function (r) { setTimeout(r, 1500); })]).then(init, init);
})();
