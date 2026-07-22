/*!
 * Battlement Systems — Atmospheric WebGL shader backdrop
 * Standalone Webflow embed. No dependencies.
 *
 * Port of src/app/ShaderCanvas.tsx
 *
 * Usage:  <div data-bs-shader></div>
 *         <script src=".../bs-shader.js" defer></script>
 *
 * The canvas is injected into the mount point's PARENT and absolutely fills it,
 * so drop the Embed anywhere inside the section you want painted. The parent is
 * given position:relative (if static) and isolation:isolate, and the canvas sits
 * at z-index:-2 — i.e. above the parent's own background, below all its content.
 * Nothing in Webflow needs restyling.
 *
 * Options (attributes on the mount div, all optional):
 *   data-bs-target="<selector>"   element to fill instead of the parent.
 *                                 Tried as closest(), then querySelector.
 *   data-bs-opacity="0.92"        canvas opacity
 *   data-bs-scale="1"             render-resolution multiplier (0.25–2).
 *                                 <1 trades crispness for fill rate; the noise
 *                                 field is soft enough that 0.75 is invisible.
 *   data-bs-fps="30"              frame cap (default ~31, i.e. 32ms)
 *   data-bs-z="-2"                z-index of the layer
 *   data-bs-motion="auto"         auto | always. auto freezes on a single
 *                                 static frame for prefers-reduced-motion.
 */
