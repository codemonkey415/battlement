/*!
 * Battlement Systems — Particle network overlay
 * Standalone Webflow embed. No dependencies.
 *
 * Port of src/app/ParticleCanvas.tsx
 *
 * Usage:  <div data-bs-particles></div>
 *         <script src=".../bs-particles.js" defer></script>
 *
 * The canvas is injected into the mount point's PARENT and absolutely fills it,
 * so drop the Embed anywhere inside the section you want it over. The parent is
 * given position:relative (if static) and isolation:isolate, and the canvas sits
 * at z-index:-1 — i.e. above the parent's background (and above bs-shader.js at
 * -2), below all its content. Nothing in Webflow needs restyling.
 *
 * Options (attributes on the mount div, all optional):
 *   data-bs-target="<selector>"   element to fill instead of the parent.
 *                                 Tried as closest(), then querySelector.
 *   data-bs-opacity="0.7"         canvas opacity
 *   data-bs-count="72"            particle count, or "auto" to scale with area
 *   data-bs-connect="140"         px distance at which two dots link
 *   data-bs-mouse="110"           px radius of the cursor repulsion field
 *                                 (0 disables the pointer interaction)
 *   data-bs-color="#FFEF00"       dot/line colour — hex or "r,g,b"
 *   data-bs-dpr="1"               1 keeps parity with the app; "auto" renders
 *                                 at devicePixelRatio (capped 2) for crisp dots
 *   data-bs-fps="30"              frame cap (default ~31, i.e. 32ms)
 *   data-bs-z="-1"                z-index of the layer
 *   data-bs-motion="auto"         auto | always. auto paints a single static
 *                                 frame for prefers-reduced-motion.
 */
