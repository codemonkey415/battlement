/*!
 * Battlement Systems — Data Journey / Lab to Core
 * Standalone Webflow embed. No dependencies.
 *
 * Usage:  <div data-bs-lab-to-core></div>
 *         <script src=".../bs-lab-to-core.js"></script>
 *
 * Designed against a #1A162E background.
 */
(function () {
  "use strict";

  var GOLD = "#FFEF00";
  var MONO_F = "'DM Mono', ui-monospace, SFMono-Regular, Menlo, monospace";
  var BODY_F = "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  var CARD = "#221E38";
  var BG = "#1A162E";
  var DEEP = "#2A264A";
  var LIGHT = "rgba(240,240,240,0.75)";
  var FAINT = "rgba(240,240,240,0.35)";
  var BODY_FILL = "#C8C8D8";

  // ── isometric projection ─────────────────────────────────
  // screen = (ox + 0.866·(x − y), oy + 0.5·(x + y) − z), z points up
  var IX = 0.866;
  var IY = 0.5;

  function ip(ox, oy, x, y, z) {
    return (ox + IX * (x - y)).toFixed(1) + "," + (oy + IY * (x + y) - z).toFixed(1);
  }

  // box drawn from its floor "north" corner (ox, oy): top + two visible faces
  function isoBox(o) {
    var ox = o.ox, oy = o.oy, w = o.w, d = o.d, h = o.h;
    var top = o.top || "rgba(240,240,240,0.10)";
    var dl = o.dl || DEEP;
    var dr = o.dr || CARD;
    var stroke = o.stroke || LIGHT;
    var sw = o.sw == null ? 2.5 : o.sw;
    var P = function (x, y, z) { return ip(ox, oy, x, y, z); };

    return '<g stroke="' + stroke + '" stroke-width="' + sw + '" stroke-linejoin="round">' +
      '<polygon points="' + P(0, 0, h) + " " + P(w, 0, h) + " " + P(w, d, h) + " " + P(0, d, h) + '" fill="' + top + '"/>' +
      '<polygon points="' + P(0, d, h) + " " + P(w, d, h) + " " + P(w, d, 0) + " " + P(0, d, 0) + '" fill="' + dl + '"/>' +
      '<polygon points="' + P(w, 0, h) + " " + P(w, d, h) + " " + P(w, d, 0) + " " + P(w, 0, 0) + '" fill="' + dr + '"/>' +
      "</g>";
  }

  // isometric server rack with slots + LEDs on the down-left face
  function isoRack(ox, oy) {
    var w = 64, d = 44, h = 132;
    var fx = ox + IX * (0 - d);
    var fy = oy + IY * d - h;
    var out = "<g>" + isoBox({ ox: ox, oy: oy, w: w, d: d, h: h, top: "rgba(240,240,240,0.14)" });
    out += '<g transform="matrix(' + IX + "," + IY + ",0,1," + fx.toFixed(1) + "," + fy.toFixed(1) + ')">';
    var slots = [12, 48, 84];
    for (var i = 0; i < slots.length; i++) {
      var sy = slots[i];
      out += "<g>" +
        '<rect x="7" y="' + sy + '" width="' + (w - 14) + '" height="24" fill="rgba(240,240,240,0.06)" stroke="' + FAINT + '" stroke-width="2"/>' +
        '<circle cx="' + (w - 24) + '" cy="' + (sy + 12) + '" r="2.5" fill="' + GOLD + '"/>' +
        '<circle cx="' + (w - 13) + '" cy="' + (sy + 12) + '" r="2.5" fill="' + GOLD + '"/>' +
        "</g>";
    }
    out += '<path d="M8 118 h' + (w - 16) + " M8 125 h" + (w - 16) + '" stroke="rgba(240,240,240,0.25)" stroke-width="2"/>';
    return out + "</g></g>";
  }

  // the pipe runs along isometric axes: 30° runs with a drop into the vault
  var PIPE_PATH = "M368 470 L828 735 L380 994 L830 1254 L612 1380";

  // perimeter fence posts (screen coords) around the compound diamond
  var FENCE_POSTS = [
    [328, 854], [475.2, 939], [622.4, 1024], [527.2, 1079],
    [431.9, 1134], [284.7, 1049], [137.5, 964], [232.7, 909]
  ];

  var STEP_NAMES = [
    "Origin: AI lab terminal",
    "Secure transit via DWDM circuits",
    "Perimeter and facility defense",
    "Biometric access control",
    "The hardened core"
  ];

  var STEP_TEXTS = [
    { n: "01", titleLines: ["ORIGIN: AI LAB TERMINAL"], lx: 120, ly: 560, lw: 428,
      bodyLines: ["The data journey begins at a", "terminal laptop within the", "Big Pharma AI lab."], bx: 120, by: 610 },
    { n: "02", titleLines: ["SECURE TRANSIT", "VIA DWDM CIRCUITS"], lx: 866, ly: 496, lw: 302,
      bodyLines: ["Data is “piped” through", "high-capacity circuits", "to a facility 10–30", "miles away."], bx: 890, by: 592 },
    { n: "03", titleLines: ["PERIMETER AND", "FACILITY DEFENSE"], lx: 120, ly: 1062, lw: 288,
      bodyLines: ["The SOC 2 and HIPAA", "compliant center is", "protected by fencing", "and mantraps."], bx: 120, by: 1152 },
    { n: "04", titleLines: ["BIOMETRIC", "ACCESS CONTROL"], lx: 896, ly: 1282, lw: 232,
      bodyLines: ["Data resides within", "nested security layers,", "including biometric", "rooms and cages."], bx: 896, by: 1372 },
    { n: "05", titleLines: ["THE HARDENED CORE"], lx: 446, ly: 1852, lw: 344,
      bodyLines: ["Rack-mounted servers are near", "air-gapped, hardened, and", "21 CFR Part 11 compliant."], bx: 446, by: 1898 }
  ];

  // ── styles ───────────────────────────────────────────────

  var CSS = [
    '.bs-ltc{--bs-gold:#FFEF00;--bs-border:rgba(255,255,255,0.09);--bs-muted:#C8C8D8;',
    'max-width:48rem;margin:0 auto;font-family:' + BODY_F + ';box-sizing:border-box}',
    '.bs-ltc *,.bs-ltc *::before,.bs-ltc *::after{box-sizing:border-box}',
    '.bs-ltc__scroll{overflow-x:auto}',
    '.bs-ltc__inner{min-width:560px}',
    '.bs-ltc__svg{width:100%;height:auto;display:block}',

    // pipe flow
    '@media (prefers-reduced-motion: no-preference){.bs-flow{animation:bs-flow-drift 30s linear infinite}}',
    '@keyframes bs-flow-drift{to{stroke-dashoffset:-760}}',

    // stages
    '.bs-step{cursor:pointer;transition:opacity 400ms ease;opacity:.3}',
    '.bs-step.bs-active{opacity:1}',
    '.bs-step:not(.bs-active):hover{opacity:.6}',
    '.bs-step:focus{outline:none}',
    '.bs-step:focus-visible{outline:2px solid rgba(255,239,0,.7);outline-offset:6px}',
    '.bs-lbl{cursor:pointer}',
    '.bs-lbl rect,.bs-lbl text,.bs-lbl tspan{transition:fill 400ms ease,stroke 400ms ease}',

    // controls
    '.bs-ltc__controls{margin-top:1.5rem;display:flex;align-items:center;justify-content:center;gap:1.25rem}',
    '.bs-ltc__btn{border:1px solid var(--bs-border);background:transparent;padding:.5rem 1rem;',
    'font-family:' + MONO_F + ';font-size:10px;letter-spacing:.25em;text-transform:uppercase;',
    'color:var(--bs-muted);cursor:pointer;transition:border-color 200ms ease,color 200ms ease}',
    '.bs-ltc__btn:hover{border-color:var(--bs-gold);color:var(--bs-gold)}',
    '.bs-ltc__btn:focus-visible{outline:2px solid rgba(255,239,0,.7);outline-offset:2px}',
    '.bs-ltc__count{font-family:' + MONO_F + ';font-size:10px;letter-spacing:.3em;color:var(--bs-gold)}',
    '.bs-ltc__status{margin-top:.75rem;text-align:center;font-family:' + MONO_F + ';font-size:10px;',
    'letter-spacing:.3em;text-transform:uppercase;color:var(--bs-muted)}'
  ].join("");

  // ── stage artwork ────────────────────────────────────────

  function stepGroup(i, inner) {
    return '<g class="bs-step" data-step="' + i + '" role="button" tabindex="0" ' +
      'aria-label="' + STEP_NAMES[i] + '" aria-pressed="false">' + inner + "</g>";
  }

  // 01 · origin: AI lab terminal — isometric laptop
  function step01() {
    return stepGroup(0,
      '<g stroke-linejoin="round">' +
      '<polygon points="230,390 359.9,460 273.3,510 143.4,435" fill="rgba(240,240,240,0.10)" stroke="' + LIGHT + '" stroke-width="3"/>' +
      '<polygon points="143.4,435 273.3,510 273.3,520 143.4,445" fill="' + DEEP + '" stroke="' + LIGHT + '" stroke-width="3"/>' +
      '<polygon points="359.9,460 273.3,510 273.3,520 359.9,470" fill="' + CARD + '" stroke="' + LIGHT + '" stroke-width="3"/>' +
      '<polygon points="230,390 359.9,460 359.9,370 230,300" fill="' + CARD + '" stroke="' + LIGHT + '" stroke-width="3.5"/>' +
      '<g transform="matrix(0.866,0.5,0,1,230,300)">' +
      '<rect x="10" y="8" width="130" height="74" fill="' + BG + '"/>' +
      '<path d="M20 26 h40 M20 42 h64 M20 58 h30" stroke="' + GOLD + '" stroke-width="3" stroke-linecap="round" opacity="0.85"/>' +
      "</g>" +
      '<rect x="380" y="296" width="68" height="46" fill="' + CARD + '" stroke="' + LIGHT + '" stroke-width="3"/>' +
      '<polygon points="392,342 408,342 388,358" fill="' + CARD + '" stroke="' + LIGHT + '" stroke-width="3"/>' +
      '<text x="414" y="326" text-anchor="middle" font-family="' + MONO_F + '" font-size="19" fill="' + GOLD + '">&lt;/&gt;</text>' +
      "</g>");
  }

  // 02 · secure transit via DWDM (fiber cross-section on the pipe)
  function step02() {
    return stepGroup(1,
      '<circle cx="828" cy="735" r="46" fill="' + BG + '" stroke="' + LIGHT + '" stroke-width="5"/>' +
      '<g fill="none" stroke="' + GOLD + '" stroke-width="3">' +
      '<circle cx="828" cy="735" r="6"/><circle cx="828" cy="719" r="6"/>' +
      '<circle cx="843" cy="743" r="6"/><circle cx="813" cy="743" r="6"/>' +
      '<circle cx="841" cy="725" r="4"/><circle cx="815" cy="725" r="4"/></g>');
  }

  // 03 · perimeter and facility defense — isometric fenced compound
  function step03() {
    var inner = "<g>" +
      '<polygon points="328,854 622.4,1024 431.9,1134 137.5,964" fill="rgba(240,240,240,0.03)" stroke="rgba(240,240,240,0.3)" stroke-width="2"/>';

    // cross-braced fence panels
    for (var i = 0; i < FENCE_POSTS.length; i++) {
      var p = FENCE_POSTS[i];
      var q = FENCE_POSTS[(i + 1) % FENCE_POSTS.length];
      inner += "<g>" +
        '<line x1="' + p[0] + '" y1="' + (p[1] - 30) + '" x2="' + q[0] + '" y2="' + (q[1] - 3) + '" stroke="rgba(240,240,240,0.18)" stroke-width="2"/>' +
        '<line x1="' + p[0] + '" y1="' + (p[1] - 3) + '" x2="' + q[0] + '" y2="' + (q[1] - 30) + '" stroke="rgba(240,240,240,0.18)" stroke-width="2"/>' +
        "</g>";
    }

    var rail = function (dy) {
      return FENCE_POSTS.map(function (pt) { return pt[0] + "," + (pt[1] - dy); }).join(" ");
    };
    inner += '<polygon points="' + rail(32) + '" fill="none" stroke="rgba(240,240,240,0.45)" stroke-width="2.5"/>';
    inner += '<polygon points="' + rail(16) + '" fill="none" stroke="rgba(240,240,240,0.3)" stroke-width="2"/>';

    for (var j = 0; j < FENCE_POSTS.length; j++) {
      var pt = FENCE_POSTS[j];
      inner += '<line x1="' + pt[0] + '" y1="' + pt[1] + '" x2="' + pt[0] + '" y2="' + (pt[1] - 32) +
        '" stroke="rgba(240,240,240,0.6)" stroke-width="3.5" stroke-linecap="round"/>';
    }

    inner += '<rect x="318" y="808" width="22" height="12" fill="rgba(240,240,240,0.6)"/>' +
      '<circle cx="335" cy="814" r="3" fill="' + GOLD + '"/>' +
      '<rect x="612" y="978" width="22" height="12" fill="rgba(240,240,240,0.6)"/>' +
      '<circle cx="629" cy="984" r="3" fill="' + GOLD + '"/>' +
      isoBox({ ox: 430, oy: 1030, w: 54, d: 46, h: 44 }) +
      '<g transform="matrix(0.866,0.5,0,1,390.2,1009)">' +
      '<rect x="19" y="16" width="16" height="28" fill="rgba(240,240,240,0.15)" stroke="' + FAINT + '" stroke-width="2"/></g>' +
      "</g>";

    // shield medallion on the pipe
    inner += '<circle cx="380" cy="994" r="34" fill="' + BG + '" stroke="' + LIGHT + '" stroke-width="5"/>' +
      '<g transform="translate(364,976)">' +
      '<path d="M16 0 C11 2 5 3 0 4 C0 18 5 29 16 36 C27 29 32 18 32 4 C27 3 21 2 16 0 Z" fill="none" stroke="' + LIGHT + '" stroke-width="3"/>' +
      '<rect x="11" y="16" width="10" height="8" fill="' + GOLD + '"/>' +
      '<path d="M13 16 v-3 a3 3 0 0 1 6 0 v3" fill="none" stroke="' + GOLD + '" stroke-width="2.5"/></g>';

    return stepGroup(2, inner);
  }

  // 04 · biometric access control — isometric scan room on the pipe
  function step04() {
    return stepGroup(3,
      isoBox({ ox: 770, oy: 1180, w: 120, d: 90, h: 110 }) +
      '<g transform="matrix(0.866,0.5,0,1,692.1,1115)" fill="none" stroke="' + GOLD + '" stroke-width="3.5" stroke-linecap="round">' +
      '<path d="M36 58 A24 24 0 1 1 84 58"/>' +
      '<path d="M44 58 A16 16 0 1 1 76 58"/>' +
      '<path d="M52 58 A8 8 0 1 1 68 58"/>' +
      '<circle cx="60" cy="58" r="2.5" fill="' + GOLD + '" stroke="none"/></g>');
  }

  // 05 · the hardened core — isometric cutaway vault
  function step05() {
    return stepGroup(4,
      '<polygon points="560,1440 889,1630 646.5,1770 317.5,1580" fill="rgba(240,240,240,0.03)" stroke="' + FAINT + '" stroke-width="2"/>' +
      '<polygon points="586,1470 837.1,1615 646.5,1725 395.4,1580" fill="none" stroke="rgba(255,239,0,0.45)" stroke-width="2.5" stroke-dasharray="12 10"/>' +
      '<polygon points="560,1350 317.5,1490 317.5,1580 560,1440" fill="rgba(34,30,56,0.75)" stroke="' + LIGHT + '" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<polygon points="560,1350 889,1540 889,1630 560,1440" fill="rgba(42,38,74,0.75)" stroke="' + LIGHT + '" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<ellipse cx="612" cy="1380" rx="16" ry="9" fill="' + CARD + '" stroke="' + LIGHT + '" stroke-width="3"/>' +
      '<ellipse cx="612" cy="1380" rx="7" ry="4" fill="none" stroke="' + GOLD + '" stroke-width="2"/>' +
      isoRack(516.7, 1505) + isoRack(589.4, 1547) + isoRack(662, 1589) + isoRack(734.7, 1631) +
      '<polygon points="317.5,1554 646.5,1744 646.5,1770 317.5,1580" fill="' + DEEP + '" stroke="' + LIGHT + '" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<polygon points="889,1604 646.5,1744 646.5,1770 889,1630" fill="' + CARD + '" stroke="' + LIGHT + '" stroke-width="2.5" stroke-linejoin="round"/>');
  }

  // label plate + body copy. Rendered above all artwork and NEVER alpha-dimmed:
  // the plate stays opaque so the pipe cannot bleed through the text.
  function stepText(t, i) {
    var out = '<g class="bs-lbl" data-step="' + i + '" aria-hidden="true">' +
      '<rect class="bs-lbl__plate" x="' + (t.lx - 18) + '" y="' + (t.ly - 30) + '" width="' + t.lw +
      '" height="' + (t.titleLines.length * 34 + 12) + '" fill="' + CARD +
      '" stroke="rgba(240,240,240,0.18)" stroke-width="1.5"/>';

    for (var j = 0; j < t.titleLines.length; j++) {
      var line = t.titleLines[j];
      out += '<text class="bs-lbl__title" x="' + t.lx + '" y="' + (t.ly + j * 34) + '" font-family="' + MONO_F +
        '" font-size="20" letter-spacing="2" fill="rgba(240,240,240,0.4)">';
      out += j === 0
        ? '<tspan class="bs-lbl__n" fill="rgba(255,239,0,0.45)">' + t.n + " / </tspan><tspan>" + line + "</tspan>"
        : line;
      out += "</text>";
    }

    out += '<g class="bs-lbl__body" font-family="' + BODY_F + '" font-size="21" font-weight="300" fill="rgba(200,200,216,0.35)">';
    for (var k = 0; k < t.bodyLines.length; k++) {
      out += '<text x="' + t.bx + '" y="' + (t.by + k * 28) + '">' + t.bodyLines[k] + "</text>";
    }
    return out + "</g></g>";
  }

  // ── markup ───────────────────────────────────────────────

  function svgMarkup() {
    var out = '<svg class="bs-ltc__svg" viewBox="90 290 1080 1700" role="img" aria-label="Fortress architecture: ' +
      'the data journey from the AI lab terminal through secure DWDM transit, perimeter defense, and biometric ' +
      'access control into the hardened server core">';

    // the data pipe
    out += '<g fill="none" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="' + PIPE_PATH + '" stroke="' + FAINT + '" stroke-width="34"/>' +
      '<path d="' + PIPE_PATH + '" stroke="' + CARD + '" stroke-width="24"/>' +
      '<path class="bs-flow" d="' + PIPE_PATH + '" stroke="' + GOLD + '" stroke-width="4" stroke-dasharray="16 22" opacity="0.9"/>' +
      "</g>";

    // flow chevron + tube couplings, aligned to the 30° runs
    out += '<g transform="translate(598,602) rotate(30)">' +
      '<polyline points="-9,-11 5,0 -9,11" fill="none" stroke="' + GOLD + '" stroke-width="4" ' +
      'stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/></g>';
    out += '<g fill="' + CARD + '" stroke="' + LIGHT + '" stroke-width="2">';
    var couplings = ["translate(483,536) rotate(30)", "translate(649,839) rotate(-30)", "translate(515,1072) rotate(30)"];
    for (var c = 0; c < couplings.length; c++) {
      out += '<g transform="' + couplings[c] + '">' +
        '<rect x="-12" y="-25" width="7" height="50"/><rect x="6" y="-25" width="7" height="50"/></g>';
    }
    out += "</g>";

    out += step01() + step02() + step03() + step04() + step05();

    // label plates + copy: opaque layer above all artwork
    for (var i = 0; i < STEP_TEXTS.length; i++) out += stepText(STEP_TEXTS[i], i);

    return out + "</svg>";
  }

  // ── behaviour ────────────────────────────────────────────

  function build(root) {
    root.classList.add("bs-ltc");
    root.innerHTML =
      '<div class="bs-ltc__scroll"><div class="bs-ltc__inner">' + svgMarkup() + "</div></div>" +
      '<div class="bs-ltc__controls">' +
      '<button type="button" class="bs-ltc__btn" data-nav="prev" aria-label="Previous stage">‹ Prev</button>' +
      '<span class="bs-ltc__count">01 / 05</span>' +
      '<button type="button" class="bs-ltc__btn" data-nav="next" aria-label="Next stage">Next ›</button>' +
      "</div>" +
      '<div class="bs-ltc__status" aria-live="polite"></div>';

    var steps = root.querySelectorAll(".bs-step");
    var labels = root.querySelectorAll(".bs-lbl");
    var count = root.querySelector(".bs-ltc__count");
    var status = root.querySelector(".bs-ltc__status");
    var active = -1;

    function setActive(i) {
      if (i === active) return;
      active = i;
      for (var k = 0; k < STEP_TEXTS.length; k++) {
        var on = k === i;

        steps[k].classList.toggle("bs-active", on);
        steps[k].setAttribute("aria-pressed", on ? "true" : "false");

        var lbl = labels[k];
        lbl.querySelector(".bs-lbl__plate").style.stroke = on ? "rgba(255,239,0,0.55)" : "rgba(240,240,240,0.18)";
        lbl.querySelector(".bs-lbl__n").style.fill = on ? GOLD : "rgba(255,239,0,0.45)";
        lbl.querySelector(".bs-lbl__body").style.fill = on ? BODY_FILL : "rgba(200,200,216,0.35)";

        var titles = lbl.querySelectorAll(".bs-lbl__title");
        for (var t = 0; t < titles.length; t++) {
          titles[t].style.fill = on ? "#F0F0F0" : "rgba(240,240,240,0.4)";
        }
      }
      count.textContent = "0" + (i + 1) + " / 05";
      status.textContent = STEP_NAMES[i];
    }

    function wire(nodes, keyboard) {
      Array.prototype.forEach.call(nodes, function (node) {
        var idx = parseInt(node.getAttribute("data-step"), 10);
        node.addEventListener("click", function () { setActive(idx); });
        if (keyboard) {
          node.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActive(idx); }
          });
        }
      });
    }

    wire(steps, true);
    wire(labels, false);

    var n = STEP_NAMES.length;
    root.querySelector('[data-nav="prev"]').addEventListener("click", function () {
      setActive((active + n - 1) % n);
    });
    root.querySelector('[data-nav="next"]').addEventListener("click", function () {
      setActive((active + 1) % n);
    });

    setActive(0);
  }

  // ── bootstrap ────────────────────────────────────────────

  function injectOnce(id, make) {
    if (document.getElementById(id)) return;
    var el = make();
    el.id = id;
    document.head.appendChild(el);
  }

  function init() {
    injectOnce("bs-ltc-css", function () {
      var s = document.createElement("style");
      s.textContent = CSS;
      return s;
    });
    injectOnce("bs-dm-mono", function () {
      var l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap";
      return l;
    });

    var targets = document.querySelectorAll("[data-bs-lab-to-core]");
    Array.prototype.forEach.call(targets, function (el) {
      if (el.getAttribute("data-bs-mounted")) return;
      el.setAttribute("data-bs-mounted", "1");
      build(el);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
