/* ============================================================
   MiniXLSX — αυτόνομη δημιουργία αρχείων .xlsx χωρίς βιβλιοθήκες.
   Φτιάχνει έγκυρο ZIP (χωρίς συμπίεση) με τα XML μέρη του xlsx.
   Χρήση:
     MiniXLSX.download("αρχείο.xlsx", [
       { name:"Φύλλο1", cols:[22,30], rows:[
           [{v:"Κεφαλίδα", s:"head"}, "απλό κείμενο"],
           ["A2", "B2"]
       ]}
     ]);
   Στυλ κελιών: "head" (λευκά γράμματα σε πράσινο), "bold", "wrap",
                "label" (γκρι φόντο, έντονα), "" (κανονικό),
                και στυλ εντύπου «ΣΥΝΔΥΑΣΜΟΙ ΤΡΟΦΩΝ»: "title", "date",
                "dow", "dowSun", "mealtag", "vProino", "vDuo", "vGevma",
                "vVradino", "cell", "note", "acthead".
   Ανά φύλλο: cols (πλάτη), rows, merges, heights (ύψη γραμμών σε pt),
              landscape (οριζόντια εκτύπωση, χωράει στο πλάτος σελίδας).
   ============================================================ */
(function (global) {
  "use strict";

  /* ---------- CRC32 ---------- */
  var CRC_TABLE = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(bytes) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  /* ---------- ZIP (stored / χωρίς συμπίεση) ---------- */
  function buildZip(files) {
    // files: [{name, data(Uint8Array)}]
    var chunks = [], central = [], offset = 0;
    var enc = new TextEncoder();
    files.forEach(function (f) {
      var nameB = enc.encode(f.name);
      var crc = crc32(f.data);
      var local = new Uint8Array(30 + nameB.length);
      var dv = new DataView(local.buffer);
      dv.setUint32(0, 0x04034b50, true);
      dv.setUint16(4, 20, true);          // version needed
      dv.setUint16(6, 0x0800, true);      // UTF-8 flag
      dv.setUint16(8, 0, true);           // stored
      dv.setUint16(10, 0, true);          // time
      dv.setUint16(12, 0x2921, true);     // date (dummy: 2000-09-01)
      dv.setUint32(14, crc, true);
      dv.setUint32(18, f.data.length, true);
      dv.setUint32(22, f.data.length, true);
      dv.setUint16(26, nameB.length, true);
      dv.setUint16(28, 0, true);
      local.set(nameB, 30);
      chunks.push(local, f.data);

      var cent = new Uint8Array(46 + nameB.length);
      var cv = new DataView(cent.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0x0800, true);
      cv.setUint16(10, 0, true);
      cv.setUint16(12, 0, true);
      cv.setUint16(14, 0x2921, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, f.data.length, true);
      cv.setUint32(24, f.data.length, true);
      cv.setUint16(28, nameB.length, true);
      cv.setUint32(42, offset, true);
      cent.set(nameB, 46);
      central.push(cent);
      offset += local.length + f.data.length;
    });
    var centralSize = central.reduce(function (a, c) { return a + c.length; }, 0);
    var end = new Uint8Array(22);
    var ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, offset, true);
    var total = offset + centralSize + 22;
    var out = new Uint8Array(total);
    var p = 0;
    chunks.concat(central, [end]).forEach(function (c) { out.set(c, p); p += c.length; });
    return out;
  }

  /* ---------- XML helpers ---------- */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
  }
  function colName(i) { // 0 -> A
    var s = "";
    i++;
    while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); }
    return s;
  }

  var STYLE_IDS = {
    "": 0, "bold": 1, "head": 2, "wrap": 3, "label": 4,
    /* στυλ εντύπου «ΣΥΝΔΥΑΣΜΟΙ ΤΡΟΦΩΝ» */
    "title": 5, "date": 6, "dow": 7, "dowSun": 8, "mealtag": 9,
    "vProino": 10, "vDuo": 11, "vGevma": 12, "vVradino": 13,
    "cell": 14, "note": 15, "acthead": 16
  };

  var STYLES_XML =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<fonts count="8">' +
      '<font><sz val="11"/><name val="Calibri"/></font>' +                                          /* 0 κανονικό */
      '<font><b/><sz val="11"/><name val="Calibri"/></font>' +                                       /* 1 έντονο */
      '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>' +                /* 2 λευκό έντονο */
      '<font><b/><sz val="12"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>' +                /* 3 λευκό — κάθετα ονόματα γευμάτων */
      '<font><b/><sz val="14"/><color rgb="FF949D38"/><name val="Calibri"/></font>' +                /* 4 τίτλος ΣΥΝΔΥΑΣΜΟΙ ΤΡΟΦΩΝ */
      '<font><b/><sz val="11"/><color rgb="FF636466"/><name val="Calibri"/></font>' +                /* 5 ημέρες εβδομάδας */
      '<font><b/><sz val="8"/><color rgb="FF231F20"/><name val="Calibri"/></font>' +                 /* 6 σημείωση εντύπου */
      '<font><b/><sz val="9"/><color rgb="FF231F20"/><name val="Calibri"/></font>' +                 /* 7 ΦΥΣΙΚΗ ΔΡΑΣΤΗΡΙΟΤΗΤΑ */
    '</fonts>' +
    '<fills count="10">' +
      '<fill><patternFill patternType="none"/></fill>' +
      '<fill><patternFill patternType="gray125"/></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FF2F7D63"/><bgColor indexed="64"/></patternFill></fill>' +   /* 2 πράσινο head */
      '<fill><patternFill patternType="solid"><fgColor rgb="FFE9F1ED"/><bgColor indexed="64"/></patternFill></fill>' +   /* 3 γκρι label */
      '<fill><patternFill patternType="solid"><fgColor rgb="FF008FBE"/><bgColor indexed="64"/></patternFill></fill>' +   /* 4 ΠΡΩΪΝΟ μπλε */
      '<fill><patternFill patternType="solid"><fgColor rgb="FFF7A27A"/><bgColor indexed="64"/></patternFill></fill>' +   /* 5 ΠΡΟΓΕΥΜΑ/ΑΠΟΓΕΥΜΑΤΙΝΟ πορτοκαλί */
      '<fill><patternFill patternType="solid"><fgColor rgb="FF87AA2D"/><bgColor indexed="64"/></patternFill></fill>' +   /* 6 ΓΕΥΜΑ πράσινο */
      '<fill><patternFill patternType="solid"><fgColor rgb="FF00B4A3"/><bgColor indexed="64"/></patternFill></fill>' +   /* 7 ΒΡΑΔΙΝΟ πετρόλ */
      '<fill><patternFill patternType="solid"><fgColor rgb="FFD3AEB7"/><bgColor indexed="64"/></patternFill></fill>' +   /* 8 ΚΥΡΙΑΚΗ ροζ */
      '<fill><patternFill patternType="solid"><fgColor rgb="FFF7F1F3"/><bgColor indexed="64"/></patternFill></fill>' +   /* 9 φόντο σημείωσης */
    '</fills>' +
    '<borders count="3">' +
      '<border><left/><right/><top/><bottom/><diagonal/></border>' +
      '<border><left style="thin"><color rgb="FFBFCDC6"/></left><right style="thin"><color rgb="FFBFCDC6"/></right>' +
      '<top style="thin"><color rgb="FFBFCDC6"/></top><bottom style="thin"><color rgb="FFBFCDC6"/></bottom><diagonal/></border>' +
      '<border><left style="thin"><color rgb="FF231F20"/></left><right style="thin"><color rgb="FF231F20"/></right>' +
      '<top style="thin"><color rgb="FF231F20"/></top><bottom style="thin"><color rgb="FF231F20"/></bottom><diagonal/></border>' +
    '</borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="17">' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment vertical="top" wrapText="1"/></xf>' +
      '<xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"><alignment vertical="top"/></xf>' +
      '<xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment vertical="top" wrapText="1"/></xf>' +
      '<xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment vertical="top" wrapText="1"/></xf>' +
      '<xf numFmtId="0" fontId="4" fillId="0" borderId="2" xfId="0" applyFont="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +          /* 5 title */
      '<xf numFmtId="0" fontId="1" fillId="0" borderId="2" xfId="0" applyFont="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>' +                       /* 6 date */
      '<xf numFmtId="0" fontId="5" fillId="0" borderId="2" xfId="0" applyFont="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>' +                       /* 7 dow */
      '<xf numFmtId="0" fontId="1" fillId="8" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>' +         /* 8 dowSun */
      '<xf numFmtId="0" fontId="1" fillId="0" borderId="2" xfId="0" applyFont="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +          /* 9 mealtag */
      '<xf numFmtId="0" fontId="3" fillId="4" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" textRotation="90"/></xf>' +  /* 10 vProino */
      '<xf numFmtId="0" fontId="3" fillId="5" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" textRotation="90"/></xf>' +  /* 11 vDuo */
      '<xf numFmtId="0" fontId="3" fillId="6" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" textRotation="90"/></xf>' +  /* 12 vGevma */
      '<xf numFmtId="0" fontId="3" fillId="7" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" textRotation="90"/></xf>' +  /* 13 vVradino */
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="2" xfId="0" applyBorder="1"><alignment vertical="top" wrapText="1"/></xf>' +                                               /* 14 cell */
      '<xf numFmtId="0" fontId="6" fillId="9" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +       /* 15 note */
      '<xf numFmtId="0" fontId="7" fillId="0" borderId="2" xfId="0" applyFont="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>' +                       /* 16 acthead */
    '</cellXfs>' +
    '</styleSheet>';

  function sheetXML(sheet) {
    var xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">';
    if (sheet.landscape) xml += '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>';
    if (sheet.cols && sheet.cols.length) {
      xml += '<cols>';
      sheet.cols.forEach(function (w, i) {
        xml += '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + (w || 12) + '" customWidth="1"/>';
      });
      xml += '</cols>';
    }
    xml += '<sheetData>';
    (sheet.rows || []).forEach(function (row, r) {
      var ht = sheet.heights && sheet.heights[r];
      xml += '<row r="' + (r + 1) + '"' + (ht ? ' ht="' + ht + '" customHeight="1"' : '') + '>';
      (row || []).forEach(function (cell, c) {
        if (cell == null || cell === "") return;
        var v = cell, styleKey = "";
        if (typeof cell === "object") { v = cell.v; styleKey = cell.s || ""; }
        var ref = colName(c) + (r + 1);
        var sid = STYLE_IDS[styleKey] || 0;
        if (v == null || v === "") {
          // κελί χωρίς τιμή αλλά με στυλ → κρατάει περίγραμμα/φόντο (κενά κουτάκια εντύπου)
          if (styleKey) xml += '<c r="' + ref + '" s="' + sid + '"/>';
          return;
        }
        if (typeof v === "number" && isFinite(v)) {
          xml += '<c r="' + ref + '" s="' + sid + '"><v>' + v + '</v></c>';
        } else {
          xml += '<c r="' + ref + '" s="' + sid + '" t="inlineStr"><is><t xml:space="preserve">' + esc(v) + '</t></is></c>';
        }
      });
      xml += '</row>';
    });
    xml += '</sheetData>';
    if (sheet.merges && sheet.merges.length) {
      xml += '<mergeCells count="' + sheet.merges.length + '">';
      sheet.merges.forEach(function (m) { xml += '<mergeCell ref="' + m + '"/>'; });
      xml += '</mergeCells>';
    }
    if (sheet.landscape) {
      xml += '<pageMargins left="0.25" right="0.25" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>' +
        '<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>';
    }
    xml += '</worksheet>';
    return xml;
  }

  function workbook(sheets) {
    var enc = new TextEncoder();
    function U(s) { return enc.encode(s); }
    var files = [];

    var ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>';
    sheets.forEach(function (_, i) {
      ct += '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
    });
    ct += '</Types>';
    files.push({ name: "[Content_Types].xml", data: U(ct) });

    files.push({
      name: "_rels/.rels", data: U(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>')
    });

    var wb = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>';
    var wbRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">';
    sheets.forEach(function (s, i) {
      var nm = esc((s.name || "Φύλλο" + (i + 1)).replace(/[\\\/\?\*\[\]:]/g, " ").slice(0, 31));
      wb += '<sheet name="' + nm + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>';
      wbRels += '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>';
    });
    var styleRid = "rId" + (sheets.length + 1);
    wb += '</sheets></workbook>';
    wbRels += '<Relationship Id="' + styleRid + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>';
    wbRels += '</Relationships>';

    files.push({ name: "xl/workbook.xml", data: U(wb) });
    files.push({ name: "xl/_rels/workbook.xml.rels", data: U(wbRels) });
    files.push({ name: "xl/styles.xml", data: U(STYLES_XML) });
    sheets.forEach(function (s, i) {
      files.push({ name: "xl/worksheets/sheet" + (i + 1) + ".xml", data: U(sheetXML(s)) });
    });
    return buildZip(files);
  }

  function download(filename, sheets) {
    var bytes = workbook(sheets);
    var blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  }

  global.MiniXLSX = { download: download, build: workbook };
})(window);
