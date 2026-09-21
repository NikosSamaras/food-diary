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
  var LANG_KEY = "imerologio-lang";

  /* ============================================================
     Γλώσσα (ΕΛ/EN) — οι μεταφράσεις όλου του περιβάλλοντος.
     Το Excel «μορφή εντύπου» μένει πάντα ελληνικό (αντίγραφο του Word).
     ============================================================ */
  var lang = "el";
  try { lang = localStorage.getItem(LANG_KEY) === "en" ? "en" : "el"; } catch (e) {}
  var T = {
    el: {
      tab_day: "Ημέρα", tab_week: "Εβδομάδα", tab_history: "Ιστορικό", tab_guide: "Οδηγός", tab_export: "Εξαγωγή",
      today_btn: "Σήμερα", today_suffix: " · Σήμερα",
      progress: "{n} από {t} γεύματα συμπληρωμένα", saved: "Αποθηκεύτηκε ✓",
      meal_proino: "Πρωινό", meal_progevma: "Προγεύμα", meal_gevma: "Γεύμα", meal_apogevmatino: "Απογευματινό", meal_vradino: "Βραδινό",
      what_ate: "Τι έφαγες;", meal_ph: "π.χ. τοστ με τυρί, χυμός πορτοκάλι…", meal_time: "Ώρα γεύματος",
      chip_fresh: "Φρέσκια", chip_animal: "Ζωική", chip_starch: "Άμυλο/Καρποί", chip_fruit: "Φρούτα", chip_snack: "Snack/Καρποί",
      tag3: "3άδα", tag2: "2άδα",
      act_title: "Φυσική Δραστηριότητα", act_type: "Είδος", act_time: "Ώρα", act_dur: "Διάρκεια",
      act_type_ph: "π.χ. περπάτημα, γυμναστήριο…", act_dur_ph: "π.χ. 45 λεπτά",
      act_add: "➕ Προσθήκη δραστηριότητας", act_del: "Αφαίρεση δραστηριότητας",
      extra_add: "➕ Ενδιάμεσο γεύμα", extra_default: "Ενδιάμεσο", extra_name_ph: "Όνομα (π.χ. Ενδιάμεσο, Σνακ…)",
      extra_del: "Αφαίρεση γεύματος", extra_time: "Ώρα", week_extras: "🍴 Ενδιάμεσα", x_extras: "Ενδιάμεσα γεύματα",
      mv_up: "Μετακίνηση πάνω", mv_down: "Μετακίνηση κάτω",
      sk_title: "Ύπνος & Κενώσεις", sk_sleep: "Ώρες ύπνου", sk_hours: "ώρες", sk_ken: "Κενώσεις", sk_times: "φορές", reset: "Μηδενισμός",
      wn_title: "Νερό & Σημειώσεις", wn_water: "Νερό", notes_label: "Σημειώσεις ημέρας", notes_ph: "Πώς ένιωσες, πείνα, ύπνος, οτιδήποτε άλλο…",
      clear_day: "Καθαρισμός ημέρας",
      week_hint: "Πάτησε σε οποιοδήποτε κελί για να επεξεργαστείς εκείνη την ημέρα.",
      week_this: "Τρέχουσα", week_export: "Εξαγωγή εβδομάδας σε Excel", week_meal_col: "Γεύμα",
      week_extra: "🌙 Ύπνος · 🚽 Κεν. · 💧 Νερό", week_act: "🏃 Φυσική Δραστ.",
      hist_search_ph: "Αναζήτηση τροφής, δραστηριότητας, σημείωσης…", all_months: "Όλοι οι μήνες",
      st_days: "καταγεγραμμένες ημέρες", st_full: "πλήρεις ημέρες (5/5)", st_act: "ημέρες με δραστηριότητα",
      st_water: "μ.ό. ml νερού / ημέρα", st_sleep: "μ.ό. ώρες ύπνου 🌙", st_ken: "μ.ό. κενώσεις / ημέρα 🚽", st_streak: "σερί ημερών 🔥",
      hist_empty: "Δεν υπάρχουν καταγραφές{f}.<br>Ξεκίνα από την καρτέλα «Ημέρα»! 🍽️", hist_empty_f: " με αυτά τα φίλτρα", hist_empty_yet: " ακόμη",
      hist_edit: "✏️ Επεξεργασία", hist_empty_day: "Κενή ημέρα",
      h_act: "🏃 Δραστηριότητα", h_sleep: "🌙 Ύπνος", h_ken: "🚽 Κενώσεις", h_water: "💧 Νερό", h_notes: "📝 Σημειώσεις",
      hour1: " ώρα", hourN: " ώρες", time1: " φορά", timeN: " φορές",
      exp_title: "Εξαγωγή σε Excel", exp_hint: "Διάλεξε εύρος ημερομηνιών και κατέβασε αρχείο .xlsx που ανοίγει απευθείας στο Excel.",
      exp_from: "Από", exp_to: "Έως", range_all: "Όλα", range_month: "Τρέχων μήνας",
      btn_detail: "📊 Excel — αναλυτικός πίνακας", btn_cal: "📅 Excel — μορφή ημερολογίου", btn_csv: "CSV (.csv)", btn_print: "Εκτύπωση / PDF",
      backup_title: "Αντίγραφο ασφαλείας", backup_hint: "Με ενεργό συγχρονισμό τα δεδομένα αποθηκεύονται και online. Το αντίγραφο .json παραμένει χρήσιμο ως εφεδρεία.",
      backup_dl: "⬇ Λήψη αντιγράφου (.json)", backup_up: "⬆ Εισαγωγή αντιγράφου",
      sync_title: "☁️ Online συγχρονισμός", sync_change: "Ορισμός / αλλαγή κωδικού οικογένειας", sync_off_btn: "Απενεργοποίηση συγχρονισμού",
      wipe_title: "Διαγραφή όλων", wipe_hint: "Σβήνει οριστικά όλες τις καταγραφές από αυτόν τον browser.", wipe_btn: "Διαγραφή όλων των δεδομένων",
      foot_none: "Καμία καταγραφή ακόμη", foot_days: "{n} καταγεγραμμένες ημέρες · πρώτη: {d}",
      who: "👤 Ποιος καταγράφει;", users_title: "👤 Χρήστες", u_active: " · ενεργός", u_day1: " ημέρα", u_dayN: " ημέρες",
      new_user_ph: "Όνομα νέου χρήστη…", create_btn: "➕ Δημιουργία",
      user_hint: "Κάθε χρήστης έχει το δικό του ημερολόγιο σε αυτή τη συσκευή.",
      del_user_title: "Διαγραφή χρήστη",
      no_range: "Δεν υπάρχουν καταγραφές σε αυτό το εύρος.",
      xlsx_ok: "Το Excel κατέβηκε ✓", csv_ok: "Το CSV κατέβηκε ✓", backup_ok: "Το αντίγραφο κατέβηκε ✓",
      import_ok: "Η εισαγωγή ολοκληρώθηκε ✓", import_n: "Εισήχθησαν {n} ημέρες ✓", import_bad: "Μη έγκυρο αρχείο αντιγράφου.", import_bad_t: "Μη έγκυρο αρχείο",
      day_cleared: "Η ημέρα καθαρίστηκε", all_deleted: "Όλα τα δεδομένα διαγράφηκαν",
      user_toast: "Χρήστης: ", user_created: "Δημιουργήθηκε ο χρήστης «{n}» ✓", user_removed: "Ο λογαριασμός αφαιρέθηκε — τα δεδομένα του φυλάχθηκαν 🗄️",
      user_exists: "Υπάρχει ήδη χρήστης με αυτό το όνομα", name_min: "Βάλε κωδικό τουλάχιστον 4 χαρακτήρων",
      c_clear: "Να διαγραφούν όλες οι καταχωρήσεις της ημέρας {d};",
      c_del1: "Να διαγραφεί ο λογαριασμός «{n}»{d};", c_del1_days: " ({n} καταγεγραμμένες ημέρες)",
      c_del2: "Σίγουρα; Ο λογαριασμός «{n}» θα φύγει από τη λίστα σε όλες τις συσκευές.\n\nΟι καταγραφές του ΔΕΝ διαγράφονται — μένουν αποθηκευμένες στη βάση και μπορούν να επανέλθουν.",
      c_wipe1: "ΠΡΟΣΟΧΗ: Θα διαγραφούν ΟΛΕΣ οι καταγραφές του χρήστη «{n}» οριστικά. Συνέχεια;",
      c_wipe2: "Σίγουρα; Δεν υπάρχει επαναφορά (εκτός αν έχεις αντίγραφο .json).",
      sync_on: "☁️ Συγχρονισμός ενεργός ✓", sync_run: "☁️ Συγχρονισμός…", sync_err: "☁️ Σφάλμα συγχρονισμού — τα δεδομένα μένουν τοπικά",
      sync_noload: "Ο συγχρονισμός δεν φόρτωσε (χωρίς σύνδεση;)", sync_none: "Χωρίς online συγχρονισμό",
      x_date: "Ημερομηνία", x_day: "Ημέρα", x_time: "Ώρα", x_food: "Φαγητό",
      x_act_time: "Δραστηριότητα (ώρα)", x_act_type: "Δραστηριότητα (είδος)", x_act_dur: "Δραστηριότητα (διάρκεια)",
      x_sleep: "Ύπνος (ώρες)", x_ken: "Κενώσεις", x_water: "Νερό (ml)", x_notes: "Σημειώσεις", x_time_pfx: "Ώρα",
      sc_off: "Απενεργοποιημένος — τα δεδομένα μένουν μόνο σε αυτή τη συσκευή.",
      sc_code: "Κωδικός οικογένειας: «{c}». ", sc_tail: "Τα δεδομένα συγχρονίζονται μέσω cloud (Firebase).",
      sc_none: "Δεν έχει οριστεί κωδικός οικογένειας."
    },
    en: {
      tab_day: "Day", tab_week: "Week", tab_history: "History", tab_guide: "Guide", tab_export: "Export",
      today_btn: "Today", today_suffix: " · Today",
      progress: "{n} of {t} meals filled", saved: "Saved ✓",
      meal_proino: "Breakfast", meal_progevma: "Morning snack", meal_gevma: "Lunch", meal_apogevmatino: "Afternoon snack", meal_vradino: "Dinner",
      what_ate: "What did you eat?", meal_ph: "e.g. cheese toast, orange juice…", meal_time: "Meal time",
      chip_fresh: "Fresh", chip_animal: "Animal", chip_starch: "Starch/Nuts", chip_fruit: "Fruit", chip_snack: "Snack/Nuts",
      tag3: "Trio", tag2: "Duo",
      act_title: "Physical Activity", act_type: "Type", act_time: "Time", act_dur: "Duration",
      act_type_ph: "e.g. walking, gym…", act_dur_ph: "e.g. 45 minutes",
      act_add: "➕ Add activity", act_del: "Remove activity",
      extra_add: "➕ Extra meal", extra_default: "Snack", extra_name_ph: "Name (e.g. Snack, Late lunch…)",
      extra_del: "Remove meal", extra_time: "Time", week_extras: "🍴 Extra meals", x_extras: "Extra meals",
      mv_up: "Move up", mv_down: "Move down",
      sk_title: "Sleep & Bowel Movements", sk_sleep: "Sleep hours", sk_hours: "hours", sk_ken: "Bowel movements", sk_times: "times", reset: "Reset",
      wn_title: "Water & Notes", wn_water: "Water", notes_label: "Day notes", notes_ph: "How you felt, hunger, sleep, anything else…",
      clear_day: "Clear day",
      week_hint: "Tap any cell to edit that day.",
      week_this: "This week", week_export: "Export week to Excel", week_meal_col: "Meal",
      week_extra: "🌙 Sleep · 🚽 BM · 💧 Water", week_act: "🏃 Activity",
      hist_search_ph: "Search food, activity, note…", all_months: "All months",
      st_days: "recorded days", st_full: "complete days (5/5)", st_act: "days with activity",
      st_water: "avg ml water / day", st_sleep: "avg sleep hours 🌙", st_ken: "avg bowel mov. / day 🚽", st_streak: "day streak 🔥",
      hist_empty: "No entries{f}.<br>Start from the “Day” tab! 🍽️", hist_empty_f: " with these filters", hist_empty_yet: " yet",
      hist_edit: "✏️ Edit", hist_empty_day: "Empty day",
      h_act: "🏃 Activity", h_sleep: "🌙 Sleep", h_ken: "🚽 Bowel mov.", h_water: "💧 Water", h_notes: "📝 Notes",
      hour1: " hour", hourN: " hours", time1: " time", timeN: " times",
      exp_title: "Export to Excel", exp_hint: "Pick a date range and download an .xlsx file that opens directly in Excel.",
      exp_from: "From", exp_to: "To", range_all: "All", range_month: "This month",
      btn_detail: "📊 Excel — detailed table", btn_cal: "📅 Excel — booklet layout (Greek)", btn_csv: "CSV (.csv)", btn_print: "Print / PDF",
      backup_title: "Backup", backup_hint: "With sync on, data is also stored online. The .json backup remains useful as a fallback.",
      backup_dl: "⬇ Download backup (.json)", backup_up: "⬆ Import backup",
      sync_title: "☁️ Online sync", sync_change: "Set / change family code", sync_off_btn: "Disable sync",
      wipe_title: "Delete everything", wipe_hint: "Permanently deletes all entries of the current user.", wipe_btn: "Delete all data",
      foot_none: "No entries yet", foot_days: "{n} recorded days · first: {d}",
      who: "👤 Who is logging?", users_title: "👤 Users", u_active: " · active", u_day1: " day", u_dayN: " days",
      new_user_ph: "New user name…", create_btn: "➕ Create",
      user_hint: "Each user has their own diary on this device.",
      del_user_title: "Delete user",
      no_range: "No entries in this range.",
      xlsx_ok: "Excel downloaded ✓", csv_ok: "CSV downloaded ✓", backup_ok: "Backup downloaded ✓",
      import_ok: "Import complete ✓", import_n: "Imported {n} days ✓", import_bad: "Invalid backup file.", import_bad_t: "Invalid file",
      day_cleared: "Day cleared", all_deleted: "All data deleted",
      user_toast: "User: ", user_created: "User “{n}” created ✓", user_removed: "Account removed — its data was kept 🗄️",
      user_exists: "A user with this name already exists", name_min: "Use a code of at least 4 characters",
      c_clear: "Delete all entries of {d}?",
      c_del1: "Delete the account “{n}”{d}?", c_del1_days: " ({n} recorded days)",
      c_del2: "Are you sure? The account “{n}” will disappear from the list on all devices.\n\nIts entries are NOT deleted — they stay stored in the database and can be restored.",
      c_wipe1: "WARNING: ALL entries of user “{n}” will be permanently deleted. Continue?",
      c_wipe2: "Are you sure? There is no undo (unless you have a .json backup).",
      sync_on: "☁️ Sync active ✓", sync_run: "☁️ Syncing…", sync_err: "☁️ Sync error — data stays local",
      sync_noload: "Sync did not load (offline?)", sync_none: "No online sync",
      x_date: "Date", x_day: "Day", x_time: "Time", x_food: "Food",
      x_act_time: "Activity (time)", x_act_type: "Activity (type)", x_act_dur: "Activity (duration)",
      x_sleep: "Sleep (hours)", x_ken: "Bowel movements", x_water: "Water (ml)", x_notes: "Notes", x_time_pfx: "Time",
      sc_off: "Disabled — data stays only on this device.",
      sc_code: "Family code: “{c}”. ", sc_tail: "Data syncs via the cloud (Firebase).",
      sc_none: "No family code set."
    }
  };
  function t(key) {
    var v = T[lang] && T[lang][key];
    if (v == null) v = T.el[key];
    return v == null ? key : v;
  }
  var LOCALE = {
    el: {
      dow: ["Κυριακή","Δευτέρα","Τρίτη","Τετάρτη","Πέμπτη","Παρασκευή","Σάββατο"],
      dowShort: ["Κυρ","Δευ","Τρί","Τετ","Πέμ","Παρ","Σάβ"],
      months: ["Ιανουάριος","Φεβρουάριος","Μάρτιος","Απρίλιος","Μάιος","Ιούνιος","Ιούλιος","Αύγουστος","Σεπτέμβριος","Οκτώβριος","Νοέμβριος","Δεκέμβριος"]
    },
    en: {
      dow: ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
      dowShort: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],
      months: ["January","February","March","April","May","June","July","August","September","October","November","December"]
    }
  };

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

  /* ============================================================
     Αναγνώριση τροφών: κατατάσσει ό,τι γράφεις σε κατηγορίες του
     εντύπου (φρέσκια/ζωική/άμυλο-καρποί, φρούτα/snack) με λεξικό
     ελληνικών στελεχών λέξεων — τοπικά, χωρίς internet.
     ============================================================ */
  var FOOD_LEXICON = {
    veg:    ["σαλατ","ντοματ","αγγουρ","μπροκολ","καροτ","κολοκυθ","σπανακ","χορτ","λαχαν","παντζαρ","πιπερι","μελιτζαν","μαρουλ","κρεμμυδ","αρακ","φασολακ","μπαμι","αγκιναρ","σπαραγγ","κουνουπιδ","σελιν","ραδικ","βλιτ","ρoκα","ροκα","γεμιστ","μουσακ","χωριατικ","ταμπουλε","μπριαμ","λαδερ","salad","tomato","cucumber","broccoli","carrot","spinach","veget","zucchini","pepper","eggplant","lettuce","cabbage","beet","cauliflower","greens"],
    fruit:  ["μηλ","μπαναν","πορτοκαλ","αχλαδ","φραουλ","σταφυλ","καρπουζ","πεπον","ακτινιδ","ροδακιν","βερικοκ","κερασ","νεκταριν","μανταριν","σταφιδ","χουρμαδ","δαμασκην","συκ","ανανα","μανγκ","φρουτ","κομποστ","βατομουρ","μυρτιλ","αβοκαντ","apple","banana","orange","pear","strawberr","grape","watermelon","melon","kiwi","peach","apricot","cherr","raisin","date","prune","fig","fruit","berr","mango","avocado"],
    animal: ["κοτοπουλ","κοτοσουπ","κοτομπουκ","κοτολετ","μοσχαρ","χοιριν","ψαρ","σολομ","τονο","σαρδελ","γαυρ","τσιπουρ","λαβρακ","μπακαλιαρ","καλαμαρ","χταποδ","μυδ","γαριδ","αυγ","ομελετ","γαλα","γαλατ","γιαουρτ","τυρ","φετα","κασερ","κεφιρ","γαλοπουλ","κιμα","μπιφτεκ","σουβλακ","γυρο","λουκανικ","ζαμπον","μπεικον","κρεα","αρνακ","αρνισι","κατσικ","κυνηγ","παστιτσι","μουσακ","τοστ","κοτατζ","cottage","chicken","beef","pork","fish","salmon","tuna","egg","omelet","milk","yogurt","yoghurt","cheese","turkey","shrimp","mince","burger","steak","meat","lamb","sausage","ham","bacon","gyros","feta"],
    starch: ["ψωμ","ρυζ","μακαρον","ζυμαρικ","πατατ","κινοα","βρωμ","φακ","ρεβιθ","φασολ","φασολαδ","παξιμαδ","κριθαρακ","πλιγουρ","κουσκους","τορτιγ","πιτσ","πιτα","νιοκ","λαζαν","σπαγγετ","χυλοπιτ","τραχαν","δημητριακ","μουσλ","φρυγαν","κρουασαν","γεμιστ","παστιτσι","μουσακ","σουβλακ","τοστ","καλαμποκ","αραβοσιτ","πουρε","bread","rice","pasta","spaghetti","macaroni","potato","quinoa","oat","lentil","chickpea","bean","rusk","bulgur","couscous","tortilla","pizza","pita","gnocchi","lasagn","cereal","muesli","toast","fries","corn","puree","noodle"],
    nuts:   ["αμυγδαλ","καρυδ","φουντουκ","φυστικ","κασιου","ηλιοσπορ","κολοκυθοσπορ","ταχιν","παστελ","almond","walnut","hazelnut","peanut","cashew","pistachio","tahini"],
    snack:  ["μπαρ","κουλουρ","κρακερ","παξιμαδακ","ποπκορν","κριτσιν","ρυζογκοφρετ","bar","cracker","pretzel","popcorn","breadstick","ricecake"]
  };
  function normGr(s) {
    return String(s || "").toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/ς/g, "σ");
  }
  function foodCategories(text) {
    var words = normGr(text).split(/[^a-zα-ω0-9]+/).filter(Boolean);
    var out = {};
    Object.keys(FOOD_LEXICON).forEach(function (cat) {
      out[cat] = FOOD_LEXICON[cat].some(function (stem) {
        return words.some(function (w) { return w.indexOf(stem) === 0; });
      });
    });
    return out;
  }
  function comboStatus(meal, text) {
    if (!(text || "").trim()) return null;
    var c = foodCategories(text);
    if (meal.type === "2άδα") {
      var parts2 = [
        { label: t("chip_fruit"), ok: c.fruit },
        { label: t("chip_snack"), ok: c.snack || c.nuts }
      ];
      return { parts: parts2, complete: parts2.every(function (p) { return p.ok; }), tag: t("tag2") };
    }
    var parts3 = [
      { label: t("chip_fresh"), ok: c.veg || c.fruit },
      { label: t("chip_animal"), ok: c.animal },
      { label: t("chip_starch"), ok: c.starch || c.nuts }
    ];
    return { parts: parts3, complete: parts3.every(function (p) { return p.ok; }), tag: t("tag3") };
  }

  var DOW = LOCALE[lang].dow;
  var DOW_SHORT = LOCALE[lang].dowShort;
  var MONTHS = LOCALE[lang].months;
  function mealName(m) { return t("meal_" + m.id); }

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
    if (!d.activities) d.activities = dayActivities(d); // παλιά μονή δραστηριότητα → λίστα
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
  function dayActivities(d) {
    // Λίστα δραστηριοτήτων· παλιές ημέρες με μία δραστηριότητα (activity) διαβάζονται κι αυτές
    if (!d) return [];
    if (d.activities && d.activities.length) return d.activities;
    var a = d.activity;
    return (a && (a.type || a.time || a.duration)) ? [{ type: a.type || "", time: a.time || "", duration: a.duration || "" }] : [];
  }
  function dayExtras(d) {
    // Ενδιάμεσα/έξτρα γεύματα πέρα από τα 5 βασικά: [{ name, time, text }]
    return (d && d.extras && d.extras.length) ? d.extras : [];
  }
  function extraName(x) { return (x.name || "").trim() || t("extra_default"); }
  // Σειρά καρτών της ημέρας: ids βασικών γευμάτων + "x0","x1"… για τα ενδιάμεσα.
  // Αν λείπει (παλιές ημέρες) → προεπιλεγμένη σειρά και τα ενδιάμεσα στο τέλος.
  function defaultOrder(d) {
    var o = MEALS.map(function (m) { return m.id; });
    dayExtras(d).forEach(function (_, i) { o.push("x" + i); });
    return o;
  }
  function dayOrder(d) {
    var def = defaultOrder(d), seen = {}, out = [];
    ((d && d.order) || []).forEach(function (tok) {
      if (def.indexOf(tok) !== -1 && !seen[tok]) { seen[tok] = true; out.push(tok); }
    });
    def.forEach(function (tok) { if (!seen[tok]) out.push(tok); });
    return out;
  }
  function blankDay() {
    var d = { meals: {}, times: {}, activities: [], activity: { type: "", time: "", duration: "" }, extras: [], waterMl: 0, sleep: 0, kenoseis: 0, notes: "" };
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
    if (dayActivities(d).length || dayExtras(d).length || getWaterMl(d) > 0 || d.sleep > 0 || d.kenoseis > 0 || (d.notes || "").trim()) return true;
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

  /* ---------- Εφαρμογή γλώσσας ---------- */
  function applyLang() {
    document.documentElement.lang = lang;
    DOW = LOCALE[lang].dow;
    DOW_SHORT = LOCALE[lang].dowShort;
    MONTHS = LOCALE[lang].months;
    document.querySelectorAll("[data-i18n]").forEach(function (el) { el.textContent = t(el.getAttribute("data-i18n")); });
    document.querySelectorAll("[data-i18n-ph]").forEach(function (el) { el.placeholder = t(el.getAttribute("data-i18n-ph")); });
    $("langBtn").textContent = lang === "el" ? "EN" : "ΕΛ";
  }
  $("langBtn").addEventListener("click", function () {
    lang = lang === "el" ? "en" : "el";
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
    applyLang();
    buildMealCards();
    renderDay();
    renderWeek();
    renderHistory();
    updateFootStats();
    updateSyncCard();
    renderUserButton();
    if (!$("userOverlay").hidden) {
      $("userModalTitle").textContent = lockedPick ? t("who") : t("users_title");
      renderUserList();
    }
  });

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
  function moveBtnsHtml() {
    return '<span class="move-btns">' +
      '<button type="button" class="mv" data-mv="-1" title="' + esc(t("mv_up")) + '" aria-label="' + esc(t("mv_up")) + '">▲</button>' +
      '<button type="button" class="mv" data-mv="1" title="' + esc(t("mv_down")) + '" aria-label="' + esc(t("mv_down")) + '">▼</button>' +
      '</span>';
  }
  function buildMealCards() {
    var wrap = $("mealCards");
    wrap.innerHTML = "";
    MEALS.forEach(function (m) {
      var card = document.createElement("div");
      card.className = "card meal-card" + (m.type === "2άδα" ? " duo" : "");
      card.dataset.meal = m.id;
      var slotsHtml = m.slots.map(function (s) {
        return '<label class="slot"><span class="slot-label">' + esc(t("what_ate")) + '</span>' +
          '<textarea rows="3" data-meal="' + m.id + '" data-slot="' + s.id + '" autocomplete="off" placeholder="' + esc(t("meal_ph")) + '"></textarea></label>';
      }).join("");
      card.innerHTML =
        '<div class="card-head">' +
          '<div class="meal-title"><span class="meal-emoji">' + m.emoji + '</span><h2>' + esc(mealName(m)) + '</h2></div>' +
          '<div class="meal-head-right">' +
            moveBtnsHtml() +
            '<input type="time" class="meal-time" data-meal="' + m.id + '" title="' + esc(t("meal_time")) + '" aria-label="' + esc(t("meal_time")) + ' — ' + esc(mealName(m)) + '">' +
            '<span class="check">✓</span>' +
          '</div>' +
        '</div>' +
        '<div class="slots">' + slotsHtml + '</div>' +
        '<div class="combo-hint" id="combo-' + m.id + '"></div>';
      wrap.appendChild(card);
    });
  }
  buildMealCards();

  /* Ενδιάμεσα γεύματα — δυναμικές κάρτες (προσθήκη/αφαίρεση), δεν μετράνε στα 5 βασικά */
  function extraCardHtml(x) {
    return '<div class="card meal-card extra-card">' +
      '<div class="card-head">' +
        '<div class="meal-title"><span class="meal-emoji">🍴</span>' +
          '<input type="text" class="x-name" placeholder="' + esc(t("extra_name_ph")) + '" autocomplete="off" value="' + esc(x.name || "") + '" aria-label="' + esc(t("extra_name_ph")) + '">' +
        '</div>' +
        '<div class="meal-head-right">' +
          moveBtnsHtml() +
          '<input type="time" class="meal-time x-time" value="' + esc(x.time || "") + '" title="' + esc(t("meal_time")) + '" aria-label="' + esc(t("meal_time")) + '">' +
          '<button type="button" class="x-del" title="' + esc(t("extra_del")) + '" aria-label="' + esc(t("extra_del")) + '">✕</button>' +
        '</div>' +
      '</div>' +
      '<div class="slots"><label class="slot"><span class="slot-label">' + esc(t("what_ate")) + '</span>' +
        '<textarea rows="3" class="x-text" autocomplete="off" placeholder="' + esc(t("meal_ph")) + '">' + esc(x.text || "") + '</textarea></label></div>' +
      '<div class="combo-hint x-combo"></div>' +
      '</div>';
  }
  function cardFromHtml(html) {
    var tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.firstChild;
  }
  /* Τοποθέτηση όλων των καρτών (βασικά + ενδιάμεσα) στη σειρά της ημέρας */
  function layoutCards(day) {
    var wrap = $("mealCards");
    wrap.querySelectorAll(".extra-card").forEach(function (c) { c.remove(); });
    var extras = dayExtras(day);
    dayOrder(day).forEach(function (tok) {
      var el = /^x\d+$/.test(tok)
        ? cardFromHtml(extraCardHtml(extras[+tok.slice(1)]))
        : wrap.querySelector('.meal-card[data-meal="' + tok + '"]');
      if (el) wrap.appendChild(el); // appendChild μετακινεί τον υπάρχοντα κόμβο, δεν τον ξαναφτιάχνει
    });
    updateMoveButtons();
  }
  function allCards() { return Array.prototype.slice.call(document.querySelectorAll("#mealCards .meal-card")); }
  function readOrder() {
    var xi = 0;
    return allCards().map(function (c) { return c.dataset.meal || ("x" + (xi++)); });
  }
  function updateMoveButtons() {
    var cards = allCards();
    cards.forEach(function (c, i) {
      c.querySelector('.mv[data-mv="-1"]').disabled = i === 0;
      c.querySelector('.mv[data-mv="1"]').disabled = i === cards.length - 1;
    });
  }
  $("mealCards").addEventListener("click", function (e) {
    var b = e.target.closest(".mv");
    if (!b || b.disabled) return;
    var card = b.closest(".meal-card");
    var sib = +b.dataset.mv < 0 ? card.previousElementSibling : card.nextElementSibling;
    if (!sib) return;
    if (+b.dataset.mv < 0) card.parentNode.insertBefore(card, sib);
    else card.parentNode.insertBefore(sib, card);
    updateMoveButtons();
    card.classList.remove("moved"); void card.offsetWidth; card.classList.add("moved");
    if (card.scrollIntoView) card.scrollIntoView({ block: "nearest", behavior: "smooth" });
    scheduleSave();
  });
  function readExtras() {
    var out = [];
    document.querySelectorAll("#mealCards .extra-card").forEach(function (card) {
      var x = {
        name: card.querySelector(".x-name").value.trim(),
        time: card.querySelector(".x-time").value,
        text: card.querySelector(".x-text").value.trim()
      };
      if (x.name || x.time || x.text) out.push(x); // κενές κάρτες δεν αποθηκεύονται
    });
    return out;
  }
  $("extraAdd").addEventListener("click", function () {
    var card = cardFromHtml(extraCardHtml({ name: "", time: "", text: "" }));
    $("mealCards").appendChild(card);
    updateMoveButtons();
    card.querySelector(".x-text").focus();
    if (card.scrollIntoView) card.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });
  $("mealCards").addEventListener("click", function (e) {
    var b = e.target.closest(".x-del");
    if (!b) return;
    b.closest(".extra-card").remove();
    updateMoveButtons();
    scheduleSave();
  });

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

  /* Φυσικές δραστηριότητες — δυναμική λίστα (προσθήκη/αφαίρεση γραμμών) */
  function actRowHtml(a) {
    return '<div class="act-row">' +
      '<label class="slot a-c1"><span class="slot-label">' + esc(t("act_type")) + '</span>' +
        '<input type="text" class="a-type" list="dl-activity" placeholder="' + esc(t("act_type_ph")) + '" autocomplete="off" value="' + esc(a.type || "") + '"></label>' +
      '<label class="slot"><span class="slot-label">' + esc(t("act_time")) + '</span>' +
        '<input type="time" class="a-time" value="' + esc(a.time || "") + '"></label>' +
      '<label class="slot"><span class="slot-label">' + esc(t("act_dur")) + '</span>' +
        '<input type="text" class="a-duration" list="dl-duration" placeholder="' + esc(t("act_dur_ph")) + '" autocomplete="off" value="' + esc(a.duration || "") + '"></label>' +
      '<button type="button" class="a-del" title="' + esc(t("act_del")) + '" aria-label="' + esc(t("act_del")) + '">✕</button>' +
      '</div>';
  }
  function renderActivities(list) {
    var acts = (list && list.length) ? list : [{ type: "", time: "", duration: "" }];
    $("actList").innerHTML = acts.map(actRowHtml).join("");
  }
  function readActivities() {
    var out = [];
    document.querySelectorAll("#actList .act-row").forEach(function (row) {
      var a = {
        type: row.querySelector(".a-type").value.trim(),
        time: row.querySelector(".a-time").value,
        duration: row.querySelector(".a-duration").value.trim()
      };
      if (a.type || a.time || a.duration) out.push(a);
    });
    return out;
  }
  $("actAdd").addEventListener("click", function () {
    $("actList").insertAdjacentHTML("beforeend", actRowHtml({ type: "", time: "", duration: "" }));
    var rows = document.querySelectorAll("#actList .act-row");
    rows[rows.length - 1].querySelector(".a-type").focus();
  });
  $("actList").addEventListener("input", scheduleSave);
  $("actList").addEventListener("change", scheduleSave);
  $("actList").addEventListener("click", function (e) {
    var b = e.target.closest(".a-del");
    if (!b) return;
    var rows = document.querySelectorAll("#actList .act-row");
    if (rows.length === 1) {
      rows[0].querySelectorAll("input").forEach(function (i) { i.value = ""; }); // η τελευταία γραμμή καθαρίζει αντί να φύγει
    } else {
      b.closest(".act-row").remove();
    }
    scheduleSave();
  });

  /* Νυχτερινός ύπνος (ώρες, με γρήγορες επιλογές) */
  function fmtHours(v) { return String(v).replace(".", ","); }
  document.querySelectorAll("[data-sleeph]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      $("sleepHours").value = this.dataset.sleeph;
      scheduleSave();
    });
  });
  $("sleepReset").addEventListener("click", function () {
    $("sleepHours").value = "";
    scheduleSave();
  });

  /* Κενώσεις (πλήθος ανά ημέρα, με γρήγορες επιλογές) */
  document.querySelectorAll("[data-ken]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      $("kenCount").value = this.dataset.ken;
      scheduleSave();
    });
  });
  $("kenReset").addEventListener("click", function () {
    $("kenCount").value = "";
    scheduleSave();
  });

  function renderDay() {
    var day = getDay(currentKey);
    $("dayPicker").value = currentKey;
    var d = parseKey(currentKey);
    var label = DOW[d.getDay()] + " " + d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear();
    $("dayName").textContent = label + (currentKey === todayKey() ? t("today_suffix") : "");

    document.querySelectorAll("#mealCards [data-slot]").forEach(function (inp) {
      inp.value = (day.meals[inp.dataset.meal] || {})[inp.dataset.slot] || "";
    });
    document.querySelectorAll("#mealCards .meal-time[data-meal]").forEach(function (inp) {
      inp.value = (day.times || {})[inp.dataset.meal] || "";
    });
    layoutCards(day);
    renderActivities(dayActivities(day));
    $("dayNotes").value = day.notes || "";
    var ml = getWaterMl(day);
    $("waterMl").value = ml > 0 ? ml : "";
    $("sleepHours").value = day.sleep > 0 ? day.sleep : "";
    $("kenCount").value = day.kenoseis > 0 ? day.kenoseis : "";
    renderComboHints();
    updateProgress(day);
  }

  function updateProgress(day) {
    var done = mealsDoneCount(day);
    $("progressFill").style.width = (done / MEALS.length * 100) + "%";
    $("progressLabel").textContent = t("progress").replace("{n}", done).replace("{t}", MEALS.length);
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
    document.querySelectorAll("#mealCards .meal-time[data-meal]").forEach(function (inp) {
      day.times[inp.dataset.meal] = inp.value;
    });
    day.activities = readActivities();
    day.extras = readExtras();
    var order = readOrder();
    if (order.join(",") === defaultOrder(day).join(",")) delete day.order; // προεπιλεγμένη σειρά → δεν αποθηκεύεται
    else day.order = order;
    // καθρέφτης πρώτης δραστηριότητας για συμβατότητα με συσκευές σε παλιότερη έκδοση
    day.activity = day.activities[0]
      ? { type: day.activities[0].type, time: day.activities[0].time, duration: day.activities[0].duration }
      : { type: "", time: "", duration: "" };
    var ml = parseInt($("waterMl").value, 10);
    day.waterMl = isFinite(ml) && ml > 0 ? ml : 0;
    var sl = parseFloat(String($("sleepHours").value).replace(",", "."));
    day.sleep = isFinite(sl) && sl > 0 ? Math.min(sl, 24) : 0;
    var kn = parseInt($("kenCount").value, 10);
    day.kenoseis = isFinite(kn) && kn > 0 ? Math.min(kn, 20) : 0;
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
  /* Ζωντανή ένδειξη 3άδας/2άδας καθώς γράφεις */
  function renderComboHints() {
    MEALS.forEach(function (m) {
      var el = $("combo-" + m.id);
      if (!el) return;
      var ta = document.querySelector('#mealCards [data-meal="' + m.id + '"][data-slot="kyrios"]');
      var st = comboStatus(m, ta ? ta.value : "");
      if (!st) { el.innerHTML = ""; return; }
      var html = st.parts.map(function (p) {
        return "<span class='cchip" + (p.ok ? " on" : "") + "'>" + (p.ok ? "✓ " : "") + p.label + "</span>";
      }).join("");
      if (st.complete) html += "<span class='cchip full'>" + st.tag + " ✓</span>";
      el.innerHTML = html;
    });
    document.querySelectorAll("#mealCards .extra-card").forEach(function (card) {
      var el = card.querySelector(".x-combo");
      var st = comboStatus({ type: "2άδα" }, card.querySelector(".x-text").value); // τα ενδιάμεσα κρίνονται ως 2άδα (σνακ)
      if (!st) { el.innerHTML = ""; return; }
      var html = st.parts.map(function (p) {
        return "<span class='cchip" + (p.ok ? " on" : "") + "'>" + (p.ok ? "✓ " : "") + p.label + "</span>";
      }).join("");
      if (st.complete) html += "<span class='cchip full'>" + st.tag + " ✓</span>";
      el.innerHTML = html;
    });
  }
  $("mealCards").addEventListener("input", renderComboHints);
  ["dayNotes", "waterMl", "sleepHours", "kenCount"].forEach(function (id) {
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
    if (!confirm(t("c_clear").replace("{d}", fmtGr(currentKey)))) return;
    var oldDay = db[currentKey];
    delete db[currentKey];
    persist();
    pushDay(profiles.current, currentKey, oldDay);
    renderDay();
    updateFootStats();
    toast(t("day_cleared"));
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
    var html = "<thead><tr><th style='min-width:120px'>" + esc(t("week_meal_col")) + "</th>";
    keys.forEach(function (k) {
      var d = parseKey(k);
      html += "<th" + (k === tKey ? ' class="today-col"' : "") + ">" + DOW_SHORT[d.getDay()] +
        "<small>" + d.getDate() + "/" + (d.getMonth() + 1) + "</small></th>";
    });
    html += "</tr></thead><tbody>";

    MEALS.forEach(function (m) {
      html += "<tr><th><span class='b'>" + m.emoji + " " + esc(mealName(m)) + "</span></th>";
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

    // Ενδιάμεσα γεύματα
    html += "<tr><th><span class='b'>" + esc(t("week_extras")) + "</span></th>";
    keys.forEach(function (k) {
      var cell = dayExtras(db[k]).map(function (x) {
        return "<span class='l'>" + esc(extraName(x)) + (x.time ? " 🕐 " + esc(x.time) : "") + "</span>" +
          (x.text ? "<br>" + esc(x.text).replace(/\n/g, "<br>") : "");
      }).join("<br>");
      html += "<td data-day='" + k + "'>" + (cell || "&nbsp;") + "</td>";
    });
    html += "</tr>";

    // Φυσική δραστηριότητα
    html += "<tr><th><span class='b'>" + esc(t("week_act")) + "</span></th>";
    keys.forEach(function (k) {
      var day = db[k];
      var cell = dayActivities(day).map(function (a) {
        return (a.time ? "<span class='l'>🕐 " + esc(a.time) + "</span>" : "") +
          esc(a.type || "—") +
          (a.duration ? "<br><span class='l'>" + esc(a.duration) + "</span>" : "");
      }).join("<br>");
      html += "<td data-day='" + k + "'>" + (cell || "&nbsp;") + "</td>";
    });
    html += "</tr>";

    // Ύπνος, κενώσεις & νερό
    html += "<tr><th><span class='b'>" + esc(t("week_extra")) + "</span></th>";
    keys.forEach(function (k) {
      var day = db[k], parts = [];
      if (day && day.sleep) parts.push("🌙 " + fmtHours(day.sleep) + " ώ.");
      if (day && day.kenoseis) parts.push("🚽 " + day.kenoseis);
      var wml = getWaterMl(day);
      if (wml) parts.push("💧 " + wml + " ml");
      html += "<td data-day='" + k + "'>" + (parts.join("<br>") || "&nbsp;") + "</td>";
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
    dayActivities(day).forEach(function (a) { parts.push(a.type || "", a.duration || "", a.time || ""); });
    dayExtras(day).forEach(function (x) { parts.push(x.name || "", x.text || "", x.time || ""); });
    parts.push(day.notes || "");
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
    sel.innerHTML = "<option value=''>" + esc(t("all_months")) + "</option>";
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
    var full = 0, actDays = 0, waterSum = 0, sleepSum = 0, sleepDays = 0, kenSum = 0, kenDays = 0;
    filtered.forEach(function (k) {
      var d = db[k];
      if (mealsDoneCount(d) === MEALS.length) full++;
      if (dayActivities(d).some(function (a) { return (a.type || "").trim(); })) actDays++;
      waterSum += getWaterMl(d);
      if (d.sleep > 0) { sleepSum += d.sleep; sleepDays++; }
      if (d.kenoseis > 0) { kenSum += d.kenoseis; kenDays++; }
    });
    var streak = calcStreak();
    $("historyStats").innerHTML =
      stat(total, t("st_days")) +
      stat(full, t("st_full")) +
      stat(actDays, t("st_act")) +
      stat(total ? Math.round(waterSum / total) : 0, t("st_water")) +
      stat(sleepDays ? fmtHours((sleepSum / sleepDays).toFixed(1)) : "—", t("st_sleep")) +
      stat(kenDays ? fmtHours((kenSum / kenDays).toFixed(1)) : "—", t("st_ken")) +
      stat(streak, t("st_streak"));

    var list = $("historyList");
    if (!filtered.length) {
      list.innerHTML = "<div class='empty'>" + t("hist_empty").replace("{f}", q || month ? t("hist_empty_f") : t("hist_empty_yet")) + "</div>";
      return;
    }
    list.innerHTML = filtered.map(function (k) {
      var d = db[k];
      var date = parseKey(k);
      var pips = MEALS.map(function (m) {
        return "<span class='hpip" + (mealDone(d, m) ? " on" : "") + "' title='" + esc(mealName(m)) + "'>" + m.emoji + "</span>";
      }).join("");
      var xs = dayExtras(d);
      var rows = dayOrder(d).map(function (tok) {
        if (/^x\d+$/.test(tok)) {
          var x = xs[+tok.slice(1)];
          return "<div class='hrow'><span class='hm'>🍴 " + esc(extraName(x)) +
            (x.time ? " <span class='htime'>🕐 " + esc(x.time) + "</span>" : "") + "</span><span class='hv'>" +
            (x.text ? "<span class='part'>" + esc(x.text).replace(/\n/g, "<br>") + "</span>" : "—") + "</span></div>";
        }
        var m = MEALS.filter(function (mm) { return mm.id === tok; })[0];
        var vals = m.slots.map(function (s) {
          var v = (d.meals[m.id] || {})[s.id] || "";
          if (!v) return "";
          return m.slots.length === 1
            ? "<span class='part'>" + esc(v).replace(/\n/g, "<br>") + "</span>"
            : "<span class='part'><b>" + esc(SLOT_SHORT[s.id]) + ":</b> " + esc(v) + "</span>";
        }).filter(Boolean).join("");
        var tm = ((d.times || {})[m.id] || "").trim();
        var label = m.emoji + " " + esc(mealName(m)) + (tm ? " <span class='htime'>🕐 " + esc(tm) + "</span>" : "");
        return (vals || tm) ? "<div class='hrow'><span class='hm'>" + label + "</span><span class='hv'>" + (vals || "—") + "</span></div>" : "";
      }).filter(Boolean).join("");
      var extra = "";
      dayActivities(d).forEach(function (a) {
        extra += "<div class='hrow'><span class='hm'>" + t("h_act") +
          (a.time ? " <span class='htime'>🕐 " + esc(a.time) + "</span>" : "") + "</span><span class='hv'>" +
          esc(a.type || "—") + (a.duration ? " · " + esc(a.duration) : "") + "</span></div>";
      });
      if (d.sleep) extra += "<div class='hrow'><span class='hm'>" + t("h_sleep") + "</span><span class='hv'>" + fmtHours(d.sleep) + (d.sleep === 1 ? t("hour1") : t("hourN")) + "</span></div>";
      if (d.kenoseis) extra += "<div class='hrow'><span class='hm'>" + t("h_ken") + "</span><span class='hv'>" + d.kenoseis + (d.kenoseis === 1 ? t("time1") : t("timeN")) + "</span></div>";
      var wml = getWaterMl(d);
      if (wml) extra += "<div class='hrow'><span class='hm'>" + t("h_water") + "</span><span class='hv'>" + wml + " ml</span></div>";
      if ((d.notes || "").trim()) extra += "<div class='hrow'><span class='hm'>" + t("h_notes") + "</span><span class='hv'>" + esc(d.notes) + "</span></div>";
      return "<details class='hday'><summary>" +
        "<span class='hdate'>" + fmtGr(k) + "</span>" +
        "<span class='hdow'>" + DOW[date.getDay()] + "</span>" +
        "<span class='hmeals'>" + pips + "</span></summary>" +
        "<div class='hbody'>" + (rows + extra || "<p class='hint'>" + t("hist_empty_day") + "</p>") +
        "<div class='hactions'><button class='ghost-btn tiny' data-edit='" + k + "'>" + t("hist_edit") + "</button></div>" +
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
    if (!keys.length) { toast(t("no_range")); return false; }
    return true;
  }

  /* --- Excel: αναλυτικός πίνακας (μία γραμμή ανά ημέρα) --- */
  function exportDetailXlsx() {
    var keys = rangeKeys();
    if (!requireData(keys)) return;
    var head = [t("x_date"), t("x_day")];
    MEALS.forEach(function (m) {
      head.push(mealName(m) + " — " + t("x_time"));
      m.slots.forEach(function () { head.push(mealName(m) + " — " + t("x_food")); });
    });
    head.push(t("x_extras"), t("x_act_time"), t("x_act_type"), t("x_act_dur"), t("x_sleep"), t("x_ken"), t("x_water"), t("x_notes"));
    var rows = [head.map(function (h) { return { v: h, s: "head" }; })];
    keys.forEach(function (k) {
      var d = db[k];
      var row = [{ v: fmtGr(k), s: "bold" }, DOW[parseKey(k).getDay()]];
      MEALS.forEach(function (m) {
        row.push((d.times || {})[m.id] || "");
        m.slots.forEach(function (s) { row.push((d.meals[m.id] || {})[s.id] || ""); });
      });
      var acts = dayActivities(d);
      row.push(
        dayExtras(d).map(function (x) { return extraName(x) + (x.time ? " (" + x.time + ")" : "") + ": " + (x.text || ""); }).join("\n"),
        acts.map(function (a) { return a.time || ""; }).join("\n"),
        acts.map(function (a) { return a.type || ""; }).join("\n"),
        acts.map(function (a) { return a.duration || ""; }).join("\n"),
        d.sleep || "", d.kenoseis || "", getWaterMl(d) || 0, d.notes || ""
      );
      rows.push(row);
    });
    var cols = [12, 12];
    for (var i = 2; i < head.length; i++) cols.push(head[i].indexOf("Ώρα") !== -1 ? 12 : 20);
    MiniXLSX.download("Ημερολόγιο_Διατροφής_" + currentUser().name + "_" + keys[0] + "_" + keys[keys.length - 1] + ".xlsx",
      [{ name: "Ημερολόγιο", cols: cols, rows: rows }]);
    toast(t("xlsx_ok"));
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
          r2.push({ v: grUpper(LOCALE.el.dow[parseKey(k).getDay()]), s: i === 6 ? "dowSun" : "dow" });
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

        // Γρ.8: ενδιάμεσα γεύματα (δικό μας πεδίο, όνομα + ώρα + φαγητό ανά γραμμή)
        var rX = [{ v: "ΕΝΔΙΑΜΕΣΑ", s: "mealtag" }, { v: "", s: "mealtag" }];
        keys.forEach(function (k) {
          var txt = dayExtras(db[k]).map(function (x) {
            return extraName(x) + (x.time ? " (" + x.time + ")" : "") + (x.text ? ": " + x.text : "");
          }).join("\n");
          rX.push({ v: txt, s: "cell" });
        });
        rows.push(rX); heights.push(40);

        // Γρ.9-10: σημείωση εντύπου (A9:B10) + ΦΥΣΙΚΗ ΔΡΑΣΤΗΡΙΟΤΗΤΑ με ΕΙΔΟΣ/ΔΙΑΡΚΕΙΑ
        var r8 = [{ v: FORM_NOTE, s: "note" }, { v: "", s: "note" }];
        keys.forEach(function () { r8.push({ v: "ΦΥΣΙΚΗ ΔΡΑΣΤΗΡΙΟΤΗΤΑ", s: "acthead" }); });
        rows.push(r8); heights.push(16);
        var r9 = [{ v: "", s: "note" }, { v: "", s: "note" }];
        keys.forEach(function (k) {
          var acts = dayActivities(db[k]);
          var txt = acts.length
            ? acts.map(function (a) {
                return "ΕΙΔΟΣ: " + (a.type || "") + "\nΩΡΑ: " + (a.time || "") + "\nΔΙΑΡΚΕΙΑ: " + (a.duration || "");
              }).join("\n\n")
            : "ΕΙΔΟΣ: \nΩΡΑ: \nΔΙΑΡΚΕΙΑ: ";
          r9.push({ v: txt, s: "cell" });
        });
        rows.push(r9); heights.push(52);

        // Γρ.11-14: ύπνος, κενώσεις, νερό & σημειώσεις (δικά μας πεδία, στο ίδιο ύφος)
        var r10 = [{ v: "ΥΠΝΟΣ (ΩΡΕΣ)", s: "mealtag" }, { v: "", s: "mealtag" }];
        keys.forEach(function (k) { r10.push({ v: (db[k] && db[k].sleep) || "", s: "cell" }); });
        rows.push(r10); heights.push(20);
        var rKen = [{ v: "ΚΕΝΩΣΕΙΣ", s: "mealtag" }, { v: "", s: "mealtag" }];
        keys.forEach(function (k) { rKen.push({ v: (db[k] && db[k].kenoseis) || "", s: "cell" }); });
        rows.push(rKen); heights.push(20);
        var r11 = [{ v: "ΝΕΡΟ (ml)", s: "mealtag" }, { v: "", s: "mealtag" }];
        keys.forEach(function (k) { r11.push({ v: getWaterMl(db[k]) || "", s: "cell" }); });
        rows.push(r11); heights.push(20);
        var r12 = [{ v: "ΣΗΜΕΙΩΣΕΙΣ", s: "mealtag" }, { v: "", s: "mealtag" }];
        keys.forEach(function (k) { r12.push({ v: db[k] ? (db[k].notes || "") : "", s: "cell" }); });
        rows.push(r12); heights.push(38);

        var d0 = keys[0].split("-");
        sheets.push({
          name: "Εβδ " + d0[2] + "." + d0[1] + "." + d0[0].slice(2),
          cols: [15, 4.5, 18, 18, 18, 18, 18, 18, 18],
          rows: rows,
          heights: heights,
          merges: ["A1:B2", "A8:B8", "A9:B10", "A11:B11", "A12:B12", "A13:B13", "A14:B14"],
          landscape: true
        });
      }
      start = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
    }
    if (!sheets.length) { toast(t("no_range")); return; }
    MiniXLSX.download("Ημερολόγιο_" + currentUser().name + "_" + (labelWord || "ημερολόγιο") + "_" + from + "_" + to + ".xlsx", sheets);
    toast(t("xlsx_ok"));
  }

  /* --- CSV --- */
  function exportCsv() {
    var keys = rangeKeys();
    if (!requireData(keys)) return;
    function q(s) { return '"' + String(s == null ? "" : s).replace(/"/g, '""') + '"'; }
    var head = [t("x_date"), t("x_day")];
    MEALS.forEach(function (m) {
      head.push(mealName(m) + " - " + t("x_time"));
      m.slots.forEach(function () { head.push(mealName(m) + " - " + t("x_food")); });
    });
    head.push(t("x_extras"), t("x_act_time"), t("x_act_type"), t("x_act_dur"), t("x_sleep"), t("x_ken"), t("x_water"), t("x_notes"));
    var lines = [head.map(q).join(";")];
    keys.forEach(function (k) {
      var d = db[k];
      var row = [fmtGr(k), DOW[parseKey(k).getDay()]];
      MEALS.forEach(function (m) {
        row.push((d.times || {})[m.id] || "");
        m.slots.forEach(function (s) { row.push((d.meals[m.id] || {})[s.id] || ""); });
      });
      var acts = dayActivities(d);
      row.push(
        dayExtras(d).map(function (x) { return extraName(x) + (x.time ? " (" + x.time + ")" : "") + ": " + (x.text || ""); }).join(" | "),
        acts.map(function (a) { return a.time || ""; }).join(" | "),
        acts.map(function (a) { return a.type || ""; }).join(" | "),
        acts.map(function (a) { return a.duration || ""; }).join(" | "),
        d.sleep ? fmtHours(d.sleep) : "", d.kenoseis || "", getWaterMl(d) || 0, d.notes || ""
      );
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
    toast(t("csv_ok"));
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
    toast(t("backup_ok"));
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
        $("importMsg").textContent = t("import_n").replace("{n}", count);
        toast(t("import_ok"));
      } catch (e) {
        $("importMsg").textContent = t("import_bad");
        toast(t("import_bad_t"));
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
    if (!confirm(t("c_wipe1").replace("{n}", currentUser().name))) return;
    if (!confirm(t("c_wipe2"))) return;
    db = {};
    persist();
    wipeRemoteDays(profiles.current);
    renderDay();
    renderHistory();
    updateFootStats();
    toast(t("all_deleted"));
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
        "<span class='u-name'>" + esc(u.name) + (u.id === profiles.current ? " <small>" + t("u_active") + "</small>" : "") + "</span>" +
        "<span class='u-days'>" + days + (days === 1 ? t("u_day1") : t("u_dayN")) + "</span>" +
        (profiles.users.length > 1 ? "<button type='button' class='u-del' data-del='" + esc(u.id) + "' title='" + esc(t("del_user_title")) + "' aria-label='" + esc(t("del_user_title")) + " " + esc(u.name) + "'>🗑</button>" : "") +
        "</div>";
    }).join("");
  }
  var lockedPick = false; // στο άνοιγμα της σελίδας πρέπει πρώτα να διαλέξεις λογαριασμό
  function openUserModal(locked) {
    lockedPick = !!locked;
    $("userClose").hidden = lockedPick;
    $("userModalTitle").textContent = lockedPick ? t("who") : t("users_title");
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
    toast(t("user_toast") + currentUser().name + " 👤");
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
      // Διπλή επιβεβαίωση· τα δεδομένα ΔΕΝ διαγράφονται — μένουν στη βάση για επαναφορά
      if (!confirm(t("c_del1").replace("{n}", u.name).replace("{d}", days ? t("c_del1_days").replace("{n}", days) : ""))) return;
      if (!confirm(t("c_del2").replace("{n}", u.name))) return;
      profiles.users = profiles.users.filter(function (x) { return x.id !== uid; });
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
      toast(t("user_removed"));
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
    if (exists) { toast(t("user_exists")); return; }
    var id = "u" + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
    profiles.users.push({ id: id, name: name });
    profiles.up = Date.now();
    persistProfiles();
    pushProfiles();
    toast(t("user_created").replace("{n}", name));
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
      el.textContent = t("sc_off");
    } else if (familyCode) {
      el.textContent = t("sc_code").replace("{c}", familyCode) + ($("syncStatus").textContent || t("sc_tail"));
    } else {
      el.textContent = t("sc_none");
    }
  }

  function initFirebase() {
    if (!familyCode || familyCode === "__off__") { setSyncStatus(familyCode === "__off__" ? t("sync_none") : ""); return; }
    if (!window.firebase || !firebase.firestore) { setSyncStatus(t("sync_noload")); return; }
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
    setSyncStatus(t("sync_run"));

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
      setSyncStatus(t("sync_on"));
    }, function (err) {
      setSyncStatus(t("sync_err"));
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
      ? t("foot_days").replace("{n}", keys.length).replace("{d}", fmtGr(keys[0]))
      : t("foot_none");
  }

  /* ---------- Εκκίνηση ---------- */
  applyLang();
  renderUserButton();
  renderDay();
  updateFootStats();
  updateSyncCard();
  initFirebase();
  openUserModal(true); // στο άνοιγμα διαλέγεις πάντα λογαριασμό
})();
