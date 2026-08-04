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
  const scrollProgress = $("#scrollProgress");
  const onScroll = () => {
    header.classList.toggle("scrolled", window.scrollY > 8);
    $("#backToTop").classList.toggle("visible", window.scrollY > 600);
    if (scrollProgress) {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? Math.min((window.scrollY / docHeight) * 100, 100) : 0;
      scrollProgress.style.width = pct + "%";
    }
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
     fetches each one and injects it as a data: URI once loaded. Retries with
     an increasing delay on failure before finally giving up silently. ---------- */
  const ASSETS_BASE = "https://kelto-assets.vercel.app/";
  const ASSET_MAX_ATTEMPTS = 3;
  function loadAsset(img, path, attempt = 0) {
    fetch(ASSETS_BASE + path)
      .then((r) => {
        if (!r.ok) throw new Error("Asset fetch failed: " + r.status);
        return r.text();
      })
      .then((text) => {
        img.src = "data:image/png;base64," + text.replace(/\s+/g, "");
      })
      .catch(() => {
        if (attempt + 1 < ASSET_MAX_ATTEMPTS) {
          setTimeout(() => loadAsset(img, path, attempt + 1), 600 * (attempt + 1));
        }
      });
  }
  $$("[data-img-src]").forEach((img) => {
    loadAsset(img, img.getAttribute("data-img-src"));
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

  /* ---------- Scroll-spy active nav link ---------- */
  const navLinks = $$(".main-nav a[href^='#']");
  const spySections = navLinks
    .map((a) => document.getElementById(a.getAttribute("href").slice(1)))
    .filter(Boolean);
  if ("IntersectionObserver" in window && spySections.length) {
    const ioSpy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const link = navLinks.find((a) => a.getAttribute("href") === "#" + entry.target.id);
        if (!link) return;
        if (entry.isIntersecting) {
          navLinks.forEach((a) => a.classList.remove("active"));
          link.classList.add("active");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });
    spySections.forEach((sec) => ioSpy.observe(sec));
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

  /* ---------- Calc 4: Financement commercial ---------- */
  const ktTypeImmeuble = $("#ktTypeImmeuble");
  const ktModeButtons = $$(".subtoggle-btn[data-commercial-mode]");
  const ktFieldGroups = $$("[data-commercial-fields]");
  const ktPrixAchat = $("#ktPrixAchat"), ktMiseFonds = $("#ktMiseFonds");
  const ktValeurActuelle = $("#ktValeurActuelle"), ktSoldeActuel = $("#ktSoldeActuel");
  const ktTaux = $("#ktTaux"), ktAmort = $("#ktAmort"), ktAmortVal = $("#ktAmortVal");
  const ktResultLabel = $("#ktResultLabel"), ktResultValue = $("#ktResultValue");
  const ktLegendRefinance = $("#ktLegendRefinance"), ktValeurMax = $("#ktValeurMax"), ktSoldeAffiche = $("#ktSoldeAffiche"), ktEquiteDispo = $("#ktEquiteDispo");
  const aphSelectNote = $("#aphSelectNote");
  let ktMode = "achat";
  const LTV_COMMERCIAL = 0.75;

  function updateAphNote() {
    if (aphSelectNote) aphSelectNote.hidden = ktTypeImmeuble.value !== "multi";
  }

  function updateCommercialCalc() {
    const taux = parseFloat(ktTaux.value) || 0;
    const amort = parseInt(ktAmort.value, 10);
    ktAmortVal.textContent = `${amort} ans`;

    if (ktMode === "achat") {
      const prix = parseFloat(ktPrixAchat.value) || 0;
      const mise = parseFloat(ktMiseFonds.value) || 0;
      const pret = Math.max(prix - mise, 0);
      const paiement = paymentAmount(pret, taux, amort, 12);
      ktResultLabel.textContent = "Paiement mensuel estimé";
      ktResultValue.textContent = fmtMoney(paiement);
      ktLegendRefinance.hidden = true;
    } else {
      const valeur = parseFloat(ktValeurActuelle.value) || 0;
      const solde = parseFloat(ktSoldeActuel.value) || 0;
      const valeurMax = valeur * LTV_COMMERCIAL;
      const equite = Math.max(valeurMax - solde, 0);
      const paiement = paymentAmount(solde, taux, amort, 12);
      ktResultLabel.textContent = "Nouveau paiement mensuel estimé (solde actuel)";
      ktResultValue.textContent = fmtMoney(paiement);
      ktValeurMax.textContent = fmtMoney(valeurMax);
      ktSoldeAffiche.textContent = fmtMoney(solde);
      ktEquiteDispo.textContent = fmtMoney(equite);
      ktLegendRefinance.hidden = false;
    }
  }

  ktModeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      ktMode = btn.dataset.commercialMode;
      ktModeButtons.forEach((b) => { b.classList.toggle("active", b === btn); b.setAttribute("aria-pressed", String(b === btn)); });
      ktFieldGroups.forEach((g) => { g.hidden = g.dataset.commercialFields !== ktMode; });
      updateCommercialCalc();
    });
  });

  ktTypeImmeuble.addEventListener("change", updateAphNote);
  [ktPrixAchat, ktMiseFonds, ktValeurActuelle, ktSoldeActuel, ktTaux, ktAmort].forEach((el) => el.addEventListener("input", updateCommercialCalc));
  updateAphNote();
  updateCommercialCalc();

  /* ---------- Multi-step "soumission" wizard ---------- */
  const wizardWidget = $("#wizardWidget");
  const scenarioForm = $("#scenarioForm");
  const wizardProgressBar = $("#wizardProgressBar");
  const wizardStepCount = $("#wizardStepCount");
  const wizardBack = $("#wizardBack");
  const wizardNext = $("#wizardNext");
  const wizardNav = wizardWidget ? $(".wizard-nav", wizardWidget) : null;
  const wizardSteps = wizardWidget ? $$(".wizard-step", wizardWidget) : [];
  const CONTACT_STEPS = ["contact-nom", "contact-telephone", "contact-courriel"];
  const TOTAL_STEPS = 4 + CONTACT_STEPS.length + 1 + 1; // 4 champs scénario + 3 coordonnées + 1 réservation + 1 étape de choix du projet
  let wizardScenario = null;
  let wizardSequence = [];
  let wizardIndex = 0;
  let calInitialized = false;

  function stepsForScenario(key) {
    return [`${key}-1`, `${key}-2`, `${key}-3`, `${key}-4`, ...CONTACT_STEPS, "booking"];
  }
  function getWizardStep(key) {
    return wizardSteps.find((el) => el.dataset.step === key);
  }
  function updateWizardProgress(key) {
    const idx = key === "scenario" ? 0 : wizardSequence.indexOf(key) + 1;
    const pct = (idx / (TOTAL_STEPS - 1)) * 100;
    if (wizardProgressBar) wizardProgressBar.style.width = pct + "%";
    if (wizardStepCount) wizardStepCount.textContent = `Étape ${idx + 1} sur ${TOTAL_STEPS}`;
  }
  function initCalEmbed() {
    if (calInitialized || !scenarioForm) return;
    calInitialized = true;
    (function (C, A, L) {
      let p = function (a, ar) { a.q.push(ar); };
      let d = C.document;
      C.Cal = C.Cal || function () {
        let cal = C.Cal; let ar = arguments;
        if (!cal.loaded) {
          cal.ns = {}; cal.q = cal.q || [];
          d.head.appendChild(d.createElement("script")).src = A;
          cal.loaded = true;
        }
        if (ar[0] === L) {
          const api = function () { p(api, arguments); };
          const namespace = ar[1];
          api.q = api.q || [];
          if (typeof namespace === "string") {
            cal.ns[namespace] = cal.ns[namespace] || api;
            p(cal.ns[namespace], ar);
            p(cal, ["initNamespace", namespace]);
          } else p(cal, ar);
          return;
        }
        p(cal, ar);
      };
    })(window, "https://app.cal.com/embed/embed.js", "init");

    const formData = new FormData(scenarioForm);
    const nom = formData.get("nom") || "";
    const courriel = formData.get("courriel") || "";
    const noteParts = [];
    if (wizardScenario) noteParts.push("Scénario: " + wizardScenario);
    for (const [k, v] of formData.entries()) {
      if (["nom", "telephone", "courriel"].includes(k) || !v) continue;
      noteParts.push(`${k}: ${v}`);
    }

    window.Cal("init", "kelto-hypotheques", { origin: "https://cal.com" });
    window.Cal.ns["kelto-hypotheques"]("inline", {
      elementOrSelector: "#calEmbed",
      config: { layout: "month_view", name: nom, email: courriel, notes: noteParts.join(" | ") },
      calLink: "kelto-hypotheques",
    });
    window.Cal.ns["kelto-hypotheques"]("ui", { styles: { branding: { brandColor: "#134e86" } }, hideEventTypeDetails: false, layout: "month_view" });
  }
  function showWizardStep(key) {
    wizardSteps.forEach((el) => el.classList.remove("active"));
    const el = getWizardStep(key);
    if (el) el.classList.add("active");
    const isScenario = key === "scenario";
    const isBooking = key === "booking";
    if (wizardNav) wizardNav.style.display = isScenario ? "none" : "flex";
    if (wizardNext) wizardNext.style.display = isBooking ? "none" : "inline-flex";
    if (wizardBack) wizardBack.style.display = isScenario ? "none" : "inline-flex";
    updateWizardProgress(key);
    if (isBooking) initCalEmbed();
  }
  function currentWizardStepKey() {
    return wizardSequence.length ? wizardSequence[wizardIndex] : "scenario";
  }
  function goToScenario(key) {
    wizardScenario = key;
    wizardSequence = stepsForScenario(key);
    wizardIndex = 0;
    const heroScenarioEl = $("#heroScenario");
    if (heroScenarioEl) heroScenarioEl.value = key;
    if (wizardWidget) document.getElementById("soumission").scrollIntoView({ behavior: "smooth" });
    showWizardStep(wizardSequence[0]);
  }
  function validateWizardStep(key) {
    const el = getWizardStep(key);
    if (!el) return true;
    const input = $("input[required], select[required]", el);
    if (input && !input.value) {
      input.focus();
      input.reportValidity && input.reportValidity();
      return false;
    }
    return true;
  }
  if (wizardWidget) {
    $$(".wizard-choice", wizardWidget).forEach((btn) => {
      btn.addEventListener("click", () => goToScenario(btn.dataset.scenarioChoice));
    });
    if (wizardNext) {
      wizardNext.addEventListener("click", () => {
        const key = currentWizardStepKey();
        if (key === "scenario" || !wizardSequence.length) return;
        if (!validateWizardStep(key)) return;
        if (wizardIndex < wizardSequence.length - 1) {
          wizardIndex++;
          showWizardStep(wizardSequence[wizardIndex]);
          wizardWidget.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    }
    if (wizardBack) {
      wizardBack.addEventListener("click", () => {
        if (wizardIndex <= 0) {
          showWizardStep("scenario");
        } else {
          wizardIndex--;
          showWizardStep(wizardSequence[wizardIndex]);
        }
        wizardWidget.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
    wizardWidget.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.target.tagName === "INPUT") {
        e.preventDefault();
        wizardNext && wizardNext.click();
      }
    });
    showWizardStep("scenario");
  }

  // Deep-link from service cards straight into the matching scenario's wizard steps
  $$("[data-scenario-link]").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      goToScenario(link.dataset.scenarioLink);
    });
  });

  /* ---------- Hero quick form → jumps straight into the matching wizard scenario ---------- */
  const heroForm = $("#heroForm");
  heroForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const scenarioKey = $("#heroScenario").value;
    goToScenario(scenarioKey);
    const phoneField = $('#scenarioForm input[name="telephone"]');
    if (phoneField) phoneField.value = $("#heroForm input[name='phone']").value;
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

  /* ---------- Hero particle canvas (cursor-reactive) ---------- */
  (() => {
    const canvas = $("#heroCanvas");
    const hero = $(".hero");
    if (!canvas || !hero || !canvas.getContext) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d");
    let width, height, particles = [];
    const mouse = { x: null, y: null, active: false };
    let running = false, rafId = null;

    const PARTICLE_COUNT = 55;
    const MAX_LINK_DIST = 130;
    const MOUSE_RADIUS = 220;

    function resize() {
      width = canvas.width = hero.offsetWidth;
      height = canvas.height = hero.offsetHeight;
    }

    function initParticles() {
      particles = Array.from({ length: PARTICLE_COUNT }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 1.6 + 0.6,
      }));
    }

    function step() {
      ctx.clearRect(0, 0, width, height);

      if (mouse.active) {
        const glow = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 240);
        glow.addColorStop(0, "rgba(255, 255, 255, 0.14)");
        glow.addColorStop(0.5, "rgba(255, 255, 255, 0.05)");
        glow.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);
      }

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        let brightness = 0.55;
        if (mouse.active) {
          const dx = p.x - mouse.x, dy = p.y - mouse.y;
          const dist = Math.hypot(dx, dy);
          if (dist < MOUSE_RADIUS && dist > 0.01) {
            const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS;
            p.x += (dx / dist) * force * 2.2;
            p.y += (dy / dist) * force * 2.2;
            brightness = 0.55 + force * 0.4;
          }
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(30, 172, 218, ${brightness})`;
        ctx.fill();
      });

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < MAX_LINK_DIST) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(30, 172, 218, ${0.16 * (1 - dist / MAX_LINK_DIST)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      if (running) rafId = requestAnimationFrame(step);
    }

    function start() {
      if (running) return;
      running = true;
      rafId = requestAnimationFrame(step);
    }
    function stop() {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
    }

    resize();
    initParticles();

    window.addEventListener("resize", () => { resize(); initParticles(); });
    hero.addEventListener("mousemove", (e) => {
      const rect = hero.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    });
    hero.addEventListener("mouseleave", () => { mouse.active = false; });

    if ("IntersectionObserver" in window) {
      const ioHero = new IntersectionObserver((entries) => {
        entries.forEach((entry) => { entry.isIntersecting ? start() : stop(); });
      }, { threshold: 0 });
      ioHero.observe(hero);
    } else {
      start();
    }
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop();
      else if (hero.getBoundingClientRect().top < window.innerHeight) start();
    });
  })();
})();
