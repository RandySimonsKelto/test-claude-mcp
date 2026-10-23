/* ==========================================================================
   KELTO, moteur du questionnaire (partagé par les deux landing pages)

   Chaque page définit window.KELTO avant de charger ce fichier :
     source    identifiant envoyé au CRM (ex. "kelto-renouvellement")
     webhook   URL du webhook entrant (GHL ou n8n). Vide = mode aperçu.
     calendar  lien de prise de rendez-vous (optionnel)
     steps     [{id, q, help, type:"choice"|"chips"|"contact", options:[{v,label,sub,icon}]}]
     verdict   function(reponses) -> {tier, title, text, ladder?}
     angles    {cle:{h1, lead}} pour ?angle=cle dans l'URL des pubs

   Règle maison : toutes les chaînes françaises sont entre guillemets doubles
   ou en gabarit, jamais entre apostrophes (une apostrophe casse le script).
   ========================================================================== */
(function () {
  "use strict";
  document.documentElement.classList.add("js");

  var C = window.KELTO || {};
  var root = document.getElementById("quiz");
  var params = new URLSearchParams(location.search);

  /* ---------- Icônes (SVG inline, jamais d'emoji) ---------- */
  var P = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
  var ICONS = {
    calendar: '<svg viewBox="0 0 24 24" ' + P + '><rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/></svg>',
    clock: '<svg viewBox="0 0 24 24" ' + P + '><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    alert: '<svg viewBox="0 0 24 24" ' + P + '><path d="M12 3l9.5 17h-19z"/><path d="M12 10v4M12 17.5v.01"/></svg>',
    home: '<svg viewBox="0 0 24 24" ' + P + '><path d="M3 11l9-7 9 7"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-5h4v5"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" ' + P + '><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 5v6h-6"/></svg>',
    stack: '<svg viewBox="0 0 24 24" ' + P + '><rect x="3" y="5" width="18" height="4" rx="1.5"/><rect x="3" y="10.5" width="18" height="4" rx="1.5"/><rect x="3" y="16" width="18" height="4" rx="1.5"/></svg>',
    tool: '<svg viewBox="0 0 24 24" ' + P + '><path d="M14.5 6.5a4 4 0 0 0 5 5L12 19a2.1 2.1 0 0 1-3-3z"/><path d="M14.5 6.5L17 4l3 3-2.5 2.5"/></svg>',
    briefcase: '<svg viewBox="0 0 24 24" ' + P + '><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18"/></svg>',
    x: '<svg viewBox="0 0 24 24" ' + P + '><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/></svg>',
    card: '<svg viewBox="0 0 24 24" ' + P + '><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6.5 15h4"/></svg>',
    trend: '<svg viewBox="0 0 24 24" ' + P + '><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>',
    search: '<svg viewBox="0 0 24 24" ' + P + '><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    user: '<svg viewBox="0 0 24 24" ' + P + '><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    help: '<svg viewBox="0 0 24 24" ' + P + '><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17v.01"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    lock: '<svg viewBox="0 0 24 24" ' + P + '><rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></svg>',
    left: '<svg width="16" height="16" viewBox="0 0 24 24" ' + P + '><path d="M15 6l-6 6 6 6"/></svg>',
    right: '<svg width="18" height="18" viewBox="0 0 24 24" ' + P + '><path d="M9 6l6 6-6 6"/></svg>'
  };
  window.KELTO_ICONS = ICONS;

  /* ---------- Angle de pub : ?angle=cle remplace le titre et le chapeau ---------- */
  var angle = params.get("angle");
  if (angle && C.angles && C.angles[angle]) {
    var A = C.angles[angle];
    var h1 = document.querySelector("[data-h1]"), lead = document.querySelector("[data-lead]");
    if (h1 && A.h1) h1.innerHTML = A.h1;
    if (lead && A.lead) lead.textContent = A.lead;
  }

  /* ---------- Traçabilité : UTM et fbclid conservés pour le CRM ---------- */
  var track = {};
  ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "angle"].forEach(function (k) {
    if (params.get(k)) track[k] = params.get(k);
  });

  if (!root || !C.steps) return;

  var steps = C.steps, i = 0, answers = {}, labels = {}, booted = false;
  var total = steps.length;

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function frame(inner, showBack) {
    var pct = Math.round((i / total) * 100);
    return '<div class="quiz-head"><span class="quiz-tag">' + esc(C.tag || "Analyse gratuite") + '</span>' +
      '<span class="quiz-count">Étape ' + (i + 1) + " sur " + total + "</span></div>" +
      '<div class="quiz-bar" aria-hidden="true"><i style="width:' + Math.max(pct, 6) + '%"></i></div>' +
      '<div class="quiz-step">' + inner + "</div>" +
      '<div class="quiz-foot"><button type="button" class="back" data-back ' + (showBack ? "" : "hidden") + ">" + ICONS.left + "Retour</button>" +
      '<span class="secure">' + ICONS.lock + "Confidentiel, sans engagement</span></div>";
  }

  function render() {
    var s = steps[i], html = '<h3 class="quiz-q" id="qq">' + s.q + "</h3>";
    if (s.help) html += '<p class="quiz-help">' + s.help + "</p>";

    if (s.type === "choice") {
      html += '<div class="opts' + (s.cols === 2 ? " two" : "") + '" role="group" aria-labelledby="qq">';
      s.options.forEach(function (o, k) {
        var on = answers[s.id] === o.v ? " on" : "";
        html += '<button type="button" class="opt' + on + '" data-k="' + k + '">' +
          (o.icon && s.cols !== 2 ? '<span class="oi">' + ICONS[o.icon] + "</span>" : "") +
          "<span>" + o.label + (o.sub ? "<small>" + o.sub + "</small>" : "") + "</span>" +
          (s.cols !== 2 ? '<span class="arr">' + ICONS.right + "</span>" : "") + "</button>";
      });
      html += "</div>";
    }

    if (s.type === "multi") {
      var cur = answers[s.id] || [];
      html += '<div class="opts multi" role="group" aria-labelledby="qq">';
      s.options.forEach(function (o, k) {
        var on = cur.indexOf(o.v) > -1;
        html += '<button type="button" class="opt' + (on ? " on" : "") + '" data-m="' + k + '" aria-pressed="' + on + '">' +
          (o.icon ? '<span class="oi">' + ICONS[o.icon] + "</span>" : "") +
          "<span>" + o.label + (o.sub ? "<small>" + o.sub + "</small>" : "") + "</span>" +
          '<span class="box">' + ICONS.check + "</span></button>";
      });
      html += '</div><button type="button" class="btn btn-primary next" data-next ' + (cur.length ? "" : "disabled") + ">Continuer" + ICONS.right + "</button>";
    }

    if (s.type === "chips") {
      html += '<div class="chips" role="group" aria-labelledby="qq">';
      s.options.forEach(function (o, k) {
        var on = answers[s.id] === o.v ? " on" : "";
        html += '<button type="button" class="chip' + on + '" data-k="' + k + '">' + o.label + "<small>" + o.sub + "</small></button>";
      });
      html += '</div><div class="chip-scale" aria-hidden="true"></div>';
      if (s.skip) html += '<button type="button" class="chip-skip" data-skip>' + s.skip + "</button>";
    }

    if (s.type === "contact") {
      html += '<form class="fields" novalidate>' +
        '<div class="row2">' + field("prenom", "Prénom", "text", "given-name", "Votre prénom") +
        field("nom", "Nom", "text", "family-name", "Votre nom") + "</div>" +
        field("telephone", "Cellulaire", "tel", "tel", "Un numéro à 10 chiffres", "514 555-0123") +
        field("courriel", "Courriel", "email", "email", "Un courriel valide", "vous@exemple.com") +
        field("ville", "Ville de la propriété", "text", "address-level2", "Indiquez la ville", "Laval, Brossard, Montréal...") +
        '<label class="consent" id="consent-wrap"><input type="checkbox" id="consent"> <span>' +
        (C.consent || "J'accepte que Kelto me contacte par téléphone, texto ou courriel au sujet de ma demande. Je peux retirer mon consentement en tout temps.") +
        "</span></label>" +
        '<button class="btn btn-primary" type="submit">' + (s.cta || "Recevoir mon analyse") + ICONS.right + "</button></form>";
    }

    root.innerHTML = frame(html, i > 0);
    bind(s);

    // Au premier rendu on ne fait pas défiler la page (sinon le titre disparaît sur mobile).
    if (booted && window.innerWidth < 1000) root.scrollIntoView({ behavior: "smooth", block: "start" });
    booted = true;
  }

  function field(id, label, type, ac, msg, ph) {
    return '<div class="field" data-f="' + id + '"><label for="f-' + id + '">' + label + "</label>" +
      '<input id="f-' + id + '" name="' + id + '" type="' + type + '" autocomplete="' + ac + '"' +
      (ph ? ' placeholder="' + esc(ph) + '"' : "") + (type === "tel" ? ' inputmode="tel"' : "") + ">" +
      '<div class="msg">' + msg + "</div></div>";
  }

  function bind(s) {
    root.querySelectorAll("[data-k]").forEach(function (b) {
      b.addEventListener("click", function () {
        var o = s.options[+b.getAttribute("data-k")];
        answers[s.id] = o.v; labels[s.id] = stripTags(o.label);
        b.classList.add("on");
        // Une option peut arrêter le parcours (ex. locataire sur la page consolidation)
        setTimeout(o.stop ? function () { stopScreen(o.stop); } : next, 160);
      });
    });
    // Sélection multiple : on coche, puis « Continuer »
    root.querySelectorAll("[data-m]").forEach(function (b) {
      b.addEventListener("click", function () {
        var o = s.options[+b.getAttribute("data-m")], cur = (answers[s.id] || []).slice(), at = cur.indexOf(o.v);
        if (at > -1) cur.splice(at, 1); else cur.push(o.v);
        answers[s.id] = cur;
        labels[s.id] = s.options.filter(function (x) { return cur.indexOf(x.v) > -1; }).map(function (x) { return stripTags(x.label); }).join(", ");
        b.classList.toggle("on", at === -1); b.setAttribute("aria-pressed", at === -1);
        root.querySelector("[data-next]").disabled = !cur.length;
      });
    });
    var nx = root.querySelector("[data-next]");
    if (nx) nx.addEventListener("click", next);
    var sk = root.querySelector("[data-skip]");
    if (sk) sk.addEventListener("click", function () { answers[s.id] = "inconnu"; labels[s.id] = "Ne sait pas"; next(); });
    var bk = root.querySelector("[data-back]");
    if (bk) bk.addEventListener("click", prev);
    var f = root.querySelector("form");
    if (f) f.addEventListener("submit", submit);
  }

  function stripTags(h) { var d = document.createElement("div"); d.innerHTML = h; return d.textContent.trim(); }
  // Une étape peut se sauter selon les réponses (skipIf), dans les deux sens.
  function skip(k) { var st = steps[k]; return st && st.skipIf && st.skipIf(answers); }
  function next() { var k = i + 1; while (k < total - 1 && skip(k)) k++; if (k < total) { i = k; render(); } }
  function prev() { var k = i - 1; while (k > 0 && skip(k)) k--; if (k >= 0) { i = k; render(); } }

  function stopScreen(st) {
    root.innerHTML = frame('<div class="stop"><span class="ic">' + ICONS.alert + '</span><h3 class="quiz-q">' + st.title +
      '</h3><p class="quiz-help">' + st.text + "</p>" +
      (st.href ? '<a class="btn btn-primary" href="' + esc(st.href) + '">' + st.cta + ICONS.right + "</a>" : "") + "</div>", true);
    var bk = root.querySelector("[data-back]");
    if (bk) bk.addEventListener("click", render);
  }

  /* ---------- Validation ---------- */
  function digits(v) { return v.replace(/\D/g, ""); }
  function validPhone(v) {
    var d = digits(v); if (d.length === 11 && d[0] === "1") d = d.slice(1);
    return d.length === 10 && /[2-9]/.test(d[0]) && /[2-9]/.test(d[3]) ? d : null;
  }
  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.trim()); }

  function submit(e) {
    e.preventDefault();
    var f = e.target, ok = true, data = {};
    ["prenom", "nom", "telephone", "courriel", "ville"].forEach(function (k) {
      var inp = f.querySelector('[name="' + k + '"]'), v = inp.value.trim(), good = v.length > 1;
      if (k === "telephone") { var p = validPhone(v); good = !!p; if (p) v = p; }
      if (k === "courriel") good = validEmail(v);
      inp.closest(".field").classList.toggle("err", !good);
      if (!good && ok) inp.focus();
      ok = ok && good; data[k] = v;
    });
    var cons = f.querySelector("#consent");
    document.getElementById("consent-wrap").classList.toggle("err", !cons.checked);
    if (!cons.checked) ok = false;
    if (!ok) return;

    var btn = f.querySelector("button[type=submit]");
    btn.disabled = true; btn.textContent = "Envoi en cours...";

    var v = (C.verdict ? C.verdict(answers) : {}) || {};
    var payload = Object.assign({
      source: C.source, page_url: location.href.split("?")[0], soumis_le: new Date().toISOString(),
      piste: v.tier || "", consentement: true
    }, data, flat(answers), prefix(labels), track);

    send(payload).then(function () {
      if (window.keltoMeta) try { keltoMeta.track("Lead"); } catch (x) {}
      // Page de remerciement (VSL). Le prénom et le verdict passent par sessionStorage,
      // jamais dans l'URL (données personnelles).
      try {
        sessionStorage.setItem("kelto_merci", JSON.stringify({ prenom: data.prenom, source: C.source, verdict: v }));
        var local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
        var dest = (C.merci || (local ? "merci.html" : "/merci")) + "?p=" + encodeURIComponent((C.source || "").replace("kelto-", ""));
        setTimeout(function () { location.href = dest; }, 350);   // laisse partir le pixel
      } catch (x) {
        showVerdict(v, data.prenom);   // repli : navigation privée stricte
      }
    });
  }

  function flat(o) { var r = {}; for (var k in o) r[k] = Array.isArray(o[k]) ? o[k].join(",") : o[k]; return r; }

  // Les libellés lisibles partent aussi, pour que la note dans le CRM se lise sans table de codes.
  function prefix(o) { var r = {}; for (var k in o) r[k + "_libelle"] = o[k]; return r; }

  function send(payload) {
    if (!C.webhook) {
      console.warn("[Kelto] Aucun webhook configuré, mode aperçu. Données :", payload);
      return Promise.resolve();
    }
    return fetch(C.webhook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      .catch(function () {
        // Repli : certains webhooks refusent le CORS, on renvoie en mode opaque.
        return fetch(C.webhook, { method: "POST", mode: "no-cors", body: JSON.stringify(payload) }).catch(function () {});
      });
  }

  function showVerdict(v, prenom) {
    var ladder = "";
    if (v.ladder) {
      ladder = '<div class="mini-ladder">' + v.ladder.map(function (r) {
        return '<div class="' + (r.on ? "on" : "") + '">' + r.label + "</div>";
      }).join("") + "</div>";
    }
    root.innerHTML = '<div class="quiz-bar" aria-hidden="true"><i style="width:100%"></i></div>' +
      '<div class="quiz-step verdict" role="status">' +
      '<span class="badge">' + ICONS.check + "Demande reçue, merci " + esc(prenom) + "</span>" +
      "<h3>" + (v.title || "Votre dossier est entre bonnes mains") + "</h3>" +
      "<p>" + (v.text || "") + "</p>" + ladder +
      '<div class="next">' +
      "<div><b>1</b><span>Notre équipe vous texte dans les prochaines minutes pour fixer votre appel.</span></div>" +
      "<div><b>2</b><span>Un courtier Kelto vous appelle à l'heure choisie, environ 20 minutes.</span></div>" +
      "<div><b>3</b><span>Vous recevez les options par écrit. Vous décidez, ou pas.</span></div>" +
      "</div>" +
      (C.calendar ? '<a class="btn btn-primary" style="width:100%;margin-top:18px" href="' + esc(C.calendar) + '">Choisir mon heure d’appel maintenant</a>' : "") +
      "</div>";
    root.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  render();

  /* ---------- Boutons « commencer » ailleurs dans la page ---------- */
  document.querySelectorAll("[data-go-quiz]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      root.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(function () { var b = root.querySelector("button.opt,button.chip,input"); if (b) b.focus({ preventScroll: true }); }, 600);
    });
  });

  /* ---------- Barre collante mobile : visible quand le questionnaire est hors écran ---------- */
  var bar = document.querySelector(".sticky-cta");
  if (bar && "IntersectionObserver" in window) {
    var heroSeen = true, quizSeen = true;
    var hero = document.querySelector(".hero");
    var upd = function () { bar.classList.toggle("show", !heroSeen && !quizSeen); };
    new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.target === hero) heroSeen = x.isIntersecting; else quizSeen = x.isIntersecting; }); upd(); })
      .observe(hero);
    new IntersectionObserver(function (en) { quizSeen = en[0].isIntersecting; upd(); }).observe(root);
  }

  /* ---------- Apparitions au défilement ---------- */
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add("in"); io.unobserve(x.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    document.querySelectorAll(".rv").forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll(".rv").forEach(function (el) { el.classList.add("in"); });
  }
})();
