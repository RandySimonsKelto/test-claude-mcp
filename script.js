/* ==========================================================================
   Kelto — interactions: nav, reveal, calculators, scenario tabs, FAQ, forms
   ========================================================================== */
(() => {
  "use strict";

  /* ---------- Helpers ---------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const fmtMoney = (n) => Math.round(n).toLocaleString("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });

  /* ---------- Sticky header shadow ---------- */
  const header = $("#siteHeader");
  const onScroll = () => {
    header.classList.toggle("scrolled", window.scrollY > 8);
    $("#backToTop").classList.toggle("visible", window.scrollY > 600);
  };
  document.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Logo marquee: duplicate track content for a seamless loop ---------- */
  const logoTrack = $(".logo-track");
  if (logoTrack) {
    logoTrack.setAttribute("aria-hidden", "true");
    logoTrack.innerHTML += logoTrack.innerHTML;
  }

  /* ---------- Load image assets stored as small base64 text files ----------
     Images are kept as separate small text files under assets/img/ (instead
     of being embedded inline) so they stay reliable to store/update. This
     fetches each one and injects it as a data: URI once loaded. ---------- */
  const ASSETS_BASE = "https://kelto-assets.vercel.app/";
  $$("[data-img-src]").forEach((img) => {
    const path = img.getAttribute("data-img-src");
    fetch(ASSETS_BASE + path)
      .then((r) => r.text())
      .then((text) => {
        img.src = "data:image/png;base64," + text.replace(/\s+/g, "");
      })
      .catch(() => {});
  });

  /* ---------- Mobile nav ---------- */
  const navToggle = $("#navToggle");
  const mainNav = $("#mainNav");
  navToggle.addEventListener("click", () => {
    const open = mainNav.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
  });
  $$(".main-nav a").forEach((a) => a.addEventListener("click", () => {
    mainNav.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  }));

  /* ---------- Back to top ---------- */
  $("#backToTop").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  /* ---------- Scroll reveal ---------- */
  const revealItems = $$(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    revealItems.forEach((el) => io.observe(el));
  } else {
    revealItems.forEach((el) => el.classList.add("in-view"));
  }

  /* ---------- Animated counters ---------- */
  const counters = $$(".stat-number");
  const animateCounter = (el) => {
    const target = parseInt(el.dataset.count, 10);
    const duration = 1400;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * eased).toLocaleString("fr-CA");
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if ("IntersectionObserver" in window && counters.length) {
    const ioCounters = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          ioCounters.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    counters.forEach((el) => ioCounters.observe(el));
  }

  /* ---------- Calculator tabs ---------- */
  const calcTabs = $$(".calc-tab");
  const calcPanels = $$(".calc-panel");
  calcTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      calcTabs.forEach((t) => { t.classList.remove("active"); t.setAttribute("aria-selected", "false"); });
      calcPanels.forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");
      $(`#calc-${tab.dataset.calc}`).classList.add("active");
    });
  });

  /* ---------- Mortgage math ----------
     Canadian mortgages: nominal rate compounded semi-annually by law,
     converted to an effective rate per payment period.
  */
  function paymentAmount(principal, annualRatePct, amortYears, paymentsPerYear) {
    if (principal <= 0 || amortYears <= 0) return 0;
    const nominal = annualRatePct / 100;
    const semiAnnualRate = nominal / 2;
    // effective rate per payment period, derived from semi-annual compounding
    const ratePerPeriod = Math.pow(1 + semiAnnualRate, 2 / paymentsPerYear) - 1;
    const totalPayments = amortYears * paymentsPerYear;
    if (ratePerPeriod === 0) return principal / totalPayments;
    const factor = Math.pow(1 + ratePerPeriod, totalPayments);
    return principal * (ratePerPeriod * factor) / (factor - 1);
  }

  function maxPrincipalFromPayment(payment, annualRatePct, amortYears, paymentsPerYear) {
    const nominal = annualRatePct / 100;
    const semiAnnualRate = nominal / 2;
    const ratePerPeriod = Math.pow(1 + semiAnnualRate, 2 / paymentsPerYear) - 1;
    const totalPayments = amortYears * paymentsPerYear;
    if (ratePerPeriod === 0) return payment * totalPayments;
    const factor = Math.pow(1 + ratePerPeriod, totalPayments);
    return payment * (factor - 1) / (ratePerPeriod * factor);
  }

  /* ---------- Calc 1: Paiement hypothécaire ---------- */
  const pMontant = $("#pMontant"), pTaux = $("#pTaux"), pAmort = $("#pAmort"), pAmortVal = $("#pAmortVal"), pFreq = $("#pFreq");
  const pPaiement = $("#pPaiement"), pCapital = $("#pCapital"), pInterets = $("#pInterets"), pTotal = $("#pTotal"), pDonut = $("#pDonut");

  function updatePaymentCalc() {
    const principal = parseFloat(pMontant.value) || 0;
    const rate = parseFloat(pTaux.value) || 0;
    const years = parseInt(pAmort.value, 10);
    const freq = parseInt(pFreq.value, 10);
    pAmortVal.textContent = `${years} ans`;

    const payment = paymentAmount(principal, rate, years, freq);
    const totalPaid = payment * years * freq;
    const totalInterest = Math.max(totalPaid - principal, 0);

    pPaiement.textContent = fmtMoney(payment);
    pCapital.textContent = fmtMoney(principal);
    pInterets.textContent = fmtMoney(totalInterest);
    pTotal.textContent = fmtMoney(totalPaid);

    const pctCapital = totalPaid > 0 ? (principal / totalPaid) * 100 : 50;
    pDonut.style.setProperty("--p", pctCapital.toFixed(1));
  }
  [pMontant, pTaux, pAmort, pFreq].forEach((el) => el.addEventListener("input", updatePaymentCalc));
  updatePaymentCalc();

  /* ---------- Calc 2: Capacité d'emprunt ---------- */
  const cRevenu = $("#cRevenu"), cDettes = $("#cDettes"), cMiseFonds = $("#cMiseFonds"), cTaux = $("#cTaux");
  const cPrixMax = $("#cPrixMax"), cHypoMax = $("#cHypoMax"), cTauxQual = $("#cTauxQual");

  function updateCapacityCalc() {
    const revenuAnnuel = parseFloat(cRevenu.value) || 0;
    const dettesMensuelles = parseFloat(cDettes.value) || 0;
    const miseFonds = parseFloat(cMiseFonds.value) || 0;
    const tauxContractuel = parseFloat(cTaux.value) || 0;

    const tauxQualification = Math.max(tauxContractuel + 2, 5.25);
    cTauxQual.textContent = `${tauxQualification.toFixed(2)} %`;

    const revenuMensuel = revenuAnnuel / 12;
    const estimationTaxesChauffage = 250; // estimation forfaitaire simplifiée
    const capaciteTDS = revenuMensuel * 0.44 - dettesMensuelles - estimationTaxesChauffage;
    const capaciteGDS = revenuMensuel * 0.39 - estimationTaxesChauffage;
    const paiementMaxMensuel = Math.max(Math.min(capaciteTDS, capaciteGDS), 0);

    const hypoMax = maxPrincipalFromPayment(paiementMaxMensuel, tauxQualification, 25, 12);
    const prixMax = hypoMax + miseFonds;

    cHypoMax.textContent = fmtMoney(hypoMax);
    cPrixMax.textContent = fmtMoney(prixMax);
  }
  [cRevenu, cDettes, cMiseFonds, cTaux].forEach((el) => el.addEventListener("input", updateCapacityCalc));
  updateCapacityCalc();

  /* ---------- Calc 3: Économies au renouvellement ---------- */
  const sSolde = $("#sSolde"), sTauxActuel = $("#sTauxActuel"), sNouveauTaux = $("#sNouveauTaux"), sAnnees = $("#sAnnees"), sAnneesVal = $("#sAnneesVal");
  const sEconomieMensuelle = $("#sEconomieMensuelle"), sAncienPaiement = $("#sAncienPaiement"), sNouveauPaiement = $("#sNouveauPaiement"), sEconomieTotale = $("#sEconomieTotale");

  function updateSavingsCalc() {
    const solde = parseFloat(sSolde.value) || 0;
    const tauxActuel = parseFloat(sTauxActuel.value) || 0;
    const nouveauTaux = parseFloat(sNouveauTaux.value) || 0;
    const annees = parseInt(sAnnees.value, 10);
    sAnneesVal.textContent = `${annees} ans`;

    const ancienPaiement = paymentAmount(solde, tauxActuel, annees, 12);
    const nouveauPaiement = paymentAmount(solde, nouveauTaux, annees, 12);
    const economieMensuelle = Math.max(ancienPaiement - nouveauPaiement, 0);
    const economieTotale = economieMensuelle * annees * 12;

    sAncienPaiement.textContent = fmtMoney(ancienPaiement);
    sNouveauPaiement.textContent = fmtMoney(nouveauPaiement);
    sEconomieMensuelle.textContent = fmtMoney(economieMensuelle);
    sEconomieTotale.textContent = fmtMoney(economieTotale);
  }
  [sSolde, sTauxActuel, sNouveauTaux, sAnnees].forEach((el) => el.addEventListener("input", updateSavingsCalc));
  updateSavingsCalc();

  /* ---------- Scenario tabs (lead form) ---------- */
  const scenarioTabs = $$(".scenario-tab");
  const scenarioPanels = $$(".scenario-panel");
  function activateScenario(key) {
    scenarioTabs.forEach((t) => { t.classList.toggle("active", t.dataset.scenario === key); t.setAttribute("aria-selected", String(t.dataset.scenario === key)); });
    scenarioPanels.forEach((p) => p.classList.toggle("active", p.dataset.panel === key));
  }
  scenarioTabs.forEach((tab) => tab.addEventListener("click", () => activateScenario(tab.dataset.scenario)));

  // Deep-link from service cards to the matching scenario tab/panel
  $$("[data-scenario-link]").forEach((link) => {
    link.addEventListener("click", () => {
      const key = link.dataset.scenarioLink;
      activateScenario(key);
      $("#heroScenario") && ($("#heroScenario").value = key);
    });
  });

  /* ---------- Hero quick form → scrolls to & syncs scenario form ---------- */
  const heroForm = $("#heroForm");
  heroForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const scenario = $("#heroScenario").value;
    activateScenario(scenario);
    document.getElementById("soumission").scrollIntoView({ behavior: "smooth" });
    const phoneField = $('#scenarioForm input[name="telephone"]');
    if (phoneField) phoneField.value = $("#heroForm input[name='phone']").value;
  });

  /* ---------- Scenario form submit (demo — no backend) ---------- */
  const scenarioForm = $("#scenarioForm");
  scenarioForm.addEventListener("submit", (e) => {
    e.preventDefault();
    scenarioForm.hidden = true;
    $("#formSuccess").hidden = false;
    $("#formSuccess").scrollIntoView({ behavior: "smooth", block: "center" });
  });

  /* ---------- FAQ accordion ---------- */
  $$(".faq-item").forEach((item) => {
    const btn = $(".faq-question", item);
    btn.addEventListener("click", () => {
      const isOpen = item.classList.contains("open");
      $$(".faq-item").forEach((other) => { other.classList.remove("open"); $(".faq-question", other).setAttribute("aria-expanded", "false"); });
      if (!isOpen) {
        item.classList.add("open");
        btn.setAttribute("aria-expanded", "true");
      }
    });
  });
})();
