/* Service worker: offline λειτουργία.
   Στρατηγική: network-first με cache fallback — όταν υπάρχει σύνδεση
   φορτώνει πάντα τη φρέσκια έκδοση, χωρίς σύνδεση σερβίρει το αντίγραφο. */
var CACHE = "imerologio-v7";
var PRECACHE = [
  "./",
  "index.html",
  "styles.css?v=13",
  "app.js?v=13",
  "xlsx.js?v=13",
  "manifest.webmanifest",
  "icon.svg",
  "icon-180.png",
  "icon-192.png",
  "icon-512.png",
  "assets/odigos-1.png",
  "assets/odigos-2.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(PRECACHE);
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
  if (url.origin !== location.origin) return; // firebase/gstatic: κατευθείαν δίκτυο

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
