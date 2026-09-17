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
import { GLTFLoader } from "./vendor/GLTFLoader.js";
import { RoomEnvironment } from "./vendor/RoomEnvironment.js";

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
    { key: "fresh",  color: 0x9ccf7a },
    { key: "animal", color: 0xe8a48d },
    { key: "starch", color: 0xeccb84 }
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
    var mesh = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({
      color: 0xfcfefd, roughness: 0.14, metalness: 0.0,
      clearcoat: 0.85, clearcoatRoughness: 0.08,
      side: THREE.DoubleSide
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
      depth: 0.032, curveSegments: 28,
      bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.014, bevelSegments: 2
    });
    geo.rotateX(-Math.PI / 2);
    var mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      color: color, roughness: 0.62, metalness: 0.0, envMapIntensity: 0.35
    }));
    mesh.position.y = 0.022;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.scale.setScalar(0.0001);
    return mesh;
  }

  /* ---------- πραγματικά μοντέλα φαγητού (Blender → GLB) ---------- */

  /* Πού κάθεται το κάθε φαγητό μέσα στο τμήμα του πιάτου:
     [όνομα μοντέλου, μετατόπιση x, μετατόπιση z, κλίμακα, στροφή] */
  var LAYOUT = {
    fresh: [
      ["lettuce",  -0.01,  0.03, 0.58, 0.4, 0.00],
      ["tomato",    0.14, -0.06, 0.32, 0.0, 0.03],
      ["broccoli", -0.13,  0.02, 0.44, 0.8, 0.03],
      ["carrot",    0.04,  0.18, 0.42, 2.3, 0.03]
    ],
    animal: [
      ["salmon", -0.10, -0.09, 0.72, 0.5, 0.00],
      ["egg",     0.11,  0.16, 0.44, 0.0, 0.00]
    ],
    starch: [
      ["bread",   0.00, -0.06, 0.46, 0.3, 0.00],
      ["almond", -0.18,  0.17, 0.42, 0.9, 0.00],
      ["almond",  0.15,  0.19, 0.42, 2.1, 0.00],
      ["almond",  0.00,  0.26, 0.42, 4.0, 0.00]
    ]
  };

  /* Τοποθετεί ένα μοντέλο ώστε η βάση του να ακουμπά ακριβώς στο τμήμα */
  function placeOn(model, x, z, y0, scale, rotY) {
    var o = model.clone(true);
    o.scale.setScalar(scale);
    o.rotation.y = rotY;
    o.updateMatrixWorld(true);
    var box = new THREE.Box3().setFromObject(o);
    o.position.set(x, y0 - box.min.y, z);
    o.traverse(function (n) {
      if (!n.isMesh) return;
      n.castShadow = true;
      n.receiveShadow = true;
      n.material = n.material.clone();
      n.material.envMapIntensity = 0.45;   // κρατά τα χρώματα ζωντανά
    });
    return o;
  }

  function loadFood() {
    new GLTFLoader().load("./assets/food.glb?v=11", function (gltf) {
      var lib = {};
      gltf.scene.children.slice().forEach(function (child) {
        lib[child.name] = child;
      });
      CAT.forEach(function (c, i) {
        var a = segMid(i);
        var cx = Math.cos(a) * 0.50;
        var cz = -Math.sin(a) * 0.50;
        (LAYOUT[c.key] || []).forEach(function (item) {
          var model = lib[item[0]];
          if (!model) return;
          foods[c.key].add(placeOn(model, cx + item[1], cz + item[2], 0.082 + item[5], item[3], item[4]));
        });
      });
      start();
    }, undefined, function () { /* χωρίς μοντέλα: μένουν μόνο τα χρωματιστά τμήματα */ });
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
    renderer.toneMappingExposure = 0.86;
    host.appendChild(renderer.domElement);

    scene = new THREE.Scene();

    // Φωτισμός περιβάλλοντος: δίνει αληθινές αντανακλάσεις στα υλικά
    var pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
    camera.position.set(0, 2.18, 2.98);
    camera.lookAt(0, 0.05, 0);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x4d5f57, 0.28));

    var key = new THREE.DirectionalLight(0xfff6e8, 1.45);
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

    var fill = new THREE.DirectionalLight(0xdfeee8, 0.22);
    fill.position.set(-3, 2.2, -2.4);
    scene.add(fill);

    root = new THREE.Group();
    scene.add(root);

    root.add(buildPlate());
    rim = buildRim();
    root.add(rim);

    CAT.forEach(function (c, i) {
      wedges[c.key] = buildWedge(i, c.color);
      foods[c.key] = new THREE.Group();
      foods[c.key].scale.setScalar(0.0001);
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
    loadFood();
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

  /* ---------- εκκίνηση ---------- */

  if (boot()) {
    window.Plate3D = { update: apply, start: start, stop: stop };
    apply();

    // Οι παρατηρητές μπαίνουν ΜΕΤΑ την εμφάνιση του πιάτου: αν δηλωθούν
    // νωρίτερα, μετρούν το ακόμη κρυφό στοιχείο και σταματούν την κίνηση.
    if (window.ResizeObserver) {
      new ResizeObserver(function () { resize(); }).observe(host);
    } else {
      window.addEventListener("resize", resize);
    }
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) start(); else stop(); });
      }, { threshold: 0 }).observe(host);
    }
  }
}
