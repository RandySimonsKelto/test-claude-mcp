/*!
 * Kelto – chargeur du pixel Meta avec consentement préalable (Loi 25, Québec)
 * --------------------------------------------------------------------------
 * - BANNIÈRE DÉSACTIVÉE (23 oct. 2026, à la demande de Randy, le temps de valider des informations) :
 *   le pixel démarre dès l'ouverture de la page. Pour la réactiver : BANNER_ON = true ci-dessous.
 * - Un visiteur qui avait déjà cliqué « Refuser » reste respecté : rien n'est chargé pour lui.
 * - « Refuser » est aussi visible qu'« Accepter » ; le choix est mémorisé 180 jours et modifiable en tout temps.
 * - Le pixel utilisé est TOUJOURS celui de Kelto (jeu de données appartenant au portefeuille Meta de Kelto).
 * - Aucun montant, revenu ni donnée de dossier n'est envoyé : seulement le nom de l'événement et son identifiant.
 *
 * Installation (avant la fermeture de </body>, sur chaque page qui reçoit du trafic publicitaire) :
 *
 *   <script>
 *     window.KELTO_META = {
 *       pixelId: "973439061907168",              // Kelto  (Prêt Boréal : utiliser l'ID de son propre jeu de données)
 *       privacyUrl: "/confidentialite.html",     // page de politique de confidentialité de CE site
 *       siteName: "Kelto"                        // nom affiché dans la bannière
 *     };
 *   </script>
 *   <script src="/kelto-meta-pixel.js" defer></script>
 *
 * Événements (à appeler au moment exact où ils se produisent) :
 *
 *   var id = keltoMeta.track("Lead");       // formulaire complété
 *   var id = keltoMeta.track("Schedule");   // rendez-vous réservé (confirmation)
 *   // `id` est l'identifiant de déduplication : le transmettre au CRM / webhook sous le nom meta_event_id
 *   // avec keltoMeta.ids() (fbp, fbc, consent, page_url, user_agent) pour que le relais serveur
 *   // envoie le MÊME événement avec le MÊME identifiant (Meta ne le compte alors qu'une fois).
 */
