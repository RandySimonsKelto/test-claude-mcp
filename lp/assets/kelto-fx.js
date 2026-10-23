/* ==========================================================================
   KELTO, effets d'interaction (partagé par les 3 pages)
   1. Halo qui suit la souris sur les cartes (variables CSS --mx / --my)
   2. Lettre annotée : la note survolée allume son épingle
   3. Compteurs de la bande de chiffres qui défilent à l'apparition
   Respecte prefers-reduced-motion. Aucune chaîne française entre apostrophes.
   ========================================================================== */
(function () {
  "use strict";
  var mm = function (q) { return window.matchMedia && window.matchMedia(q).matches; };
  var reduce = mm("(prefers-reduced-motion: reduce)");

  // 1. Halo
  if (!reduce && mm("(hover: hover)")) {
    document.querySelectorAll(".card,.tile,.rung,.review").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty("--mx", (e.clientX - r.left) + "px");
        el.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    });
  }

  // 2. Lettre annotée : note k allume l'épingle k
  var notes = document.querySelectorAll(".note");
  if (notes.length) {
    var pins = {};
    document.querySelectorAll(".letter .pin").forEach(function (p) { pins[p.textContent.trim()] = p; });
    notes.forEach(function (n, k) {
      var pin = pins[String(k + 1)];
      if (!pin) return;
      var row = pin.closest(".l-row");
      var set = function (v) {
        n.classList.toggle("hot", v); pin.classList.toggle("hot", v);
        if (row) row.classList.toggle("hot", v);
      };
      n.addEventListener("mouseenter", function () { set(true); });
      n.addEventListener("mouseleave", function () { set(false); });
    });
  }

  // 3. Compteurs (3 500+, 30+, 5,0, < 24 h)
  var nums = document.querySelectorAll(".proof-item b");
  if (!reduce && nums.length && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (x) {
        if (!x.isIntersecting) return;
        io.unobserve(x.target);
        var el = x.target, txt = el.textContent, m = txt.match(/^(\D*?)(\d[\d\s]*(?:,\d+)?)(.*)$/);
        if (!m) return;
        var raw = m[2].replace(/\s/g, ""), dec = raw.indexOf(",") > -1 ? raw.split(",")[1].length : 0;
        var target = parseFloat(raw.replace(",", ".")), t0 = null, dur = 1100;
        var fmt = function (v) {
          if (dec) return v.toFixed(dec).replace(".", ",");
          return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
        };
        var step = function (t) {
          if (!t0) t0 = t;
          var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
          el.textContent = m[1] + fmt(target * e) + (/\s$/.test(m[2]) ? " " : "") + m[3];
          if (p < 1) requestAnimationFrame(step); else el.textContent = txt;
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.6 });
    nums.forEach(function (n) { io.observe(n); });
  }
})();
