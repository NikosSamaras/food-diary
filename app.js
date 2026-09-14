/* ============================================================
   Ημερολόγιο Καταγραφής Διατροφής
   Δομή ημέρας βασισμένη στο έντυπο «ΣΥΝΔΥΑΣΜΟΙ ΤΡΟΦΩΝ»:
   5 γεύματα (3άδες: Πρωινό/Γεύμα/Βραδινό, 2άδες: Προγεύμα/Απογευματινό)
   + Φυσική δραστηριότητα (είδος, διάρκεια) + νερό + σημειώσεις.
   Αποθήκευση: localStorage (τοπικά στον browser).
   ============================================================ */
(function () {
  "use strict";

  var LEGACY_STORE_KEY = "imerologio-diatrofis-v1"; // δεδομένα πριν την εισαγωγή χρηστών
  var PROFILES_KEY = "imerologio-profiles-v1";
  var THEME_KEY = "imerologio-theme";

  /* ---------- Ορισμός γευμάτων ---------- */
  /* Ένα ελεύθερο πεδίο ανά γεύμα — γράφεις όλο το γεύμα μαζί */
  var MEALS = [
    { id: "proino",       name: "Πρωινό",       type: "3άδα", emoji: "🌅", slots: [{ id: "kyrios", label: "Τι έφαγες;" }] },
    { id: "progevma",     name: "Προγεύμα",     type: "2άδα", emoji: "🍎", slots: [{ id: "kyrios", label: "Τι έφαγες;" }] },
    { id: "gevma",        name: "Γεύμα",        type: "3άδα", emoji: "☀️", slots: [{ id: "kyrios", label: "Τι έφαγες;" }] },
    { id: "apogevmatino", name: "Απογευματινό", type: "2άδα", emoji: "🥨", slots: [{ id: "kyrios", label: "Τι έφαγες;" }] },
    { id: "vradino",      name: "Βραδινό",      type: "3άδα", emoji: "🌙", slots: [{ id: "kyrios", label: "Τι έφαγες;" }] }
  ];

  var SLOT_SHORT = { kyrios: "Φαγητό" };

  /* Προτάσεις αυτόματης συμπλήρωσης */
  var SUGGESTIONS = {
    "dl-activity": ["Περπάτημα","Τρέξιμο","Γυμναστήριο","Ποδήλατο","Κολύμπι","Yoga","Pilates","Χορός","Βάρη","Ποδόσφαιρο","Μπάσκετ","Τένις","Σκάλες","Διατάσεις"],
    "dl-duration": ["15 λεπτά","20 λεπτά","30 λεπτά","45 λεπτά","1 ώρα","1,5 ώρα","2 ώρες"]
  };

  var DOW = ["Κυριακή","Δευτέρα","Τρίτη","Τετάρτη","Πέμπτη","Παρασκευή","Σάββατο"];
  var DOW_SHORT = ["Κυρ","Δευ","Τρί","Τετ","Πέμ","Παρ","Σάβ"];
  var MONTHS = ["Ιανουάριος","Φεβρουάριος","Μάρτιος","Απρίλιος","Μάιος","Ιούνιος","Ιούλιος","Αύγουστος","Σεπτέμβριος","Οκτώβριος","Νοέμβριος","Δεκέμβριος"];

  /* ---------- Βοηθητικά ---------- */
  function $(id) { return document.getElementById(id); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function keyOf(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function parseKey(k) { var p = k.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function fmtGr(k) { var p = k.split("-"); return p[2] + "/" + p[1] + "/" + p[0]; }
  var GR_UP = { "Ά": "Α", "Έ": "Ε", "Ή": "Η", "Ί": "Ι", "Ό": "Ο", "Ύ": "Υ", "Ώ": "Ω" };
  function grUpper(s) { // ελληνικά κεφαλαία χωρίς τόνους, όπως στο έντυπο
    return String(s || "").toUpperCase().replace(/[ΆΈΉΊΌΎΏ]/g, function (c) { return GR_UP[c]; });
  }
  function todayKey() { return keyOf(new Date()); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  /* ---------- Χρήστες (προφίλ) ---------- */
  var DEFAULT_USERS = [
    { id: "nikos", name: "Νίκος" },
    { id: "eva",   name: "Εύα" },
    { id: "alkis", name: "Άλκης" },
    { id: "maria", name: "Μαρία" },
    { id: "test",  name: "Δοκιμή" }
  ];
  var profiles = null;
  try { profiles = JSON.parse(localStorage.getItem(PROFILES_KEY) || "null"); } catch (e) {}
  if (!profiles || !profiles.users || !profiles.users.length) {
    profiles = { current: "nikos", seeded: 2, users: DEFAULT_USERS.map(function (u) { return { id: u.id, name: u.name }; }) };
    // Μεταφορά δεδομένων από την έκδοση χωρίς χρήστες → στον Νίκο
    try {
      var legacy = localStorage.getItem(LEGACY_STORE_KEY);
      if (legacy && !localStorage.getItem(storeKeyFor("nikos"))) {
        localStorage.setItem(storeKeyFor("nikos"), legacy);
      }
    } catch (e) {}
    persistProfiles();
  } else if ((profiles.seeded || 1) < 2) {
    // Υπάρχουσα εγκατάσταση: πρόσθεσε μία φορά τους νέους προεπιλεγμένους χρήστες (Άλκης, Μαρία)
    ["alkis", "maria"].forEach(function (id) {
      var du = null;
      DEFAULT_USERS.forEach(function (x) { if (x.id === id) du = x; });
      var exists = profiles.users.some(function (u) {
        return u.id === du.id || u.name.toLowerCase() === du.name.toLowerCase();
      });
      if (!exists) profiles.users.push({ id: du.id, name: du.name });
    });
    profiles.seeded = 2;
    persistProfiles();
  }
  if (!profiles.users.some(function (u) { return u.id === profiles.current; })) {
    profiles.current = profiles.users[0].id;
  }
  function storeKeyFor(id) { return LEGACY_STORE_KEY + ":u:" + id; }
  function persistProfiles() {
    try { localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles)); } catch (e) {}
  }
  function currentUser() {
    for (var i = 0; i < profiles.users.length; i++) {
      if (profiles.users[i].id === profiles.current) return profiles.users[i];
    }
    return profiles.users[0];
  }
  function avatarColor(id) {
    var h = 0;
    for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
    return "hsl(" + h + ",45%,42%)";
  }
  function userDayCount(id) {
    try {
      var d = JSON.parse(localStorage.getItem(storeKeyFor(id)) || "{}") || {};
      return Object.keys(d).length;
    } catch (e) { return 0; }
  }

  /* ---------- Αποθήκευση ---------- */
  // Παλιότερα πεδία (κατηγορίες συνδυασμών, επιδόρπιο, φρούτα/snack) → συγχώνευση
  // στο ενιαίο πεδίο του γεύματος ΚΑΤΑ ΤΗΝ ΑΝΑΓΝΩΣΗ. Τίποτα δεν χάνεται και δεν
  // γίνεται καμία μαζική εγγραφή στο cloud — μια ημέρα ξαναγράφεται μόνο αν την επεξεργαστείς.
  var LEGACY_MEAL_SLOTS = ["fresh", "animal", "starch", "fruit", "snack", "gliko"];
  function migrateDayShape(d) {
    if (!d || !d.meals) return d;
    MEALS.forEach(function (m) {
      var mm = d.meals[m.id];
      if (!mm) return;
      var parts = [];
      if ((mm.kyrios || "").trim()) parts.push(mm.kyrios.trim());
      LEGACY_MEAL_SLOTS.forEach(function (k) {
        if ((mm[k] || "").trim()) parts.push(mm[k].trim());
        delete mm[k];
      });
      if (parts.length) mm.kyrios = parts.join("\n"); // κάθε παλιό πεδίο σε δική του γραμμή
    });
    return d;
  }
  function loadDb() {
    try {
      var d = JSON.parse(localStorage.getItem(storeKeyFor(profiles.current)) || "{}") || {};
      Object.keys(d).forEach(function (k) { migrateDayShape(d[k]); });
      return d;
    }
    catch (e) { return {}; }
  }
  var db = loadDb();

  function persist() {
    try { localStorage.setItem(storeKeyFor(profiles.current), JSON.stringify(db)); }
    catch (e) { toast("Σφάλμα αποθήκευσης — γεμάτος χώρος browser;"); }
  }
  var ML_PER_GLASS = 250; // μετατροπή παλιών καταγραφών (ποτήρια → ml)
  function getWaterMl(d) {
    if (!d) return 0;
    if (d.waterMl != null) return d.waterMl || 0;
    return d.water ? d.water * ML_PER_GLASS : 0;
  }
  function blankDay() {
    var d = { meals: {}, times: {}, activity: { type: "", time: "", duration: "" }, waterMl: 0, notes: "" };
    MEALS.forEach(function (m) {
      d.meals[m.id] = {};
      m.slots.forEach(function (s) { d.meals[m.id][s.id] = ""; });
    });
    return d;
  }
  function getDay(k) {
    var d = db[k] || blankDay();
    if (!d.times) d.times = {};
    return d;
  }
  function dayHasData(d) {
    if (!d) return false;
    if ((d.activity && (d.activity.type || d.activity.duration || d.activity.time)) || getWaterMl(d) > 0 || (d.notes || "").trim()) return true;
    for (var m in d.meals) for (var s in d.meals[m]) if ((d.meals[m][s] || "").trim()) return true;
    if (d.times) for (var t in d.times) if ((d.times[t] || "").trim()) return true;
    return false;
  }
  function mealDone(day, meal) {
    // το επιδόρπιο/γλυκό είναι προαιρετικό — μετράνε μόνο τα υποχρεωτικά πεδία
    return meal.slots.every(function (s) {
      return s.opt || ((day.meals[meal.id] || {})[s.id] || "").trim() !== "";
    });
  }
  function mealsDoneCount(day) {
    return MEALS.filter(function (m) { return mealDone(day, m); }).length;
  }
  function sortedKeys() { return Object.keys(db).filter(function(k){return dayHasData(db[k]);}).sort(); }

  /* ---------- Κατάσταση ---------- */
  var currentKey = todayKey();
  var weekStart = mondayOf(new Date());
  function mondayOf(d) {
    var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    var wd = (x.getDay() + 6) % 7; // Δευτέρα=0
    x.setDate(x.getDate() - wd);
    return x;
  }

  /* ---------- Toast ---------- */
  var toastTimer = null;
  function toast(msg) {
    var t = $("toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2600);
  }
  var savedTimer = null;
  function flashSaved() {
    var f = $("savedFlag");
    f.hidden = false;
    clearTimeout(savedTimer);
    savedTimer = setTimeout(function () { f.hidden = true; }, 1400);
  }

  /* ---------- Datalists ---------- */
  Object.keys(SUGGESTIONS).forEach(function (dlId) {
    var dl = $(dlId);
    SUGGESTIONS[dlId].forEach(function (v) {
      var o = document.createElement("option");
      o.value = v;
      dl.appendChild(o);
    });
  });

  /* ---------- Προβολές ---------- */
  var tabs = $("tabs");
  tabs.addEventListener("click", function (e) {
    var b = e.target.closest(".tab");
    if (!b) return;
    showView(b.dataset.view);
  });
  function showView(name) {
    document.querySelectorAll(".tab").forEach(function (t) {
      t.classList.toggle("is-active", t.dataset.view === name);
    });
    document.querySelectorAll(".view").forEach(function (v) {
      v.classList.toggle("is-active", v.id === "view-" + name);
    });
    if (name === "week") renderWeek();
    if (name === "history") renderHistory();
    if (name === "export") initExportRange();
    window.scrollTo({ top: 0 });
  }

  /* ---------- Θέμα ---------- */
  function applyTheme(t) {
    if (t === "dark") document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
  }
  var savedTheme = null;
  try { savedTheme = localStorage.getItem(THEME_KEY); } catch (e) {}
  if (savedTheme) applyTheme(savedTheme);
  else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) applyTheme("dark");
  $("themeBtn").addEventListener("click", function () {
    var isDark = document.documentElement.getAttribute("data-theme") === "dark";
    var next = isDark ? "light" : "dark";
    applyTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
  });

  /* ============================================================
     ΠΡΟΒΟΛΗ: ΗΜΕΡΑ
     ============================================================ */
  function buildMealCards() {
    var wrap = $("mealCards");
    wrap.innerHTML = "";
    MEALS.forEach(function (m) {
      var card = document.createElement("div");
      card.className = "card meal-card" + (m.type === "2άδα" ? " duo" : "");
      card.dataset.meal = m.id;
      var slotsHtml = m.slots.map(function (s) {
        return '<label class="slot"><span class="slot-label">' + esc(s.label) + '</span>' +
          '<textarea rows="3" data-meal="' + m.id + '" data-slot="' + s.id + '" autocomplete="off" placeholder="π.χ. τοστ με τυρί, χυμός πορτοκάλι…"></textarea></label>';
      }).join("");
      card.innerHTML =
        '<div class="card-head">' +
          '<div class="meal-title"><span class="meal-emoji">' + m.emoji + '</span><h2>' + esc(m.name) + '</h2></div>' +
          '<div class="meal-head-right">' +
            '<input type="time" class="meal-time" data-meal="' + m.id + '" title="Ώρα γεύματος" aria-label="Ώρα — ' + esc(m.name) + '">' +
            '<span class="check">✓</span>' +
          '</div>' +
        '</div>' +
        '<div class="slots">' + slotsHtml + '</div>';
      wrap.appendChild(card);
    });
  }
  buildMealCards();

  /* Νερό σε ml */
  document.querySelectorAll("[data-addml]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var cur = parseInt($("waterMl").value, 10);
      $("waterMl").value = (isFinite(cur) && cur > 0 ? cur : 0) + (+this.dataset.addml);
      scheduleSave();
    });
  });
  $("waterReset").addEventListener("click", function () {
    $("waterMl").value = "";
    scheduleSave();
  });

  function renderDay() {
    var day = getDay(currentKey);
    $("dayPicker").value = currentKey;
    var d = parseKey(currentKey);
    var label = DOW[d.getDay()] + " " + d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear();
    $("dayName").textContent = label + (currentKey === todayKey() ? " · Σήμερα" : "");

    document.querySelectorAll("#mealCards [data-slot]").forEach(function (inp) {
      inp.value = (day.meals[inp.dataset.meal] || {})[inp.dataset.slot] || "";
    });
    document.querySelectorAll("#mealCards .meal-time").forEach(function (inp) {
      inp.value = (day.times || {})[inp.dataset.meal] || "";
    });
    $("actType").value = day.activity.type || "";
    $("actTime").value = day.activity.time || "";
    $("actDuration").value = day.activity.duration || "";
    $("dayNotes").value = day.notes || "";
    var ml = getWaterMl(day);
    $("waterMl").value = ml > 0 ? ml : "";
    updateProgress(day);
  }

  function updateProgress(day) {
    var done = mealsDoneCount(day);
    $("progressFill").style.width = (done / MEALS.length * 100) + "%";
    $("progressLabel").textContent = done + " από " + MEALS.length + " γεύματα συμπληρωμένα";
    MEALS.forEach(function (m) {
      var card = document.querySelector('.meal-card[data-meal="' + m.id + '"]');
      if (card) card.classList.toggle("done", mealDone(day, m));
    });
  }

  /* Αποθήκευση καθώς γράφεις */
  var saveDebounce = null;
  function scheduleSave() {
    clearTimeout(saveDebounce);
    saveDebounce = setTimeout(saveCurrentDay, 350);
  }
  function saveCurrentDay() {
    var day = getDay(currentKey);
    document.querySelectorAll("#mealCards [data-slot]").forEach(function (inp) {
      if (!day.meals[inp.dataset.meal]) day.meals[inp.dataset.meal] = {};
      day.meals[inp.dataset.meal][inp.dataset.slot] = inp.value.trim();
    });
    document.querySelectorAll("#mealCards .meal-time").forEach(function (inp) {
      day.times[inp.dataset.meal] = inp.value;
    });
    day.activity.type = $("actType").value.trim();
    day.activity.time = $("actTime").value;
    day.activity.duration = $("actDuration").value.trim();
    var ml = parseInt($("waterMl").value, 10);
    day.waterMl = isFinite(ml) && ml > 0 ? ml : 0;
    delete day.water; // παλιά μονάδα (ποτήρια) — μετά την πρώτη επεξεργασία ισχύουν μόνο τα ml
    day.notes = $("dayNotes").value;
    day.up = Date.now(); // χρονοσφραγίδα για τον online συγχρονισμό (νεότερο κερδίζει)
    if (dayHasData(day)) db[currentKey] = day;
    else delete db[currentKey];
    persist();
    pushDay(profiles.current, currentKey);
    updateProgress(day);
    flashSaved();
    updateFootStats();
  }
  ["mealCards"].forEach(function (id) {
    $(id).addEventListener("input", scheduleSave);
    $(id).addEventListener("change", scheduleSave); // τα input[type=time] ενημερώνουν αξιόπιστα στο change
  });
  ["actType", "actTime", "actDuration", "dayNotes", "waterMl"].forEach(function (id) {
    $(id).addEventListener("input", scheduleSave);
    $(id).addEventListener("change", scheduleSave);
  });

  /* Πλοήγηση ημέρας */
  function goToDay(k) {
    clearTimeout(saveDebounce);
    saveCurrentDay();
    currentKey = k;
    renderDay();
  }
  $("dayPicker").addEventListener("change", function () {
    if (this.value) goToDay(this.value);
  });
  $("prevDay").addEventListener("click", function () {
    var d = parseKey(currentKey); d.setDate(d.getDate() - 1); goToDay(keyOf(d));
  });
  $("nextDay").addEventListener("click", function () {
    var d = parseKey(currentKey); d.setDate(d.getDate() + 1); goToDay(keyOf(d));
  });
  $("todayBtn").addEventListener("click", function () { goToDay(todayKey()); });
  $("clearDay").addEventListener("click", function () {
    if (!confirm("Να διαγραφούν όλες οι καταχωρήσεις της ημέρας " + fmtGr(currentKey) + ";")) return;
    var oldDay = db[currentKey];
    delete db[currentKey];
    persist();
    pushDay(profiles.current, currentKey, oldDay);
    renderDay();
    updateFootStats();
    toast("Η ημέρα καθαρίστηκε");
  });

  /* ============================================================
     ΠΡΟΒΟΛΗ: ΕΒΔΟΜΑΔΑ
     ============================================================ */
  function weekKeys(start) {
    var out = [];
    for (var i = 0; i < 7; i++) {
      var d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      out.push(keyOf(d));
    }
    return out;
  }
  function renderWeek() {
    var keys = weekKeys(weekStart);
    var end = parseKey(keys[6]);
    $("weekLabel").textContent =
      weekStart.getDate() + " " + MONTHS[weekStart.getMonth()].slice(0, 3) + ". " + weekStart.getFullYear() +
      " – " + end.getDate() + " " + MONTHS[end.getMonth()].slice(0, 3) + ". " + end.getFullYear();

    var tKey = todayKey();
    var html = "<thead><tr><th style='min-width:120px'>Γεύμα</th>";
    keys.forEach(function (k) {
      var d = parseKey(k);
      html += "<th" + (k === tKey ? ' class="today-col"' : "") + ">" + DOW_SHORT[d.getDay()] +
        "<small>" + d.getDate() + "/" + (d.getMonth() + 1) + "</small></th>";
    });
    html += "</tr></thead><tbody>";

    MEALS.forEach(function (m) {
      html += "<tr><th><span class='b'>" + m.emoji + " " + esc(m.name) + "</span></th>";
      keys.forEach(function (k) {
        var day = db[k];
        var cell = "";
        if (day && day.meals && day.meals[m.id]) {
          var parts = m.slots.map(function (s) {
            var v = (day.meals[m.id][s.id] || "").trim();
            if (!v) return "";
            return m.slots.length === 1
              ? esc(v).replace(/\n/g, "<br>")
              : "<span class='l'>" + esc(SLOT_SHORT[s.id]) + ":</span>" + esc(v);
          }).filter(Boolean);
          var tm = ((day.times || {})[m.id] || "").trim();
          if (tm) parts.unshift("<span class='l'>🕐 " + esc(tm) + "</span>");
          cell = parts.join("<br>");
        }
        html += "<td data-day='" + k + "'" + (k === tKey ? ' class="today-col"' : "") + ">" + (cell || "&nbsp;") + "</td>";
      });
      html += "</tr>";
    });

    // Φυσική δραστηριότητα
    html += "<tr><th><span class='b'>🏃 Φυσική Δραστ.</span>Είδος/Διάρκεια</th>";
    keys.forEach(function (k) {
      var day = db[k], cell = "";
      if (day && day.activity && (day.activity.type || day.activity.duration || day.activity.time)) {
        cell = (day.activity.time ? "<span class='l'>🕐 " + esc(day.activity.time) + "</span>" : "") +
          esc(day.activity.type || "—") +
          (day.activity.duration ? "<br><span class='l'>" + esc(day.activity.duration) + "</span>" : "");
      }
      html += "<td data-day='" + k + "'>" + (cell || "&nbsp;") + "</td>";
    });
    html += "</tr></tbody>";
    $("weekGrid").innerHTML = html;
  }
  $("weekGrid").addEventListener("click", function (e) {
    var td = e.target.closest("td[data-day]");
    if (!td) return;
    goToDay(td.dataset.day);
    showView("day");
  });
  $("prevWeek").addEventListener("click", function () {
    weekStart.setDate(weekStart.getDate() - 7); renderWeek();
  });
  $("nextWeek").addEventListener("click", function () {
    weekStart.setDate(weekStart.getDate() + 7); renderWeek();
  });
  $("thisWeekBtn").addEventListener("click", function () {
    weekStart = mondayOf(new Date()); renderWeek();
  });
  $("weekXlsx").addEventListener("click", function () {
    var keys = weekKeys(weekStart);
    exportCalendarXlsx(keys[0], keys[6], "εβδομάδα");
  });

  /* ============================================================
     ΠΡΟΒΟΛΗ: ΙΣΤΟΡΙΚΟ
     ============================================================ */
  function dayMatches(day, q) {
    if (!q) return true;
    q = q.toLowerCase();
    var parts = [];
    for (var m in day.meals) for (var s in day.meals[m]) parts.push(day.meals[m][s] || "");
    if (day.times) for (var t in day.times) parts.push(day.times[t] || "");
    parts.push(day.activity.type || "", day.activity.duration || "", day.activity.time || "", day.notes || "");
    return parts.join(" ").toLowerCase().indexOf(q) !== -1;
  }

  function renderHistory() {
    var keys = sortedKeys().reverse();
    var q = $("historySearch").value.trim();
    var month = $("historyMonth").value;

    // Επιλογές μηνών
    var months = {};
    keys.forEach(function (k) { months[k.slice(0, 7)] = true; });
    var sel = $("historyMonth");
    var cur = sel.value;
    sel.innerHTML = "<option value=''>Όλοι οι μήνες</option>";
    Object.keys(months).sort().reverse().forEach(function (mk) {
      var p = mk.split("-");
      var o = document.createElement("option");
      o.value = mk;
      o.textContent = MONTHS[+p[1] - 1] + " " + p[0];
      sel.appendChild(o);
    });
    sel.value = cur && months[cur] ? cur : (month && months[month] ? month : "");
    month = sel.value;

    var filtered = keys.filter(function (k) {
      if (month && k.slice(0, 7) !== month) return false;
      return dayMatches(db[k], q);
    });

    // Στατιστικά
    var total = filtered.length;
    var full = 0, actDays = 0, waterSum = 0;
    filtered.forEach(function (k) {
      var d = db[k];
      if (mealsDoneCount(d) === MEALS.length) full++;
      if (d.activity && (d.activity.type || "").trim()) actDays++;
      waterSum += getWaterMl(d);
    });
    var streak = calcStreak();
    $("historyStats").innerHTML =
      stat(total, "καταγεγραμμένες ημέρες") +
      stat(full, "πλήρεις ημέρες (5/5)") +
      stat(actDays, "ημέρες με δραστηριότητα") +
      stat(total ? Math.round(waterSum / total) : 0, "μ.ό. ml νερού / ημέρα") +
      stat(streak, "σερί ημερών 🔥");

    var list = $("historyList");
    if (!filtered.length) {
      list.innerHTML = "<div class='empty'>Δεν υπάρχουν καταγραφές" + (q || month ? " με αυτά τα φίλτρα" : " ακόμη") + ".<br>Ξεκίνα από την καρτέλα «Ημέρα»! 🍽️</div>";
      return;
    }
    list.innerHTML = filtered.map(function (k) {
      var d = db[k];
      var date = parseKey(k);
      var pips = MEALS.map(function (m) {
        return "<span class='hpip" + (mealDone(d, m) ? " on" : "") + "' title='" + esc(m.name) + "'>" + m.emoji + "</span>";
      }).join("");
      var rows = MEALS.map(function (m) {
        var vals = m.slots.map(function (s) {
          var v = (d.meals[m.id] || {})[s.id] || "";
          if (!v) return "";
          return m.slots.length === 1
            ? "<span class='part'>" + esc(v).replace(/\n/g, "<br>") + "</span>"
            : "<span class='part'><b>" + esc(SLOT_SHORT[s.id]) + ":</b> " + esc(v) + "</span>";
        }).filter(Boolean).join("");
        var tm = ((d.times || {})[m.id] || "").trim();
        var label = m.emoji + " " + esc(m.name) + (tm ? " <span class='htime'>🕐 " + esc(tm) + "</span>" : "");
        return (vals || tm) ? "<div class='hrow'><span class='hm'>" + label + "</span><span class='hv'>" + (vals || "—") + "</span></div>" : "";
      }).filter(Boolean).join("");
      var extra = "";
      if (d.activity && (d.activity.type || d.activity.duration || d.activity.time)) {
        extra += "<div class='hrow'><span class='hm'>🏃 Δραστηριότητα" +
          (d.activity.time ? " <span class='htime'>🕐 " + esc(d.activity.time) + "</span>" : "") + "</span><span class='hv'>" +
          esc(d.activity.type || "—") + (d.activity.duration ? " · " + esc(d.activity.duration) : "") + "</span></div>";
      }
      var wml = getWaterMl(d);
      if (wml) extra += "<div class='hrow'><span class='hm'>💧 Νερό</span><span class='hv'>" + wml + " ml</span></div>";
      if ((d.notes || "").trim()) extra += "<div class='hrow'><span class='hm'>📝 Σημειώσεις</span><span class='hv'>" + esc(d.notes) + "</span></div>";
      return "<details class='hday'><summary>" +
        "<span class='hdate'>" + fmtGr(k) + "</span>" +
        "<span class='hdow'>" + DOW[date.getDay()] + "</span>" +
        "<span class='hmeals'>" + pips + "</span></summary>" +
        "<div class='hbody'>" + (rows + extra || "<p class='hint'>Κενή ημέρα</p>") +
        "<div class='hactions'><button class='ghost-btn tiny' data-edit='" + k + "'>✏️ Επεξεργασία</button></div>" +
        "</div></details>";
    }).join("");
  }
  function stat(v, k) { return "<div class='stat'><div class='v'>" + v + "</div><div class='k'>" + k + "</div></div>"; }
  function calcStreak() {
    var n = 0;
    var d = new Date();
    if (!dayHasData(db[keyOf(d)])) d.setDate(d.getDate() - 1); // το σήμερα δεν σπάει το σερί αν δεν έχει συμπληρωθεί ακόμη
    while (dayHasData(db[keyOf(d)])) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  $("historySearch").addEventListener("input", renderHistory);
  $("historyMonth").addEventListener("change", renderHistory);
  $("historyList").addEventListener("click", function (e) {
    var b = e.target.closest("[data-edit]");
    if (!b) return;
    goToDay(b.dataset.edit);
    showView("day");
  });

  /* ============================================================
     ΕΞΑΓΩΓΗ
     ============================================================ */
  function initExportRange() {
    var keys = sortedKeys();
    if (!$("expFrom").value) $("expFrom").value = keys.length ? keys[0] : todayKey();
    if (!$("expTo").value) $("expTo").value = keys.length ? keys[keys.length - 1] : todayKey();
  }
  $("rangeAll").addEventListener("click", function () {
    var keys = sortedKeys();
    $("expFrom").value = keys.length ? keys[0] : todayKey();
    $("expTo").value = keys.length ? keys[keys.length - 1] : todayKey();
  });
  $("rangeMonth").addEventListener("click", function () {
    var d = new Date();
    $("expFrom").value = keyOf(new Date(d.getFullYear(), d.getMonth(), 1));
    $("expTo").value = keyOf(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  });
  function rangeKeys() {
    var from = $("expFrom").value || "0000-00-00";
    var to = $("expTo").value || "9999-99-99";
    if (from > to) { var t = from; from = to; to = t; }
    return sortedKeys().filter(function (k) { return k >= from && k <= to; });
  }
  function requireData(keys) {
    if (!keys.length) { toast("Δεν υπάρχουν καταγραφές σε αυτό το εύρος."); return false; }
    return true;
  }

  /* --- Excel: αναλυτικός πίνακας (μία γραμμή ανά ημέρα) --- */
  function exportDetailXlsx() {
    var keys = rangeKeys();
    if (!requireData(keys)) return;
    var head = ["Ημερομηνία", "Ημέρα"];
    MEALS.forEach(function (m) {
      head.push(m.name + " — Ώρα");
      m.slots.forEach(function (s) { head.push(m.name + " — " + SLOT_SHORT[s.id]); });
    });
    head.push("Δραστηριότητα (ώρα)", "Δραστηριότητα (είδος)", "Δραστηριότητα (διάρκεια)", "Νερό (ml)", "Σημειώσεις");
    var rows = [head.map(function (h) { return { v: h, s: "head" }; })];
    keys.forEach(function (k) {
      var d = db[k];
      var row = [{ v: fmtGr(k), s: "bold" }, DOW[parseKey(k).getDay()]];
      MEALS.forEach(function (m) {
        row.push((d.times || {})[m.id] || "");
        m.slots.forEach(function (s) { row.push((d.meals[m.id] || {})[s.id] || ""); });
      });
      row.push(d.activity.time || "", d.activity.type || "", d.activity.duration || "", getWaterMl(d) || 0, d.notes || "");
      rows.push(row);
    });
    var cols = [12, 12];
    for (var i = 2; i < head.length; i++) cols.push(head[i].indexOf("Ώρα") !== -1 ? 12 : 20);
    MiniXLSX.download("Ημερολόγιο_Διατροφής_" + currentUser().name + "_" + keys[0] + "_" + keys[keys.length - 1] + ".xlsx",
      [{ name: "Ημερολόγιο", cols: cols, rows: rows }]);
    toast("Το Excel κατέβηκε ✓");
  }

  /* --- Excel: μορφή ημερολογίου — πιστή αναπαραγωγή του εντύπου Word «ΣΥΝΔΥΑΣΜΟΙ ΤΡΟΦΩΝ» --- */
  var MEAL_XSTYLE = { proino: "vProino", progevma: "vDuo", gevma: "vGevma", apogevmatino: "vDuo", vradino: "vVradino" };
  var FORM_NOTE = "ΕΦΑΡΜΟΖΕΤΕ ΠΑΝΤΑ ΤΟΥΣ ΣΩΣΤΟΥΣ ΣΥΝΔΥΑΣΜΟΥΣ ΣΕ ΚΑΘΕ ΚΟΥΤΑΚΙ ΑΝΑΛΟΓΑ ΜΕ ΤΙΣ 3ΑΔΕΣ Ή ΤΙΣ 2ΑΔΕΣ ΚΑΘΕ ΓΕΥΜΑΤΟΣ";
  function exportCalendarXlsx(fromKey, toKey, labelWord) {
    var from = fromKey, to = toKey;
    if (!from) { var ks = rangeKeys(); if (!requireData(ks)) return; from = ks[0]; to = ks[ks.length - 1]; }
    var start = mondayOf(parseKey(from));
    var endD = parseKey(to);
    var sheets = [];
    while (start <= endD) {
      var keys = weekKeys(start);
      var anyData = keys.some(function (k) { return dayHasData(db[k]); });
      if (anyData || fromKey) {
        var rows = [], heights = [];

        // Γρ.1-2: τίτλος (συγχώνευση A1:B2) + ημερομηνίες + ημέρες (ΚΥΡΙΑΚΗ ροζ όπως στο έντυπο)
        var r1 = [{ v: "ΣΥΝΔΥΑΣΜΟΙ ΤΡΟΦΩΝ", s: "title" }, { v: "", s: "title" }];
        keys.forEach(function (k) { r1.push({ v: fmtGr(k), s: "date" }); });
        rows.push(r1); heights.push(24);
        var r2 = [{ v: "", s: "title" }, { v: "", s: "title" }];
        keys.forEach(function (k, i) {
          r2.push({ v: grUpper(DOW[parseKey(k).getDay()]), s: i === 6 ? "dowSun" : "dow" });
        });
        rows.push(r2); heights.push(22);

        // Γρ.3-7: γεύματα — 3ΑΔΑ/2ΑΔΕΣ, κάθετο χρωματιστό όνομα γεύματος, 7 κουτάκια ημερών
        MEALS.forEach(function (m) {
          var r = [
            { v: m.type === "2άδα" ? "2ΑΔΕΣ" : "3ΑΔΑ", s: "mealtag" },
            { v: grUpper(m.name), s: MEAL_XSTYLE[m.id] }
          ];
          keys.forEach(function (k) {
            var d = db[k], lines = [];
            if (d) {
              var tm = ((d.times || {})[m.id] || "").trim();
              if (tm) lines.push("Ώρα: " + tm);
              if (d.meals && d.meals[m.id]) {
                m.slots.forEach(function (s) {
                  var v = (d.meals[m.id][s.id] || "").trim();
                  if (v) lines.push(m.slots.length === 1 ? v : SLOT_SHORT[s.id] + ": " + v);
                });
              }
            }
            r.push({ v: lines.join("\n"), s: "cell" });
          });
          rows.push(r);
          heights.push(m.type === "2άδα" ? 58 : 76);
        });

        // Γρ.8-9: σημείωση εντύπου (A8:B9) + ΦΥΣΙΚΗ ΔΡΑΣΤΗΡΙΟΤΗΤΑ με ΕΙΔΟΣ/ΔΙΑΡΚΕΙΑ
        var r8 = [{ v: FORM_NOTE, s: "note" }, { v: "", s: "note" }];
        keys.forEach(function () { r8.push({ v: "ΦΥΣΙΚΗ ΔΡΑΣΤΗΡΙΟΤΗΤΑ", s: "acthead" }); });
        rows.push(r8); heights.push(16);
        var r9 = [{ v: "", s: "note" }, { v: "", s: "note" }];
        keys.forEach(function (k) {
          var d = db[k];
          var t = (d && d.activity && d.activity.type) || "";
          var tm = (d && d.activity && d.activity.time) || "";
          var du = (d && d.activity && d.activity.duration) || "";
          r9.push({ v: "ΕΙΔΟΣ: " + t + "\nΩΡΑ: " + tm + "\nΔΙΑΡΚΕΙΑ: " + du, s: "cell" });
        });
        rows.push(r9); heights.push(52);

        // Γρ.10-11: νερό & σημειώσεις (δικά μας πεδία, στο ίδιο ύφος)
        var r10 = [{ v: "ΝΕΡΟ (ml)", s: "mealtag" }, { v: "", s: "mealtag" }];
        keys.forEach(function (k) { r10.push({ v: getWaterMl(db[k]) || "", s: "cell" }); });
        rows.push(r10); heights.push(20);
        var r11 = [{ v: "ΣΗΜΕΙΩΣΕΙΣ", s: "mealtag" }, { v: "", s: "mealtag" }];
        keys.forEach(function (k) { r11.push({ v: db[k] ? (db[k].notes || "") : "", s: "cell" }); });
        rows.push(r11); heights.push(38);

        var d0 = keys[0].split("-");
        sheets.push({
          name: "Εβδ " + d0[2] + "." + d0[1] + "." + d0[0].slice(2),
          cols: [15, 4.5, 18, 18, 18, 18, 18, 18, 18],
          rows: rows,
          heights: heights,
          merges: ["A1:B2", "A8:B9", "A10:B10", "A11:B11"],
          landscape: true
        });
      }
      start = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
    }
    if (!sheets.length) { toast("Δεν υπάρχουν καταγραφές σε αυτό το εύρος."); return; }
    MiniXLSX.download("Ημερολόγιο_" + currentUser().name + "_" + (labelWord || "ημερολόγιο") + "_" + from + "_" + to + ".xlsx", sheets);
    toast("Το Excel κατέβηκε ✓");
  }

  /* --- CSV --- */
  function exportCsv() {
    var keys = rangeKeys();
    if (!requireData(keys)) return;
    function q(s) { return '"' + String(s == null ? "" : s).replace(/"/g, '""') + '"'; }
    var head = ["Ημερομηνία", "Ημέρα"];
    MEALS.forEach(function (m) {
      head.push(m.name + " - Ώρα");
      m.slots.forEach(function (s) { head.push(m.name + " - " + SLOT_SHORT[s.id]); });
    });
    head.push("Δραστηριότητα (ώρα)", "Δραστηριότητα (είδος)", "Δραστηριότητα (διάρκεια)", "Νερό (ml)", "Σημειώσεις");
    var lines = [head.map(q).join(";")];
    keys.forEach(function (k) {
      var d = db[k];
      var row = [fmtGr(k), DOW[parseKey(k).getDay()]];
      MEALS.forEach(function (m) {
        row.push((d.times || {})[m.id] || "");
        m.slots.forEach(function (s) { row.push((d.meals[m.id] || {})[s.id] || ""); });
      });
      row.push(d.activity.time || "", d.activity.type || "", d.activity.duration || "", getWaterMl(d) || 0, d.notes || "");
      lines.push(row.map(q).join(";"));
    });
    // BOM ώστε το Excel να διαβάσει σωστά τα ελληνικά· ";" ως διαχωριστικό για ελληνικές τοπικές ρυθμίσεις
    var blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "Ημερολόγιο_Διατροφής_" + currentUser().name + "_" + keys[0] + "_" + keys[keys.length - 1] + ".csv";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
    toast("Το CSV κατέβηκε ✓");
  }

  /* --- JSON backup / restore --- */
  function exportJson() {
    var blob = new Blob([JSON.stringify({ app: "imerologio-diatrofis", version: 2, user: currentUser().name, exported: new Date().toISOString(), data: db }, null, 2)],
      { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "imerologio-backup-" + currentUser().name + "-" + todayKey() + ".json";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
    toast("Το αντίγραφο κατέβηκε ✓");
  }
  $("impJsonBtn").addEventListener("click", function () { $("impJson").click(); });
  $("impJson").addEventListener("change", function () {
    var f = this.files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var obj = JSON.parse(reader.result);
        var data = obj && obj.data ? obj.data : obj;
        if (typeof data !== "object" || Array.isArray(data)) throw new Error("bad");
        var count = 0;
        Object.keys(data).forEach(function (k) {
          if (/^\d{4}-\d{2}-\d{2}$/.test(k) && data[k] && data[k].meals) {
            db[k] = migrateDayShape(data[k]);
            count++;
            pushDay(profiles.current, k);
          }
        });
        persist();
        renderDay();
        updateFootStats();
        $("importMsg").textContent = "Εισήχθησαν " + count + " ημέρες ✓";
        toast("Η εισαγωγή ολοκληρώθηκε ✓");
      } catch (e) {
        $("importMsg").textContent = "Μη έγκυρο αρχείο αντιγράφου.";
        toast("Μη έγκυρο αρχείο");
      }
      $("impJson").value = "";
    };
    reader.readAsText(f);
  });

  /* --- Εκτύπωση --- */
  function printHistory() {
    showView("history");
    $("view-history").classList.add("print-target");
    document.querySelectorAll("#historyList details").forEach(function (d) { d.open = true; });
    setTimeout(function () {
      window.print();
      $("view-history").classList.remove("print-target");
    }, 150);
  }

  $("expXlsx").addEventListener("click", exportDetailXlsx);
  $("expXlsxWeeks").addEventListener("click", function () { exportCalendarXlsx(null, null, "ημερολόγιο"); });
  $("expCsv").addEventListener("click", exportCsv);
  $("expJson").addEventListener("click", exportJson);
  $("expPrint").addEventListener("click", printHistory);

  $("wipeAll").addEventListener("click", function () {
    if (!confirm("ΠΡΟΣΟΧΗ: Θα διαγραφούν ΟΛΕΣ οι καταγραφές του χρήστη «" + currentUser().name + "» οριστικά. Συνέχεια;")) return;
    if (!confirm("Σίγουρα; Δεν υπάρχει επαναφορά (εκτός αν έχεις αντίγραφο .json).")) return;
    db = {};
    persist();
    wipeRemoteDays(profiles.current);
    renderDay();
    renderHistory();
    updateFootStats();
    toast("Όλα τα δεδομένα διαγράφηκαν");
  });

  /* ============================================================
     ΧΡΗΣΤΕΣ: εναλλαγή, δημιουργία, διαγραφή
     ============================================================ */
  function renderUserButton() {
    var u = currentUser();
    var av = $("userAvatar");
    av.textContent = (u.name || "?").trim().charAt(0).toUpperCase();
    av.style.background = avatarColor(u.id);
    $("userName").textContent = u.name;
  }
  function renderUserList() {
    var list = $("userList");
    list.innerHTML = profiles.users.map(function (u) {
      var days = userDayCount(u.id);
      return "<div class='user-row" + (u.id === profiles.current ? " current" : "") + "' data-user='" + esc(u.id) + "'>" +
        "<span class='user-avatar' style='background:" + avatarColor(u.id) + "'>" + esc((u.name || "?").trim().charAt(0).toUpperCase()) + "</span>" +
        "<span class='u-name'>" + esc(u.name) + (u.id === profiles.current ? " <small>· ενεργός</small>" : "") + "</span>" +
        "<span class='u-days'>" + days + (days === 1 ? " ημέρα" : " ημέρες") + "</span>" +
        (profiles.users.length > 1 ? "<button type='button' class='u-del' data-del='" + esc(u.id) + "' title='Διαγραφή χρήστη' aria-label='Διαγραφή χρήστη " + esc(u.name) + "'>🗑</button>" : "") +
        "</div>";
    }).join("");
  }
  var lockedPick = false; // στο άνοιγμα της σελίδας πρέπει πρώτα να διαλέξεις λογαριασμό
  function openUserModal(locked) {
    lockedPick = !!locked;
    $("userClose").hidden = lockedPick;
    $("userModalTitle").textContent = lockedPick ? "👤 Ποιος καταγράφει;" : "👤 Χρήστες";
    renderUserList();
    $("newUserName").value = "";
    $("userOverlay").hidden = false;
  }
  function closeUserModal() {
    if (lockedPick) return; // κλείνει μόνο με επιλογή χρήστη
    $("userOverlay").hidden = true;
  }

  function refreshAllViews() {
    renderDay();
    renderWeek();
    renderHistory();
    updateFootStats();
    renderUserButton();
  }
  function switchUser(id) {
    lockedPick = false; // η επιλογή χρήστη ξεκλειδώνει το παράθυρο εκκίνησης
    if (id === profiles.current) { closeUserModal(); return; }
    clearTimeout(saveDebounce);
    saveCurrentDay();
    profiles.current = id;
    persistProfiles();
    db = loadDb();
    refreshAllViews();
    attachSync();
    closeUserModal();
    toast("Χρήστης: " + currentUser().name + " 👤");
  }

  $("userBtn").addEventListener("click", function () { openUserModal(false); });
  $("userClose").addEventListener("click", closeUserModal);
  $("userOverlay").addEventListener("click", function (e) {
    if (e.target === this) closeUserModal();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !$("userOverlay").hidden) closeUserModal();
  });

  $("userList").addEventListener("click", function (e) {
    var del = e.target.closest("[data-del]");
    if (del) {
      var uid = del.dataset.del;
      var u = null;
      profiles.users.forEach(function (x) { if (x.id === uid) u = x; });
      if (!u) return;
      var days = userDayCount(uid);
      if (!confirm("Να διαγραφεί ο χρήστης «" + u.name + "»" + (days ? " και οι " + days + " καταγεγραμμένες ημέρες του" : "") + "; Δεν υπάρχει επαναφορά.")) return;
      profiles.users = profiles.users.filter(function (x) { return x.id !== uid; });
      try { localStorage.removeItem(storeKeyFor(uid)); } catch (err) {}
      wipeRemoteDays(uid);
      if (profiles.current === uid) {
        profiles.current = profiles.users[0].id;
        db = loadDb();
        refreshAllViews();
        attachSync();
      }
      profiles.up = Date.now();
      persistProfiles();
      pushProfiles();
      renderUserList();
      toast("Ο χρήστης διαγράφηκε");
      return;
    }
    var row = e.target.closest("[data-user]");
    if (row) switchUser(row.dataset.user);
  });

  $("newUserForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var name = $("newUserName").value.trim();
    if (!name) { $("newUserName").focus(); return; }
    var exists = profiles.users.some(function (u) { return u.name.toLowerCase() === name.toLowerCase(); });
    if (exists) { toast("Υπάρχει ήδη χρήστης με αυτό το όνομα"); return; }
    var id = "u" + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
    profiles.users.push({ id: id, name: name });
    profiles.up = Date.now();
    persistProfiles();
    pushProfiles();
    toast("Δημιουργήθηκε ο χρήστης «" + name + "» ✓");
    switchUser(id);
  });

  /* ============================================================
     ONLINE ΣΥΓΧΡΟΝΙΣΜΟΣ (Firebase Firestore)
     Τα δεδομένα κάθε χρήστη αποθηκεύονται στο cloud κάτω από έναν
     «κωδικό οικογένειας» και συγχρονίζονται ζωντανά σε όλες τις συσκευές.
     Το τοπικό localStorage παραμένει ως πρόχειρο/offline αντίγραφο.
     ============================================================ */
  var FAMILY_KEY = "imerologio-family";
  var FB_CONFIG = {
    apiKey: "AIzaSyAMt2dugXL7dVczFZQCVkf7tsHjDBA7W4A",
    authDomain: "food-diary-cee75.firebaseapp.com",
    projectId: "food-diary-cee75",
    storageBucket: "food-diary-cee75.firebasestorage.app",
    messagingSenderId: "984339913279",
    appId: "1:984339913279:web:d6234a22bbacffa8a2368a"
  };
  var DEFAULT_FAMILY = "diatrofi-2026"; // αυτόματος κωδικός — οικογενειακή χρήση
  var familyCode = "";
  try {
    familyCode = localStorage.getItem(FAMILY_KEY) || "";
    // Μία φορά: ενεργοποίηση με τον προεπιλεγμένο κωδικό (και σε συσκευές που είχαν πατήσει «χωρίς online»)
    if (!localStorage.getItem(FAMILY_KEY + "-autoset")) {
      if (!familyCode || familyCode === "__off__") {
        familyCode = DEFAULT_FAMILY;
        localStorage.setItem(FAMILY_KEY, familyCode);
      }
      localStorage.setItem(FAMILY_KEY + "-autoset", "1");
    }
  } catch (e) { familyCode = familyCode || DEFAULT_FAMILY; }
  var fdb = null, daysUnsub = null, profUnsub = null;

  function syncEnabled() { return !!(fdb && familyCode && familyCode !== "__off__"); }
  function setSyncStatus(txt) {
    $("syncStatus").textContent = txt;
    updateSyncCard();
  }
  function updateSyncCard() {
    var el = $("syncInfo");
    if (!el) return;
    if (familyCode === "__off__") {
      el.textContent = "Απενεργοποιημένος — τα δεδομένα μένουν μόνο σε αυτή τη συσκευή.";
    } else if (familyCode) {
      el.textContent = "Κωδικός οικογένειας: «" + familyCode + "». " + ($("syncStatus").textContent || "Τα δεδομένα συγχρονίζονται μέσω cloud (Firebase).");
    } else {
      el.textContent = "Δεν έχει οριστεί κωδικός οικογένειας.";
    }
  }

  function initFirebase() {
    if (!familyCode || familyCode === "__off__") { setSyncStatus(familyCode === "__off__" ? "Χωρίς online συγχρονισμό" : ""); return; }
    if (!window.firebase || !firebase.firestore) { setSyncStatus("Ο συγχρονισμός δεν φόρτωσε (χωρίς σύνδεση;)"); return; }
    try {
      if (!firebase.apps.length) firebase.initializeApp(FB_CONFIG);
      fdb = firebase.firestore();
      attachSync();
    } catch (e) { setSyncStatus("Σφάλμα συγχρονισμού"); }
  }
  function famDoc() { return fdb.collection("families").doc(familyCode); }
  function daysCol(uid) { return famDoc().collection("users").doc(uid).collection("days"); }

  function remoteRefresh() {
    // μην πατήσεις πάνω σε κείμενο που πληκτρολογείται τώρα
    var ae = document.activeElement;
    var editing = ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA") && ae.closest("#view-day");
    if (!editing) renderDay();
    renderWeek();
    renderHistory();
    updateFootStats();
  }

  function attachSync() {
    if (!syncEnabled()) return;
    if (daysUnsub) { daysUnsub(); daysUnsub = null; }
    if (profUnsub) { profUnsub(); profUnsub = null; }
    var uid = profiles.current;
    setSyncStatus("☁️ Συγχρονισμός…");

    var firstSnap = true;
    daysUnsub = daysCol(uid).onSnapshot(function (snap) {
      var changed = false;
      snap.docChanges().forEach(function (ch) {
        if (ch.doc.metadata.hasPendingWrites) return; // δικές μας τοπικές αλλαγές
        var k = ch.doc.id;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) return;
        if (ch.type === "removed") {
          if (db[k]) { delete db[k]; changed = true; }
          return;
        }
        var remote = migrateDayShape(ch.doc.data()); // παλιά δομή από μη ενημερωμένη συσκευή
        var loc = db[k];
        if (!loc || (remote.up || 0) >= (loc.up || 0)) {
          if (JSON.stringify(remote) !== JSON.stringify(loc || null)) { db[k] = remote; changed = true; }
        }
      });
      var wasFirst = firstSnap;
      if (firstSnap) {
        firstSnap = false;
        // πρώτη σύνδεση: ανέβασε τοπικές ημέρες που δεν υπάρχουν στο cloud
        var have = {};
        snap.forEach(function (doc) { have[doc.id] = 1; });
        Object.keys(db).forEach(function (k) {
          if (!have[k] && dayHasData(db[k])) pushDay(uid, k);
        });
      }
      if (changed) { persist(); remoteRefresh(); }
      if (wasFirst) maybeCloudSnapshot(uid); // ημερήσιο αντίγραφο ασφαλείας
      setSyncStatus("☁️ Συγχρονισμός ενεργός ✓");
    }, function (err) {
      setSyncStatus("☁️ Σφάλμα συγχρονισμού — τα δεδομένα μένουν τοπικά");
    });

    profUnsub = famDoc().collection("meta").doc("profiles").onSnapshot(function (doc) {
      if (doc.metadata.hasPendingWrites) return;
      var remote = doc.data();
      if (!remote || !remote.users || !remote.users.length) { pushProfiles(); return; }
      if ((remote.up || 0) > (profiles.up || 0)) {
        var curId = profiles.current;
        profiles.users = remote.users;
        profiles.up = remote.up;
        profiles.current = profiles.users.some(function (u) { return u.id === curId; }) ? curId : profiles.users[0].id;
        persistProfiles();
        renderUserButton();
        if (!$("userOverlay").hidden) renderUserList();
      } else if ((remote.up || 0) < (profiles.up || 0)) {
        pushProfiles();
      }
    }, function () {});
  }

  function pushDay(uid, k, oldData) {
    if (!syncEnabled()) return;
    try {
      var d = db[k];
      if (d) {
        daysCol(uid).doc(k).set(JSON.parse(JSON.stringify(d)));
      } else {
        if (oldData) trashPut(uid, k, oldData); // δικλείδα: πρώτα στον «κάδο», μετά διαγραφή
        daysCol(uid).doc(k).delete();
      }
    } catch (e) {}
  }
  function trashPut(uid, k, data) {
    try {
      famDoc().collection("trash").doc(uid + "_" + k + "_" + Date.now()).set({
        uid: uid, day: k, deletedAt: Date.now(), data: JSON.parse(JSON.stringify(data))
      });
    } catch (e) {}
  }
  /* Ημερήσιο αντίγραφο ασφαλείας ανά χρήστη στο cloud (κρατάμε τα 30 τελευταία) */
  function maybeCloudSnapshot(uid) {
    if (!syncEnabled()) return;
    var id = uid + "_" + todayKey();
    var ref = famDoc().collection("backups").doc(id);
    ref.get().then(function (doc) {
      if (doc && doc.exists) return; // ήδη υπάρχει σημερινό
      ref.set({ uid: uid, date: todayKey(), at: Date.now(), data: JSON.parse(JSON.stringify(db)) });
      famDoc().collection("backups").get().then(function (snap) {
        var mine = [];
        snap.forEach(function (d) {
          var v = d.data();
          if (v && v.uid === uid) mine.push({ date: v.date || "", ref: d.ref });
        });
        mine.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
        mine.slice(0, Math.max(0, mine.length - 30)).forEach(function (x) { x.ref.delete(); });
      }).catch(function () {});
    }).catch(function () {});
  }
  function pushProfiles() {
    if (!syncEnabled()) return;
    try {
      famDoc().collection("meta").doc("profiles").set({
        users: JSON.parse(JSON.stringify(profiles.users)),
        up: profiles.up || Date.now()
      });
    } catch (e) {}
  }
  function wipeRemoteDays(uid) {
    if (!syncEnabled()) return;
    daysCol(uid).get().then(function (snap) {
      var docs = [];
      snap.forEach(function (doc) { docs.push(doc); });
      var stamp = Date.now();
      for (var i = 0; i < docs.length; i += 200) { // όριο 500 πράξεων ανά batch
        var batch = fdb.batch();
        docs.slice(i, i + 200).forEach(function (doc) {
          batch.set(famDoc().collection("trash").doc(uid + "_" + doc.id + "_" + stamp),
            { uid: uid, day: doc.id, deletedAt: stamp, data: doc.data() });
          batch.delete(doc.ref);
        });
        batch.commit();
      }
    }).catch(function () {});
  }

  /* Κωδικός οικογένειας — παράθυρο πρώτης εκκίνησης */
  function saveFamilyCode(code) {
    familyCode = code;
    try { localStorage.setItem(FAMILY_KEY, code); } catch (e) {}
    updateSyncCard();
  }
  $("famForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var code = $("famCode").value.trim().toLowerCase();
    if (code.length < 4) { toast("Βάλε κωδικό τουλάχιστον 4 χαρακτήρων"); return; }
    if (/[\/\.\[\]\*#]/.test(code)) { toast("Χωρίς σύμβολα / . [ ] * #"); return; }
    saveFamilyCode(code);
    $("famOverlay").hidden = true;
    initFirebase();
    openUserModal(true);
  });
  $("famSkip").addEventListener("click", function () {
    saveFamilyCode("__off__");
    $("famOverlay").hidden = true;
    openUserModal(true);
  });
  $("syncChange").addEventListener("click", function () {
    var code = prompt("Κωδικός οικογένειας (ίδιος σε όλες τις συσκευές):", familyCode === "__off__" ? "" : familyCode);
    if (code == null) return;
    code = code.trim().toLowerCase();
    if (code.length < 4) { toast("Βάλε κωδικό τουλάχιστον 4 χαρακτήρων"); return; }
    saveFamilyCode(code);
    location.reload(); // καθαρή επανεκκίνηση συγχρονισμού
  });
  $("syncOff").addEventListener("click", function () {
    if (!confirm("Να απενεργοποιηθεί ο online συγχρονισμός σε αυτή τη συσκευή; (Τα δεδομένα στο cloud δεν διαγράφονται.)")) return;
    saveFamilyCode("__off__");
    location.reload();
  });

  /* ---------- Footer ---------- */
  function updateFootStats() {
    var keys = sortedKeys();
    $("footStats").textContent = keys.length
      ? keys.length + " καταγεγραμμένες ημέρες · πρώτη: " + fmtGr(keys[0])
      : "Καμία καταγραφή ακόμη";
  }

  /* ---------- Εκκίνηση ---------- */
  renderUserButton();
  renderDay();
  updateFootStats();
  updateSyncCard();
  initFirebase();
  openUserModal(true); // στο άνοιγμα διαλέγεις πάντα λογαριασμό
})();