(function (w, d) {
  'use strict';

  var CFG = w.KELTO_META || {};
  var PIXEL_ID = String(CFG.pixelId || '');
  if (!/^\d{10,20}$/.test(PIXEL_ID)) {
    if (w.console) console.warn('[kelto-meta] pixelId manquant ou invalide : rien n\'est chargé.');
    return;
  }
  var PRIVACY_URL = CFG.privacyUrl || '/confidentialite.html';
  var SITE = CFG.siteName || 'ce site';
  // Banniere de consentement. false = pas de banniere, le pixel demarre tout de suite.
  // Remettre a true (ici ou via window.KELTO_META.consentBanner) pour la reafficher partout.
  var BANNER_ON = (CFG.consentBanner === undefined) ? false : !!CFG.consentBanner;
  var STORE_KEY = 'kelto_meta_consent_v1';
  var TTL_MS = 180 * 24 * 60 * 60 * 1000;
  var memory = null; // repli si localStorage est indisponible

  /* ---------------- stockage du choix ---------------- */
  function readChoice() {
    var raw = null;
    try { raw = w.localStorage.getItem(STORE_KEY); } catch (e) { raw = memory; }
    if (!raw) return null;
    try {
      var o = JSON.parse(raw);
      if (o && (o.v === 'granted' || o.v === 'denied') && Date.now() - o.t < TTL_MS) return o.v;
    } catch (e) { /* ignoré */ }
    return null;
  }
  function writeChoice(v) {
    var raw = JSON.stringify({ v: v, t: Date.now() });
    memory = raw;
    try { w.localStorage.setItem(STORE_KEY, raw); } catch (e) { /* navigation privée : on garde en mémoire */ }
  }

  /* ---------------- pixel Meta (chargé seulement après consentement) ---------------- */
  var pixelStarted = false;
  function startPixel() {
    if (pixelStarted) return;
    pixelStarted = true;
    (function (f, b, e, v) {
      if (!f.fbq) {
        var n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
        if (!f._fbq) f._fbq = n;
        n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
        var t = b.createElement(e); t.async = true; t.src = v;
        (b.head || b.documentElement).appendChild(t);
      }
    })(w, d, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    w.fbq('consent', 'grant');
    // Désactive la détection automatique de boutons/formulaires (donnée financière sensible).
    w.fbq('set', 'autoConfig', false, PIXEL_ID);
    w.fbq('init', PIXEL_ID);
    // trackSingle : n'envoie qu'à CE pixel, même si un autre pixel (ex. celui d'une agence) est présent sur la page.
    w.fbq('trackSingle', PIXEL_ID, 'PageView');
  }

  function expireMetaCookies() {
    var parts = (w.location.hostname || '').split('.');
    ['_fbp', '_fbc'].forEach(function (name) {
      for (var i = 0; i < parts.length - 1; i++) {
        var dom = '.' + parts.slice(i).join('.');
        d.cookie = name + '=; Max-Age=0; path=/; domain=' + dom;
      }
      d.cookie = name + '=; Max-Age=0; path=/';
    });
  }

  /* ---------------- bannière ---------------- */
  var banner = null;
  function closeBanner() { if (banner && banner.parentNode) banner.parentNode.removeChild(banner); banner = null; }

  function decide(v) {
    writeChoice(v);
    closeBanner();
    if (v === 'granted') {
      startPixel();
    } else {
      if (w.fbq) { try { w.fbq('consent', 'revoke'); } catch (e) { /* ignoré */ } }
      expireMetaCookies();
    }
  }

  function injectStyle() {
    if (d.getElementById('kmeta-style')) return;
    var s = d.createElement('style');
    s.id = 'kmeta-style';
    s.textContent =
      '.kmeta{position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483000;max-width:640px;margin:0 auto;background:#fff;color:#16202c;' +
      'border:1px solid #c9d2dc;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.22);padding:16px 18px;font:15px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}' +
      '.kmeta h2{margin:0 0 6px;font-size:16px}.kmeta p{margin:0 0 12px}.kmeta a{color:#134e86;text-decoration:underline}' +
      '.kmeta-row{display:flex;gap:10px;flex-wrap:wrap}' +
      '.kmeta button{flex:1 1 140px;min-height:44px;padding:10px 16px;border-radius:8px;border:2px solid #134e86;font:inherit;font-weight:600;cursor:pointer}' +
      '.kmeta .kmeta-yes{background:#134e86;color:#fff}.kmeta .kmeta-no{background:#fff;color:#134e86}' +
      '.kmeta button:focus-visible{outline:3px solid #f2b705;outline-offset:2px}';
    (d.head || d.documentElement).appendChild(s);
  }

  function showBanner() {
    if (banner) return;
    injectStyle();
    banner = d.createElement('div');
    banner.className = 'kmeta';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-modal', 'false');
    banner.setAttribute('aria-labelledby', 'kmeta-title');

    var h = d.createElement('h2'); h.id = 'kmeta-title'; h.textContent = 'Témoins et publicité';
    var p = d.createElement('p');
    p.appendChild(d.createTextNode(
      SITE + ' aimerait utiliser le pixel Meta (Facebook et Instagram) pour mesurer l’efficacité de ses publicités. ' +
      'Il n’est activé que si vous acceptez, et seulement à cette fin. Votre choix n’a aucun effet sur votre demande, ' +
      'et vous pouvez le modifier en tout temps. '));
    var a = d.createElement('a'); a.href = PRIVACY_URL; a.textContent = 'Politique de confidentialité';
    p.appendChild(a);

    var row = d.createElement('div'); row.className = 'kmeta-row';
    var no = d.createElement('button'); no.type = 'button'; no.className = 'kmeta-no'; no.textContent = 'Refuser';
    var yes = d.createElement('button'); yes.type = 'button'; yes.className = 'kmeta-yes'; yes.textContent = 'Accepter';
    no.addEventListener('click', function () { decide('denied'); });
    yes.addEventListener('click', function () { decide('granted'); });
    row.appendChild(no); row.appendChild(yes);

    banner.appendChild(h); banner.appendChild(p); banner.appendChild(row);
    (d.body || d.documentElement).appendChild(banner);
  }

  /* ---------------- API publique ---------------- */
  function cookie(name) {
    var m = d.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  }
  function randomHex(n) {
    var out = '';
    try {
      var a = new Uint8Array(n); w.crypto.getRandomValues(a);
      for (var i = 0; i < a.length; i++) out += ('0' + a[i].toString(16)).slice(-2);
    } catch (e) { out = String(Math.random()).slice(2, 2 + n * 2); }
    return out;
  }
  // Sans banniere, le pixel est actif par defaut, SAUF pour un visiteur qui a deja refuse.
  function granted() {
    var c = readChoice();
    if (c === 'granted') return true;
    if (c === 'denied') return false;
    return !BANNER_ON;
  }

  w.keltoMeta = {
    granted: granted,
    consent: function () { return readChoice() || 'unknown'; },
    newEventId: function (prefix) { return (prefix || 'ev') + '-' + Date.now().toString(36) + '-' + randomHex(4); },
    /** Envoie l'événement au pixel (si consentement accordé) et RETOURNE l'identifiant de déduplication. */
    track: function (name, params, eventId) {
      var id = eventId || w.keltoMeta.newEventId(String(name).toLowerCase());
      if (granted() && w.fbq) {
        w.fbq('trackSingle', PIXEL_ID, name, params || {}, { eventID: id });
      }
      return id;
    },
    /** Champs à transmettre au CRM / webhook avec l'événement, pour le relais serveur. */
    ids: function () {
      var fbc = granted() ? cookie('_fbc') : '';
      if (!fbc && granted()) {
        var m = (w.location.search || '').match(/[?&]fbclid=([^&]+)/);
        if (m) fbc = 'fb.1.' + Date.now() + '.' + decodeURIComponent(m[1]);
      }
      return {
        consent: readChoice() || 'unknown',
        fbp: granted() ? cookie('_fbp') : '',
        fbc: fbc,
        page_url: w.location.href.split('#')[0],
        user_agent: w.navigator.userAgent
      };
    },
    openConsent: showBanner
  };

  /* ---------------- démarrage ---------------- */
  function init() {
    var c = readChoice();
    if (c === 'granted') startPixel();
    else if (c === 'denied') { /* choix respecte : rien n'est charge */ }
    else if (BANNER_ON) showBanner();
    else startPixel();
    // lien « Gérer mes témoins » : <a href="#" data-kelto-consent-open>
    d.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target.closest('[data-kelto-consent-open]') : null;
      if (t) { e.preventDefault(); showBanner(); }
    });
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', init); else init();
})(window, document);