(function () {
  "use strict";

  var TAG = "bs-shader";

  var DEF_OPACITY = 0.92;
  var DEF_Z = -2;
  var FRAME_MS = 32; /* ~30fps — u_time advances slowly enough that 60fps is indistinguishable */
  var STILL_T = 24.0; /* frozen frame is sampled here, not at t=0 */

  var VS = [
    "attribute vec2 a_pos;",
    "void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }"
  ].join("\n");

  var FS_BODY = [
    "uniform float u_time;",
    "uniform vec2  u_res;",
    "",
    "float hash(float n) { return fract(sin(n) * 43758.5453123); }",
    "",
    "float noise(vec3 x) {",
    "  vec3 p = floor(x), f = fract(x);",
    "  f = f * f * (3.0 - 2.0 * f);",
    "  float n = p.x + p.y * 57.0 + 113.0 * p.z;",
    "  return mix(",
    "    mix(mix(hash(n),      hash(n+1.0),   f.x),",
    "        mix(hash(n+57.0), hash(n+58.0),  f.x), f.y),",
    "    mix(mix(hash(n+113.0),hash(n+114.0), f.x),",
    "        mix(hash(n+170.0),hash(n+171.0), f.x), f.y), f.z);",
    "}",
    "",
    "float fbm(vec3 p) {",
    "  float v = 0.0, a = 0.52;",
    "  for (int i = 0; i < 6; i++) { v += a * noise(p); p *= 2.03; a *= 0.48; }",
    "  return v;",
    "}",
    "",
    "void main() {",
    "  vec2 uv = (gl_FragCoord.xy / u_res) * 2.0 - 1.0;",
    "  uv.x *= u_res.x / u_res.y;",
    "",
    "  float t  = u_time * 0.055;",
    "  vec3  p  = vec3(uv * 2.2, t);",
    "",
    "  float q1 = fbm(p);",
    "  float q2 = fbm(p + vec3(3.17, 1.83, 0.0));",
    "  vec3  r  = vec3(uv * 2.2 + 2.8 * vec2(q1, q2), t + 0.42);",
    "  float f  = fbm(r + vec3(0.0, 0.0, t * 0.4));",
    "",
    "  /* colour palette: dark indigo -> mid indigo -> canary yellow */",
    "  vec3 c0 = vec3(0.102, 0.086, 0.180);   /* dark indigo  #1A162E */",
    "  vec3 c1 = vec3(0.141, 0.125, 0.251);   /* mid indigo   #242040 */",
    "  vec3 c2 = vec3(1.000, 0.937, 0.000);   /* canary yellow #FFEF00 */",
    "  vec3 c3 = vec3(1.000, 1.000, 0.600);   /* pale yellow  */",
    "",
    "  vec3 col = c0;",
    "  col = mix(col, c1, smoothstep(0.18, 0.50, f));",
    "  col = mix(col, c2, smoothstep(0.48, 0.72, f) * 0.45);",
    "  col = mix(col, c3, smoothstep(0.70, 0.90, f) * 0.25);",
    "",
    "  /* centre ambient glow */",
    "  float cg = 1.0 - smoothstep(0.0, 1.1, length(uv * 0.8));",
    "  col += c2 * cg * 0.035;",
    "",
    "  /* vignette */",
    "  float vig = 1.0 - smoothstep(0.45, 1.55, length(uv * 0.62));",
    "  col *= vig;",
    "",
    "  gl_FragColor = vec4(col * 0.88, 1.0);",
    "}"
  ].join("\n");

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
    var scale = num(mount, "data-bs-scale", 1, 0.25, 2);
    var z = num(mount, "data-bs-z", DEF_Z);
    var fpsAttr = mount.getAttribute("data-bs-fps");
    var frameMs = fpsAttr ? 1000 / Math.max(1, parseFloat(fpsAttr) || 30) : FRAME_MS;
    var motion = (mount.getAttribute("data-bs-motion") || "auto").toLowerCase();

    var hostCS = window.getComputedStyle(host);
    if (hostCS.position === "static") host.style.position = "relative";
    /* keep a negative z-index contained: without a stacking context on the host
       the canvas can slip behind an ancestor's background and vanish */
    if (z < 0 && hostCS.isolation !== "isolate") host.style.isolation = "isolate";

    var canvas = document.createElement("canvas");
    canvas.className = "bs-shader-canvas";
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText =
      "position:absolute;top:0;left:0;width:100%;height:100%;display:block;" +
      "margin:0;padding:0;border:0;max-width:none;max-height:none;" +
      "pointer-events:none;opacity:" + opacity + ";z-index:" + z + ";";
    host.appendChild(canvas);
    mount.style.display = "none";

    var gl = null, prog = null, uTime = null, uRes = null;
    var raf = 0, last = 0, running = false, ok = false;
    var t0 = (window.performance && performance.now) ? performance.now() : Date.now();

    var mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    function frozen() { return motion !== "always" && !!(mq && mq.matches); }

    function compile(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        warn("shader compile failed: " + gl.getShaderInfoLog(s));
        gl.deleteShader(s);
        return null;
      }
      return s;
    }

    function initGL() {
      var opts = {
        alpha: true, depth: false, stencil: false, antialias: false,
        preserveDrawingBuffer: false, powerPreference: "low-power"
      };
      gl = canvas.getContext("webgl", opts) || canvas.getContext("experimental-webgl", opts);
      if (!gl) { warn("WebGL unavailable"); return false; }

      /* highp in fragment shaders is optional in WebGL 1; the hash is
         precision-sensitive, but a banded field beats a blank hero */
      var hp = gl.getShaderPrecisionFormat &&
        gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
      var precision = (!hp || hp.precision > 0) ? "highp" : "mediump";

      var vs = compile(gl.VERTEX_SHADER, VS);
      var fs = compile(gl.FRAGMENT_SHADER, "precision " + precision + " float;\n" + FS_BODY);
      if (!vs || !fs) return false;

      prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        warn("program link failed: " + gl.getProgramInfoLog(prog));
        return false;
      }
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.useProgram(prog);

      var buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      var aPos = gl.getAttribLocation(prog, "a_pos");
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      uTime = gl.getUniformLocation(prog, "u_time");
      uRes = gl.getUniformLocation(prog, "u_res");

      gl.viewport(0, 0, canvas.width || 1, canvas.height || 1);
      return true;
    }

    function resize() {
      /* CSS-pixel resolution: the noise field is soft enough that hi-DPI
         oversampling is invisible and only multiplies fragment cost */
      var w = Math.max(1, Math.round(canvas.offsetWidth * scale));
      var h = Math.max(1, Math.round(canvas.offsetHeight * scale));
      if (w === canvas.width && h === canvas.height) return;
      canvas.width = w;
      canvas.height = h;
      if (ok) {
        gl.viewport(0, 0, w, h);
        if (frozen()) paint(STILL_T);
      }
    }

    function paint(seconds) {
      gl.uniform1f(uTime, seconds);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    function loop(now) {
      raf = requestAnimationFrame(loop);
      if (now - last < frameMs) return;
      last = now;
      paint((now - t0) / 1000);
    }

    function start() {
      if (running || !ok) return;
      if (frozen()) { paint(STILL_T); return; }
      running = true;
      last = 0;
      raf = requestAnimationFrame(loop);
    }

    function stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    ok = initGL();
    if (!ok) { canvas.parentNode && canvas.parentNode.removeChild(canvas); return; }

    resize();
    if (window.ResizeObserver) {
      /* observe the host, not the canvas: it also fires if the host only gains
         its height later (webfonts, lazy images, CMS content) */
      new ResizeObserver(resize).observe(host);
    } else {
      window.addEventListener("resize", resize);
    }

    canvas.addEventListener("webglcontextlost", function (e) {
      e.preventDefault();
      stop();
      ok = false;
    }, false);
    canvas.addEventListener("webglcontextrestored", function () {
      ok = initGL();
      if (ok) start();
    }, false);

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
    var targets = document.querySelectorAll("[data-bs-shader]");
    Array.prototype.forEach.call(targets, function (el) {
      if (el.getAttribute("data-bs-mounted")) return;
      el.setAttribute("data-bs-mounted", "1");
      build(el);
    });
  }

  window.BSShader = { refresh: init };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
