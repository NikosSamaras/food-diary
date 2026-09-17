/* ============================================================
   Ζωντανό 3D πιάτο (three.js)

   Δείχνει το πιάτο του εντύπου με τα τρία τμήματα — φρέσκια,
   ζωική, άμυλο — να γεμίζουν με φαγητό καθώς συμπληρώνεις τα
   γεύματα της ημέρας. Οι κατηγορίες έρχονται από την ίδια
   αναγνώριση τροφών που δείχνει τα chips 3άδας/2άδας.

   Φροντίδα για κινητά: σταματά όταν δεν φαίνεται ή όταν η
   καρτέλα είναι κρυφή, περιορίζει το pixel ratio, και αν δεν
   υπάρχει WebGL απλώς δεν εμφανίζεται (μένει η μπάρα προόδου).
   ============================================================ */
import * as THREE from "./vendor/three.module.min.js";

var host = document.getElementById("plate3d");
var wrap = document.getElementById("plateWrap");

if (host && wrap) {
  var reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  var renderer, scene, camera, root, rim;
  var raf = null, running = false;
  var wedges = {}, foods = {};
  var shown = { fresh: 0, animal: 0, starch: 0 };
  var spin = 0, spinVel = reduced ? 0 : 0.0032;
  var dragging = false, lastX = 0;
  var bobT = 0, glow = 0;

  var CAT = [
    { key: "fresh",  color: 0x6fae3f },
    { key: "animal", color: 0xd4694a },
    { key: "starch", color: 0xe0a83c }
  ];
  var SEG = (2 * Math.PI) / 3;
  function segStart(i) { return -Math.PI / 2 + i * SEG; }
  function segMid(i) { return segStart(i) + SEG / 2; }
  function mat(color, rough) {
    return new THREE.MeshStandardMaterial({ color: color, roughness: rough == null ? 0.5 : rough });
  }

  /* ---------- γεωμετρίες ---------- */

  function buildPlate() {
    var profile = [
      [0.00, 0.00], [0.70, 0.01], [1.10, 0.09], [1.38, 0.24], [1.55, 0.31],
      [1.62, 0.28], [1.54, 0.22], [1.26, 0.10], [0.82, -0.05], [0.00, -0.08]
    ].map(function (p) { return new THREE.Vector2(p[0], p[1]); });

    var geo = new THREE.LatheGeometry(profile, 96);
    geo.computeVertexNormals();
    var mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      color: 0xfcfefd, roughness: 0.25, metalness: 0.03, side: THREE.DoubleSide
    }));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  function buildRim() {
    var geo = new THREE.TorusGeometry(1.585, 0.028, 12, 96);
    geo.rotateX(Math.PI / 2);
    var mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      color: 0x2f7d63, roughness: 0.4, metalness: 0.1,
      emissive: 0x2f7d63, emissiveIntensity: 0
    }));
    mesh.position.y = 0.295;
    return mesh;
  }

  function buildWedge(i, color) {
    var gap = 0.045;
    var shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.absarc(0, 0, 1.0, segStart(i) + gap, segStart(i) + SEG - gap, false);
    shape.lineTo(0, 0);
    var geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.09, curveSegments: 28,
      bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.022, bevelSegments: 2
    });
    geo.rotateX(-Math.PI / 2);
    var mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      color: color, roughness: 0.55, metalness: 0.02
    }));
    mesh.position.y = 0.035;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.scale.setScalar(0.0001);
    return mesh;
  }

  /* Απλά, ευανάγνωστα 3D φαγητά — ένα σύνολο ανά κατηγορία */
  function buildFood(key, i) {
    var g = new THREE.Group();
    var a = segMid(i);
    // Το σχήμα περιστράφηκε κατά -90° στον X, οπότε η Y του σχήματος έγινε -Z
    var cx = Math.cos(a) * 0.46;
    var cz = -Math.sin(a) * 0.46;
    var k, m;

    if (key === "fresh") {
      var veg = [
        [0x7cc142, 0.185, -0.13, -0.10],
        [0xd23b3b, 0.150,  0.14, -0.08],
        [0x9ad855, 0.130, -0.08,  0.14],
        [0xe0632f, 0.115,  0.12,  0.13]
      ];
      for (k = 0; k < veg.length; k++) {
        m = new THREE.Mesh(new THREE.IcosahedronGeometry(veg[k][1], 1), mat(veg[k][0], 0.45));
        m.position.set(cx + veg[k][2], 0.12 + veg[k][1] * 0.85, cz + veg[k][3]);
        m.rotation.set(k * 0.7, k * 1.1, k * 0.4);
        m.castShadow = true;
        g.add(m);
      }
    } else if (key === "animal") {
      var fillet = new THREE.Mesh(new THREE.CapsuleGeometry(0.135, 0.24, 4, 14), mat(0xdf8a68, 0.6));
      fillet.rotation.z = Math.PI / 2;
      fillet.rotation.y = 0.45;
      fillet.position.set(cx - 0.04, 0.25, cz - 0.08);
      fillet.castShadow = true;
      g.add(fillet);

      var white = new THREE.Mesh(new THREE.SphereGeometry(0.155, 22, 16), mat(0xfdfaf3, 0.35));
      white.scale.y = 0.62;
      white.position.set(cx + 0.07, 0.19, cz + 0.17);
      white.castShadow = true;
      g.add(white);

      var yolk = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), mat(0xf2b134, 0.4));
      yolk.scale.y = 0.55;
      yolk.position.set(cx + 0.07, 0.235, cz + 0.17);
      g.add(yolk);
    } else {
      var roll = new THREE.Mesh(new THREE.SphereGeometry(0.21, 24, 18), mat(0xd8a15a, 0.62));
      roll.scale.set(1.15, 0.72, 0.85);
      roll.position.set(cx - 0.01, 0.24, cz - 0.05);
      roll.castShadow = true;
      g.add(roll);

      var slash = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.012, 0.03), mat(0xb9823f, 0.7));
      slash.position.set(cx - 0.01, 0.375, cz - 0.05);
      slash.rotation.y = 0.35;
      g.add(slash);

      var nuts = [[-0.16, 0.17], [0.14, 0.18], [0.01, 0.23]];
      for (k = 0; k < nuts.length; k++) {
        m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.075, 0), mat(0xc9a06a, 0.55));
        m.position.set(cx + nuts[k][0], 0.19, cz + nuts[k][1]);
        m.rotation.set(k, k * 1.4, k * 0.6);
        m.castShadow = true;
        g.add(m);
      }
    }

    g.scale.setScalar(0.0001);
    return g;
  }

  /* ---------- σκηνή ---------- */

  function boot() {
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    } catch (e) {
      return false;
    }
    if (!renderer || !renderer.domElement) return false;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    host.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
    camera.position.set(0, 2.18, 2.98);
    camera.lookAt(0, 0.05, 0);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x4d5f57, 1.15));

    var key = new THREE.DirectionalLight(0xffffff, 2.1);
    key.position.set(2.6, 5.2, 3.2);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 14;
    key.shadow.camera.left = -3;
    key.shadow.camera.right = 3;
    key.shadow.camera.top = 3;
    key.shadow.camera.bottom = -3;
    key.shadow.bias = -0.0012;
    key.shadow.radius = 3;
    scene.add(key);

    var fill = new THREE.DirectionalLight(0xdfeee8, 0.55);
    fill.position.set(-3, 2.2, -2.4);
    scene.add(fill);

    root = new THREE.Group();
    scene.add(root);

    root.add(buildPlate());
    rim = buildRim();
    root.add(rim);

    CAT.forEach(function (c, i) {
      wedges[c.key] = buildWedge(i, c.color);
      foods[c.key] = buildFood(c.key, i);
      root.add(wedges[c.key]);
      root.add(foods[c.key]);
    });

    var catcher = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 9),
      new THREE.ShadowMaterial({ opacity: 0.17 })
    );
    catcher.rotation.x = -Math.PI / 2;
    catcher.position.y = -0.36;
    catcher.receiveShadow = true;
    scene.add(catcher);

    resize();
    wrap.classList.add("on");
    return true;
  }

  function resize() {
    if (!renderer) return;
    var w = host.clientWidth || 300;
    var h = host.clientHeight || 190;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  /* ---------- κατάσταση από την εφαρμογή ---------- */

  function apply() {
    var st = window.__plateState || {};
    CAT.forEach(function (c) { shown[c.key] = st[c.key] ? 1 : 0; });
    start();
  }

  /* ---------- βρόχος ---------- */

  function frame() {
    raf = null;
    if (!running) return;

    var on = 0;
    CAT.forEach(function (c) {
      var target = shown[c.key];
      var w = wedges[c.key], f = foods[c.key];
      var cur = w.scale.x;
      var next = cur + (Math.max(target, 0.0001) - cur) * 0.12;
      // ελαφρύ «αναπήδημα» στο γέμισμα
      var eased = target > 0.5 ? Math.min(next * 1.04, 1) : next;
      w.scale.setScalar(eased);
      f.scale.setScalar(eased);
      f.position.y = (1 - eased) * -0.25;
      if (target > 0.5) on++;
    });

    var full = on === 3;
    glow += ((full ? 0.55 : 0) - glow) * 0.08;
    rim.material.emissiveIntensity = glow;

    if (!dragging) spin += spinVel;
    if (!dragging && Math.abs(spinVel) > 0.0032) spinVel *= 0.96;
    root.rotation.y = spin;

    if (!reduced) {
      bobT += 0.02;
      root.position.y = Math.sin(bobT) * (full ? 0.045 : 0.018);
      root.rotation.z = Math.sin(bobT * 0.6) * 0.012;
    }

    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (!renderer || running || document.hidden) return;
    running = true;
    if (!raf) raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (raf) { cancelAnimationFrame(raf); raf = null; }
  }

  /* ---------- αλληλεπίδραση: σύρσιμο για περιστροφή ---------- */

  host.addEventListener("pointerdown", function (e) {
    dragging = true;
    lastX = e.clientX;
    host.setPointerCapture && host.setPointerCapture(e.pointerId);
    start();
  });
  host.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    var dx = e.clientX - lastX;
    lastX = e.clientX;
    spin += dx * 0.011;
    spinVel = dx * 0.011;
  });
  function release() {
    if (!dragging) return;
    dragging = false;
    if (reduced) spinVel = 0;
    else if (Math.abs(spinVel) < 0.0032) spinVel = 0.0032;
  }
  host.addEventListener("pointerup", release);
  host.addEventListener("pointercancel", release);
  host.addEventListener("pointerleave", release);

  /* ---------- ορατότητα & μέγεθος ---------- */

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop(); else start();
  });

  if (window.IntersectionObserver) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) start(); else stop(); });
    }, { threshold: 0.05 }).observe(host);
  }
  if (window.ResizeObserver) {
    new ResizeObserver(function () { resize(); }).observe(host);
  } else {
    window.addEventListener("resize", resize);
  }

  /* ---------- εκκίνηση ---------- */

  if (boot()) {
    window.Plate3D = { update: apply, start: start, stop: stop };
    apply();
  }
}
