/* Service worker: offline λειτουργία.
   Στρατηγική: network-first με cache fallback — όταν υπάρχει σύνδεση
   φορτώνει πάντα τη φρέσκια έκδοση, χωρίς σύνδεση σερβίρει το αντίγραφο. */
var CACHE = "imerologio-v12";
var PRECACHE = [
  "./",
  "index.html",
  "styles.css?v=18",
  "app.js?v=18",
  "xlsx.js?v=18",
  "manifest.webmanifest",
  "icon.svg",
  "icon-180.png",
  "icon-192.png",
  "icon-512.png",
  "assets/odigos-1.png",
  "assets/odigos-2.png"
];

// Τα scripts του Firebase (έκδοση κλειδωμένη στο URL → αμετάβλητα): cache-first, ώστε ο συγχρονισμός
// να φορτώνει κι όταν η εφαρμογή ανοίγει με αδύναμο ή καθόλου σήμα.
var FB_SCRIPTS = [
  "https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore-compat.js"
];
function isFbScript(url) { return url.indexOf("https://www.gstatic.com/firebasejs/") === 0; }

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(PRECACHE).then(function () {
        // προαιρετικά — αποτυχία εδώ δεν ακυρώνει την εγκατάσταση
        return Promise.all(FB_SCRIPTS.map(function (u) {
          return fetch(u, { mode: "no-cors" }).then(function (r) { return c.put(u, r); }).catch(function () {});
        }));
      });
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (isFbScript(req.url)) {
    e.respondWith(
      caches.match(req.url).then(function (hit) {
        if (hit) return hit;
        return fetch(req).then(function (res) {
          if (res && (res.ok || res.type === "opaque")) {
            var copy = res.clone();
            caches.open(CACHE).then(function (c) { c.put(req.url, copy); });
          }
          return res;
        });
      })
    );
    return;
  }
  if (url.origin !== location.origin) return; // άλλα cross-origin (Firestore API): κατευθείαν δίκτυο

  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (hit) {
        if (hit) return hit;
        if (req.mode === "navigate") return caches.match("index.html");
      });
    })
  );
});