(function () {
  "use strict";

  var TAG = "bs-particles";

  var GOLD = [255, 239, 0];
  var COUNT = 72;
  var CONNECT_DIST = 140;
  var MOUSE_RADIUS = 110;
  var DEF_OPACITY = 0.7;
  var DEF_Z = -1;
  var FRAME_MS = 32; /* ~30fps */

  /* "auto" count: tuned so a ~1440x800 hero lands on the app's 72 */
  var AUTO_AREA = 16000;
  var AUTO_MIN = 24;
  var AUTO_MAX = 240;

  // ── helpers ──────────────────────────────────────────────

  function warn(msg) {
    if (window.console && console.warn) console.warn("[" + TAG + "] " + msg);
  }

  function num(el, name, dflt, min, max) {
    var raw = el.getAttribute(name);
    if (raw === null || raw === "") return dflt;
    var v = parseFloat(raw);
    if (!isFinite(v)) return dflt;
    if (typeof min === "number" && v < min) v = min;
    if (typeof max === "number" && v > max) v = max;
    return v;
  }

  function parseColor(raw, dflt) {
    if (!raw) return dflt;
    raw = raw.replace(/^\s+|\s+$/g, "");
    var hex = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(raw);
    if (hex) {
      var h = hex[1];
      if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    }
    var parts = raw.split(/[\s,]+/);
    if (parts.length >= 3) {
      var r = parseFloat(parts[0]), g = parseFloat(parts[1]), b = parseFloat(parts[2]);
      if (isFinite(r) && isFinite(g) && isFinite(b)) return [r, g, b];
    }
    warn('unrecognised data-bs-color: "' + raw + '"');
    return dflt;
  }

  /* Webflow wraps custom code in a zero-height <div class="w-embed">, so the
     mount's immediate parent is almost never the box we want to paint. Climb to
     the nearest ancestor that actually has a layout box. */
  function resolveHost(el) {
    var sel = el.getAttribute("data-bs-target");
    if (sel) {
      var hit = null;
      try {
        hit = (el.closest && el.closest(sel)) || document.querySelector(sel);
      } catch (e) {
        warn('bad data-bs-target selector: "' + sel + '"');
      }
      if (hit) return hit;
      warn('data-bs-target "' + sel + '" matched nothing — falling back to the nearest sized ancestor');
    }
    var node = el.parentElement;
    var outermost = node;
    while (node && node !== document.body && node !== document.documentElement) {
      if (window.getComputedStyle(node).display !== "inline" &&
          node.offsetWidth > 0 && node.offsetHeight > 0) return node;
      outermost = node;
      node = node.parentElement;
    }
    if (outermost) {
      warn("no sized ancestor found — using <" + outermost.tagName.toLowerCase() +
        ">. Set data-bs-target if that is wrong.");
      return outermost;
    }
    return document.body;
  }

  // ── instance ─────────────────────────────────────────────

  function build(mount) {
    var host = resolveHost(mount);
    if (!host) return;

    var opacity = num(mount, "data-bs-opacity", DEF_OPACITY, 0, 1);
    var z = num(mount, "data-bs-z", DEF_Z);
    var connectDist = num(mount, "data-bs-connect", CONNECT_DIST, 0);
    var mouseRadius = num(mount, "data-bs-mouse", MOUSE_RADIUS, 0);
    var rgb = parseColor(mount.getAttribute("data-bs-color"), GOLD);
    var autoCount = (mount.getAttribute("data-bs-count") || "").toLowerCase() === "auto";
    var fixedCount = autoCount ? COUNT : num(mount, "data-bs-count", COUNT, 0, 2000);
    var autoDpr = (mount.getAttribute("data-bs-dpr") || "").toLowerCase() === "auto";
    var dpr = autoDpr ? Math.min(2, window.devicePixelRatio || 1) : num(mount, "data-bs-dpr", 1, 0.5, 3);
    var fpsAttr = mount.getAttribute("data-bs-fps");
    var frameMs = fpsAttr ? 1000 / Math.max(1, parseFloat(fpsAttr) || 30) : FRAME_MS;
    var motion = (mount.getAttribute("data-bs-motion") || "auto").toLowerCase();

    var RGB = rgb[0] + "," + rgb[1] + "," + rgb[2];

    var hostCS = window.getComputedStyle(host);
    if (hostCS.position === "static") host.style.position = "relative";
    /* keep a negative z-index contained: without a stacking context on the host
       the canvas can slip behind an ancestor's background and vanish */
    if (z < 0 && hostCS.isolation !== "isolate") host.style.isolation = "isolate";

    var canvas = document.createElement("canvas");
    canvas.className = "bs-particles-canvas";
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText =
      "position:absolute;top:0;left:0;width:100%;height:100%;display:block;" +
      "margin:0;padding:0;border:0;max-width:none;max-height:none;" +
      "pointer-events:none;opacity:" + opacity + ";z-index:" + z + ";";
    host.appendChild(canvas);
    mount.style.display = "none";

    var ctx = canvas.getContext("2d");
    if (!ctx) { host.removeChild(canvas); return; }

    var W = 0, H = 0;
    var particles = [];
    var mouse = { x: -9999, y: -9999 };
    var raf = 0, running = false;
    var last = (window.performance && performance.now) ? performance.now() : Date.now();

    var mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    function frozen() { return motion !== "always" && !!(mq && mq.matches); }

    function mkParticle() {
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        size: 0.8 + Math.random() * 1.4
      };
    }

    function resize() {
      /* CSS-pixel resolution by default: quarters the pixels pushed on 2x
         displays and keeps particle sizes/distances consistent across DPRs */
      W = Math.max(1, canvas.offsetWidth);
      H = Math.max(1, canvas.offsetHeight);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var n = autoCount
        ? Math.max(AUTO_MIN, Math.min(AUTO_MAX, Math.round(W * H / AUTO_AREA)))
        : fixedCount;
      particles.length = 0;
      for (var i = 0; i < n; i++) particles.push(mkParticle());
      if (frozen()) paint(0);
    }

    function step(k) {
      var mx = mouse.x, my = mouse.y;
      var damp = Math.pow(0.985, k);

      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];

        /* mouse repulsion */
        if (mouseRadius > 0) {
          var dx = p.x - mx, dy = p.y - my;
          var md = Math.sqrt(dx * dx + dy * dy);
          if (md < mouseRadius && md > 0.0001) {
            var force = (1 - md / mouseRadius) * 0.6 * k;
            p.vx += (dx / md) * force;
            p.vy += (dy / md) * force;
          }
        }

        /* damp & move */
        p.vx *= damp; p.vy *= damp;
        p.x += p.vx * k; p.y += p.vy * k;

        /* wrap */
        if (p.x < -20) p.x = W + 20;
        if (p.x > W + 20) p.x = -20;
        if (p.y < -20) p.y = H + 20;
        if (p.y > H + 20) p.y = -20;
      }
    }

    function paint(k) {
      ctx.clearRect(0, 0, W, H);

      var mx = mouse.x, my = mouse.y;
      var i, j, p, dx, dy;

      /* connections */
      ctx.lineWidth = 0.6;
      for (i = 0; i < particles.length; i++) {
        for (j = i + 1; j < particles.length; j++) {
          var a = particles[i], b = particles[j];
          dx = a.x - b.x;
          if (dx > connectDist || dx < -connectDist) continue;
          dy = a.y - b.y;
          if (dy > connectDist || dy < -connectDist) continue;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < connectDist) {
            var alpha = (1 - d / connectDist) * 0.22;
            ctx.beginPath();
            ctx.strokeStyle = "rgba(" + RGB + "," + alpha + ")";
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      /* dots */
      for (i = 0; i < particles.length; i++) {
        p = particles[i];
        dx = p.x - mx; dy = p.y - my;
        var nearMouse = mouseRadius > 0 && Math.sqrt(dx * dx + dy * dy) < mouseRadius;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (nearMouse ? 1.6 : 1), 0, Math.PI * 2);
        ctx.fillStyle = "rgba(" + RGB + "," + (nearMouse ? 0.9 : 0.45) + ")";
        ctx.fill();
      }
    }

    function loop(now) {
      raf = requestAnimationFrame(loop);
      if (now - last < frameMs) return;
      /* physics constants were tuned per 60Hz frame; k rescales them so
         wall-clock speed is unchanged at the throttled rate */
      var k = Math.min((now - last) / (1000 / 60), 3);
      last = now;
      step(k);
      paint(k);
    }

    function start() {
      if (running) return;
      if (frozen()) { paint(0); return; }
      running = true;
      last = (window.performance && performance.now) ? performance.now() : Date.now();
      raf = requestAnimationFrame(loop);
    }

    function stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    function onMove(e) {
      var rect = canvas.getBoundingClientRect();
      var src = e.touches && e.touches.length ? e.touches[0] : e;
      if (src.clientX === undefined) return;
      mouse.x = src.clientX - rect.left;
      mouse.y = src.clientY - rect.top;
    }
    function onLeave() { mouse.x = -9999; mouse.y = -9999; }

    if (mouseRadius > 0) {
      window.addEventListener("mousemove", onMove);
      window.addEventListener("touchmove", onMove, { passive: true });
      window.addEventListener("mouseleave", onLeave);
    }

    resize();
    if (window.ResizeObserver) {
      /* observe the host, not the canvas: it also fires if the host only gains
         its height later (webfonts, lazy images, CMS content) */
      new ResizeObserver(resize).observe(host);
    } else {
      window.addEventListener("resize", resize);
    }

    if (mq && mq.addEventListener) {
      mq.addEventListener("change", function () { stop(); start(); });
    }

    /* animate only while the hero is on screen */
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        if (entries[entries.length - 1].isIntersecting) start();
        else stop();
      }).observe(canvas);
    } else {
      start();
    }
  }

  // ── bootstrap ────────────────────────────────────────────

  function init() {
    var targets = document.querySelectorAll("[data-bs-particles]");
    Array.prototype.forEach.call(targets, function (el) {
      if (el.getAttribute("data-bs-mounted")) return;
      el.setAttribute("data-bs-mounted", "1");
      build(el);
    });
  }

  window.BSParticles = { refresh: init };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
