/*!
 * Battlement Systems — Defense in Depth (four concentric walls)
 * Standalone Webflow embed. No dependencies.
 *
 * Usage:  <div data-bs-rings></div>
 *         <script src=".../bs-rings.js"></script>
 *
 * NOTE: the wall fills are opaque and precomposed against #1A162E so that nearer
 * walls genuinely occlude the ones behind them. Put this on a #1A162E section.
 */
(function () {
  "use strict";

  var GOLD = "#FFEF00";
  var BG = "#1A162E";
  var CARD = "#221E38";
  var MONO_F = "'DM Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

  var CX = 400;
  var CY = 400;
  var S = 0.55; // vertical squash for the 3D viewing angle

  // inner wall outward
  var WALLS = [
    { ri: 106, ro: 156, h: 20, top: "#74727F", front: "#474457", teeth: "rgba(240,240,240,0.47)", dur: 180, rev: false },
    { ri: 176, ro: 226, h: 24, top: "#565364", front: "#383549", teeth: "rgba(240,240,240,0.33)", dur: 220, rev: true },
    { ri: 248, ro: 298, h: 28, top: "#3C394D", front: "#2B273E", teeth: "rgba(240,240,240,0.21)", dur: 260, rev: false },
    { ri: 320, ro: 372, h: 34, top: "#2B273E", front: "#231F36", teeth: "rgba(240,240,240,0.13)", dur: 300, rev: true }
  ];

  // active layer, precomposed gold tints
  var ACTIVE_TOP = "#5F5720";
  var ACTIVE_FRONT = "#3F3927";

  var RING_NAMES = [
    "Layer 1: secure transmission via DWDM circuits",
    "Layer 2: hardened, compliant server infrastructure",
    "Layer 3: multi-tier biometric containment",
    "Layer 4: maximum security facility perimeter"
  ];

  // badge positions on the wall tops (ellipse-projected)
  var BADGES = [
    { n: "1", x: 500, y: 354 },
    { n: "2", x: 594, y: 371 },
    { n: "3", x: 672, y: 413 },
    { n: "4", x: 714, y: 480 }
  ];

  var LAYERS = [
    { n: "01", title: "Secure Transmission via DWDM Circuits", body: "Data is piped directly from AI lab terminals to hardened servers via dedicated circuits." },
    { n: "02", title: "Hardened, Compliant Server Infrastructure", body: "Systems are near air-gapped, hardened, and 21 CFR Part 11 compliant." },
    { n: "03", title: "Multi-Tier Biometric Containment", body: "Servers reside within biometric cages inside dedicated biometric secure rooms." },
    { n: "04", title: "Maximum Security Facility Perimeter", body: "The SOC 2 and HIPAA compliant facility is protected by mantraps, fencing, and 24/7 personnel." }
  ];

  // ── geometry ─────────────────────────────────────────────

  // flat annulus (wall top surface) as two ellipse subpaths, evenodd
  function ringTop(ro, ri) {
    var ell = function (r) {
      return "M " + (CX - r) + " " + CY +
        " A " + r + " " + (r * S).toFixed(1) + " 0 1 0 " + (CX + r) + " " + CY +
        " A " + r + " " + (r * S).toFixed(1) + " 0 1 0 " + (CX - r) + " " + CY + " Z";
    };
    return ell(ro) + " " + ell(ri);
  }

  // extruded front face: near half of the outer ellipse dropped by the wall height
  function ringFront(ro, h) {
    var ry = (ro * S).toFixed(1);
    return "M " + (CX - ro) + " " + CY +
      " A " + ro + " " + ry + " 0 0 0 " + (CX + ro) + " " + CY +
      " L " + (CX + ro) + " " + (CY + h) +
      " A " + ro + " " + ry + " 0 0 1 " + (CX - ro) + " " + (CY + h) + " Z";
  }

  // ── styles ───────────────────────────────────────────────

  var CSS = [
    '.bs-rings{--bs-gold:#FFEF00;--bs-border:rgba(255,255,255,0.09);--bs-fg:#F0F0F0;--bs-muted:#C8C8D8;--bs-secondary:#242040;',
    'display:grid;grid-template-columns:1fr;gap:3rem;align-items:center;',
    'font-family:system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--bs-fg);box-sizing:border-box}',
    '.bs-rings *,.bs-rings *::before,.bs-rings *::after{box-sizing:border-box}',
    '@media (min-width:1024px){.bs-rings{grid-template-columns:1fr 1fr;gap:4rem}}',

    // stage (svg column)
    '.bs-rings__stage{max-width:36rem;margin:0 auto;width:100%}',
    '.bs-rings__svg{width:100%;height:auto;display:block}',

    // crenellation drift
    '@media (prefers-reduced-motion: no-preference){',
    '.bsr-spin{animation:bsr-drift linear infinite}',
    '.bsr-spin-rev{animation:bsr-drift linear infinite reverse}}',
    '@keyframes bsr-drift{to{stroke-dashoffset:-360}}',
    '.bsr-ring{cursor:pointer}',
    '.bsr-ring path{transition:fill 400ms ease}',
    '.bsr-ring ellipse{transition:stroke 400ms ease}',
    '.bsr-ring:focus{outline:none}',
    '.bsr-ring:focus-visible{outline:2px solid rgba(255,239,0,.7);outline-offset:4px}',
    '.bsr-badge{cursor:pointer}',
    '.bsr-badge circle,.bsr-badge text{transition:fill 400ms ease}',

    // layer list
    '.bs-rings__list{border:1px solid var(--bs-border)}',
    '.bs-rings__item{display:flex;align-items:flex-start;gap:1.25rem;width:100%;text-align:left;',
    'padding:1.5rem;background:transparent;border:0;border-radius:0;color:inherit;font:inherit;cursor:pointer;',
    'transition:background-color 300ms ease}',
    '@media (min-width:768px){.bs-rings__item{padding:1.75rem}}',
    '.bs-rings__item + .bs-rings__item{border-top:1px solid var(--bs-border)}',
    '.bs-rings__item:hover{background:var(--bs-secondary)}',
    '.bs-rings__item[aria-pressed="true"]{background:rgba(255,239,0,.05)}',
    '.bs-rings__item:focus-visible{outline:2px solid rgba(255,239,0,.7);outline-offset:-2px}',
    '.bs-rings__num{width:2rem;height:2rem;flex-shrink:0;margin-top:.125rem;display:flex;align-items:center;',
    'justify-content:center;border:1px solid rgba(255,239,0,.35);transition:border-color 300ms ease,background-color 300ms ease}',
    '.bs-rings__num span{font-family:' + MONO_F + ';font-size:10px;line-height:1;color:var(--bs-gold);transition:color 300ms ease}',
    '.bs-rings__item[aria-pressed="true"] .bs-rings__num{border-color:var(--bs-gold);background:var(--bs-gold)}',
    '.bs-rings__item[aria-pressed="true"] .bs-rings__num span{color:#1A162E}',
    '.bs-rings__title{display:block;font-size:.875rem;font-weight:500;line-height:1.4;margin:0 0 .375rem;color:var(--bs-fg)}',
    '.bs-rings__body{display:block;font-size:.75rem;font-weight:300;line-height:1.625;margin:0;color:var(--bs-muted)}'
  ].join("");

  // ── markup ───────────────────────────────────────────────

  function svgMarkup() {
    var out = '<svg class="bs-rings__svg" viewBox="0 160 800 510" role="img" ' +
      'aria-label="Fortress data security architecture: four concentric defensive walls around the AI lab and data origin">';

    // the keep first: its base tucks behind the nearer walls painted after it
    out += '<path d="M ' + (CX - 95) + ' ' + CY + ' A 95 52.3 0 0 0 ' + (CX + 95) + ' ' + CY +
      ' L ' + (CX + 95) + ' ' + (CY + 30) + ' A 95 52.3 0 0 1 ' + (CX - 95) + ' ' + (CY + 30) + ' Z" ' +
      'fill="#1B1730" stroke="rgba(255,239,0,0.35)" stroke-width="1.5"/>';
    out += '<ellipse cx="' + CX + '" cy="' + CY + '" rx="95" ry="52.3" fill="' + CARD + '" ' +
      'stroke="rgba(255,239,0,0.5)" stroke-width="2"/>';

    for (var i = 0; i < WALLS.length; i++) {
      var w = WALLS[i];
      var rm = (w.ri + w.ro) / 2;
      out += '<g class="bsr-ring" data-ring="' + i + '" role="button" tabindex="0" ' +
        'aria-label="' + RING_NAMES[i] + '" aria-pressed="false">' +
        // extruded wall face
        '<path class="bsr-front" d="' + ringFront(w.ro, w.h) + '" fill="' + w.front + '"/>' +
        // wall top surface
        '<path class="bsr-top" d="' + ringTop(w.ro, w.ri) + '" fill-rule="evenodd" fill="' + w.top + '" ' +
        'stroke="rgba(240,240,240,0.12)" stroke-width="1"/>' +
        // crenellation teeth drifting along the wall walk
        '<ellipse class="bsr-teeth ' + (w.rev ? "bsr-spin-rev" : "bsr-spin") + '" cx="' + CX + '" cy="' + CY + '" ' +
        'rx="' + rm + '" ry="' + (rm * S) + '" pathLength="360" fill="none" stroke="' + w.teeth + '" ' +
        'stroke-width="12" stroke-dasharray="7 5" style="animation-duration:' + w.dur + 's"/>' +
        '</g>';
    }

    // core mark
    out += '<g transform="translate(' + CX + ',366)">' +
      '<rect x="-19" y="-19" width="38" height="38" fill="' + BG + '" stroke="' + GOLD + '" stroke-width="2.5"/>' +
      '<rect x="-9" y="-9" width="18" height="18" fill="' + GOLD + '"/>' +
      '<path d="M-11 -19 v-6 M0 -19 v-6 M11 -19 v-6 M-11 19 v6 M0 19 v6 M11 19 v6 M-19 -11 h-6 M-19 0 h-6 M-19 11 h-6 M19 -11 h6 M19 0 h6 M19 11 h6" ' +
      'stroke="rgba(240,240,240,0.5)" stroke-width="2.5" stroke-linecap="round"/></g>';
    out += '<text x="' + CX + '" y="412" text-anchor="middle" font-family="' + MONO_F + '" font-size="15" letter-spacing="2" fill="#F0F0F0">AI LAB &amp;</text>';
    out += '<text x="' + CX + '" y="434" text-anchor="middle" font-family="' + MONO_F + '" font-size="15" letter-spacing="2" fill="#F0F0F0">DATA ORIGIN</text>';

    for (var b = 0; b < BADGES.length; b++) {
      var bd = BADGES[b];
      out += '<g class="bsr-badge" data-ring="' + b + '" aria-hidden="true">' +
        '<circle cx="' + bd.x + '" cy="' + bd.y + '" r="17" fill="' + BG + '" stroke="' + GOLD + '" stroke-width="2"/>' +
        '<text x="' + bd.x + '" y="' + (bd.y + 5.5) + '" text-anchor="middle" font-family="' + MONO_F + '" ' +
        'font-size="15" fill="' + GOLD + '">' + bd.n + '</text></g>';
    }

    return out + "</svg>";
  }

  function listMarkup() {
    var out = '<div class="bs-rings__list">';
    for (var i = 0; i < LAYERS.length; i++) {
      var l = LAYERS[i];
      out += '<button type="button" class="bs-rings__item" data-ring="' + i + '" aria-pressed="false">' +
        '<span class="bs-rings__num"><span>' + l.n + '</span></span>' +
        '<span><span class="bs-rings__title">' + l.title + '</span>' +
        '<span class="bs-rings__body">' + l.body + '</span></span></button>';
    }
    return out + "</div>";
  }

  // ── behaviour ────────────────────────────────────────────

  function build(root) {
    root.classList.add("bs-rings");
    root.innerHTML = '<div class="bs-rings__stage">' + svgMarkup() + "</div>" + listMarkup();

    var rings = root.querySelectorAll(".bsr-ring");
    var badges = root.querySelectorAll(".bsr-badge");
    var items = root.querySelectorAll(".bs-rings__item");
    var active = -1;

    function setActive(i) {
      if (i === active) return;
      active = i;
      for (var k = 0; k < WALLS.length; k++) {
        var on = k === i;
        var w = WALLS[k];
        var g = rings[k];
        g.setAttribute("aria-pressed", on ? "true" : "false");
        g.querySelector(".bsr-front").style.fill = on ? ACTIVE_FRONT : w.front;
        g.querySelector(".bsr-top").style.fill = on ? ACTIVE_TOP : w.top;
        g.querySelector(".bsr-teeth").style.stroke = on ? "rgba(255,239,0,0.8)" : w.teeth;

        var bg = badges[k];
        bg.querySelector("circle").style.fill = on ? GOLD : BG;
        bg.querySelector("text").style.fill = on ? BG : GOLD;

        items[k].setAttribute("aria-pressed", on ? "true" : "false");
      }
    }

    function wire(nodes, keyboard) {
      Array.prototype.forEach.call(nodes, function (node) {
        var idx = parseInt(node.getAttribute("data-ring"), 10);
        node.addEventListener("click", function () { setActive(idx); });
        if (keyboard) {
          node.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActive(idx); }
          });
        }
      });
    }

    wire(rings, true);
    wire(badges, false);
    wire(items, false);

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
    injectOnce("bs-rings-css", function () {
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

    var targets = document.querySelectorAll("[data-bs-rings]");
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
