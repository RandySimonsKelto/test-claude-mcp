#!/usr/bin/env python3
"""
Transforme les articles bruts deposes par Duqky en pages du site Kelto,
puis regenere la page d'index articles.html et le sitemap.xml.

Idempotent : un fichier deja construit porte le marqueur KELTO_BUILT et est ignore.
Usage : python3 build_articles.py
"""
import os, re, json, html, unicodedata, datetime

ROOT     = os.path.dirname(os.path.abspath(__file__))
ART_DIR  = os.path.join(ROOT, "articles")
SITE     = "https://kelto.ca"
RAW_BASE = "https://raw.githubusercontent.com/RandySimonsKelto/test-claude-mcp/main/"
MARKER   = "<!--KELTO_BUILT-->"

FAVICON = open(os.path.join(ROOT, "assets", "favicon.b64")).read().strip()
QCFLAG  = open(os.path.join(ROOT, "assets", "qcflag.b64")).read().strip()

MOIS = ["janvier","février","mars","avril","mai","juin","juillet",
        "août","septembre","octobre","novembre","décembre"]

def slugify(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()
    return re.sub(r"-{2,}", "-", s)[:80]

def date_fr(iso):
    y, m, d = (int(x) for x in iso.split("-"))
    return "%d %s %d" % (d, MOIS[m-1], y)

def nav(active):
    items = [("index.html#services","Services"), ("index.html#calculatrices","Calculatrices"),
             ("index.html#comment-ca-marche","Comment ça marche"), ("index.html#equipe","Notre équipe"),
             ("articles.html","Articles"), ("index.html#temoignages","Témoignages"),
             ("index.html#faq","FAQ")]
    out = []
    for href, label in items:
        cur = ' aria-current="page"' if (active == "articles" and href == "articles.html") else ""
        out.append('<li><a href="%s%s"%s>%s</a></li>' % (("../" if active=="article" else ""), href, cur, label))
    return '<nav class="main-nav" id="mainNav" aria-label="Navigation principale"><ul>%s</ul></nav>' % "".join(out)

def head(title, desc, canonical, up, extra=""):
    return ('<!doctype html><html lang="fr-CA"><head><meta charset="UTF-8">'
      '<meta name="viewport" content="width=device-width,initial-scale=1">'
      '<title>%s</title><meta name="description" content="%s">'
      '<link rel="canonical" href="%s">'
      '<meta property="og:type" content="%s"><meta property="og:title" content="%s">'
      '<meta property="og:description" content="%s"><meta property="og:url" content="%s">'
      '<meta property="og:locale" content="fr_CA"><meta property="og:site_name" content="Kelto">'
      '<link rel="icon" type="image/png" href="data:image/png;base64,%s">'
      '<link rel="preconnect" href="https://fonts.googleapis.com">'
      '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
      '<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">'
      '<link rel="stylesheet" href="%sstyles.css"><link rel="stylesheet" href="%ssite-fixes.css">%s</head>'
      ) % (html.escape(title), html.escape(desc), canonical,
           "article" if up else "website", html.escape(title), html.escape(desc), canonical,
           FAVICON, up, up, extra)

def header(active, up):
    return ('<body><div class="scroll-progress" id="scrollProgress" aria-hidden="true"></div>'
      '<a class="skip-link" href="#main">Passer au contenu principal</a>'
      '<div class="qc-bar"><div class="container qc-bar-inner">'
      '<img src="data:image/png;base64,%s" alt="Drapeau du Québec" width="24" height="16" class="qc-flag"> '
      '<span>Fière entreprise québécoise</span></div></div>'
      '<header class="site-header" id="siteHeader"><div class="container header-inner">'
      '<a href="%sindex.html#top" class="logo"><img data-img-src="assets/img/kelto-logo" data-img-chunks="8" '
      'data-img-base="%s" data-img-mime="image/png" alt="Kelto"></a>%s'
      '<div class="header-actions"><a href="tel:+15146606655" class="phone-link">'
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">'
      '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg> '
      '<span>(514) 660-6655</span> </a>'
      '<a href="%sindex.html#soumission" class="btn btn-primary btn-header">Soumission gratuite</a> '
      '<button class="nav-toggle" id="navToggle" aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="mainNav">'
      '<span></span><span></span><span></span></button></div></div></header>'
      ) % (QCFLAG, up, RAW_BASE, nav(active), up)

def footer(up):
    return ('<footer class="site-footer"><div class="container footer-grid"><div class="footer-brand">'
      '<a href="%sindex.html#top" class="logo"><img data-img-src="assets/img/kelto-logo" data-img-chunks="8" '
      'data-img-base="%s" data-img-mime="image/png" alt="Kelto"></a>'
      '<p>Une équipe de courtiers hypothécaires dédiée à vous accompagner, avec écoute et transparence, partout au Québec.</p>'
      '<div class="stars" aria-hidden="true">★★★★★</div></div>'
      '<div class="footer-col"><h4>Services</h4><ul>'
      '<li><a href="%sindex.html#services">Achat</a></li><li><a href="%sindex.html#services">Renouvellement</a></li>'
      '<li><a href="%sindex.html#services">Refinancement</a></li><li><a href="%sindex.html#services">Prêt privé</a></li>'
      '<li><a href="%sindex.html#services">Prêt alternatif</a></li><li><a href="%sindex.html#services">Financement commercial</a></li></ul></div>'
      '<div class="footer-col"><h4>Ressources</h4><ul>'
      '<li><a href="%sarticles.html">Articles</a></li><li><a href="%sindex.html#calculatrices">Calculatrices</a></li>'
      '<li><a href="%sindex.html#faq">FAQ</a></li><li><a href="%sindex.html#soumission">Soumission gratuite</a></li></ul></div>'
      '<div class="footer-col"><h4>Contact</h4><ul>'
      '<li><a href="tel:+15146606655">(514) 660-6655</a></li><li><a href="mailto:info@kelto.ca">info@kelto.ca</a></li>'
      '<li>Québec, Canada</li></ul></div></div>'
      '<div class="container footer-bottom"><p>© %d Kelto. Tous droits réservés.</p>'
      '<p class="footer-legal">Courtiers hypothécaires agréés au Québec. Les taux et estimations affichés sont '
      'fournis à titre indicatif seulement et ne constituent pas une offre de financement.</p></div></footer>'
      '<button class="back-to-top" id="backToTop" aria-label="Retour en haut">↑</button>'
      '<script src="%sscript.js"></script></body></html>'
      ) % ((up, RAW_BASE) + (up,)*10 + (datetime.date.today().year, up))

def parse_raw(path):
    """Extrait titre, resume et corps d'un fichier HTML brut de Duqky."""
    src = open(path, encoding="utf-8").read()
    body = re.search(r"<body[^>]*>(.*)</body>", src, re.S)
    body = body.group(1) if body else src
    body = re.sub(r"<!--\s*internal link suggestion.*?-->", "", body, flags=re.S)
    body = re.sub(r"<style.*?</style>", "", body, flags=re.S)
    h1s = re.findall(r"<h1[^>]*>(.*?)</h1>", body, re.S)
    titre = re.sub(r"<[^>]+>", "", h1s[-1]).strip() if h1s else os.path.basename(path)
    titre = html.unescape(titre).replace(" _ ", " : ").strip()
    body = re.sub(r"<h1[^>]*>.*?</h1>", "", body, flags=re.S)        # on reinjecte un seul h1
    paras = re.findall(r"<p[^>]*>(.*?)</p>", body, re.S)
    resume = ""
    for p in paras:
        t = html.unescape(re.sub(r"<[^>]+>", "", p)).strip()
        if len(t) > 80:
            resume = t; break
    if len(resume) > 185:
        resume = resume[:182].rsplit(" ", 1)[0] + "…"
    mots = len(re.sub(r"<[^>]+>", " ", body).split())
    return titre, resume, body.strip(), max(1, round(mots / 200))

def build_article(path, slug, iso):
    titre, resume, corps, minutes = parse_raw(path)
    url = "%s/articles/%s.html" % (SITE, slug)
    ld = json.dumps({"@context":"https://schema.org","@type":"BlogPosting","headline":titre,
                     "description":resume,"datePublished":iso,"inLanguage":"fr-CA",
                     "mainEntityOfPage":url,
                     "author":{"@type":"Organization","name":"Kelto"},
                     "publisher":{"@type":"Organization","name":"Kelto"}}, ensure_ascii=False)
    extra = '<script type="application/ld+json">%s</script>' % ld
    page = (MARKER + head(titre + " | Kelto", resume, url, "../", extra) + header("article", "../") +
      '<main id="main"><article class="article-page">'
      '<header class="article-head"><div class="container container-narrow">'
      '<a class="article-back" href="../articles.html">&larr; Tous les articles</a>'
      '<h1>%s</h1><p class="article-meta">Publié le %s &middot; %d min de lecture</p>'
      '</div></header>'
      '<div class="container container-narrow article-content">%s</div>'
      '<div class="container container-narrow"><aside class="article-cta">'
      '<h2>Une question sur votre situation ?</h2>'
      '<p>Un conseiller Kelto peut faire le point avec vous, gratuitement et sans engagement.</p>'
      '<a href="../index.html#soumission" class="btn btn-primary">Obtenir ma soumission gratuite</a>'
      '</aside></div></article></main>' % (html.escape(titre), date_fr(iso), minutes, corps)
      + footer("../"))
    return titre, resume, minutes, page

def build_index(entries):
    cards = []
    for e in sorted(entries, key=lambda x: x["date"], reverse=True):
        cards.append('<a class="article-card" href="articles/%s.html">'
          '<div class="article-body"><p class="article-meta">%s &middot; %d min de lecture</p>'
          '<h2>%s</h2><p>%s</p><span class="article-more">Lire l\'article &rarr;</span></div></a>'
          % (e["slug"], date_fr(e["date"]), e["minutes"], html.escape(e["titre"]), html.escape(e["resume"])))
    corps = ('<div class="articles-grid">%s</div>' % "".join(cards)) if cards else (
      '<div class="articles-empty"><h2>Les premiers articles arrivent sous peu</h2>'
      '<p>Notre équipe prépare une série de guides sur l\'hypothèque au Québec.</p>'
      '<a href="index.html#soumission" class="btn btn-primary">Parler à un conseiller</a></div>')
    return (MARKER + head("Articles | Kelto",
      "Guides et analyses sur l'hypothèque au Québec : taux, capacité d'emprunt, renouvellement et financement commercial.",
      SITE + "/articles.html", "") + header("articles", "") +
      '<main id="main"><section class="articles-hero"><div class="container">'
      '<p class="eyebrow">Ressources</p><h1>Articles</h1>'
      '<p>Des guides clairs sur le financement hypothécaire au Québec : taux, capacité d\'emprunt, '
      'renouvellement, prêt privé et financement commercial. Écrits par notre équipe, sans jargon.</p>'
      '</div></section><section class="articles-wrap"><div class="container">' + corps +
      '</div></section></main>' + footer(""))

def build_sitemap(entries):
    pages = ["", "articles.html", "team-randy.html", "team-jeffrey.html", "team-ryan.html",
             "team-jonathan.html", "team-rami.html", "team-eric.html"]
    today = datetime.date.today().isoformat()
    u = ['<url><loc>%s/%s</loc><lastmod>%s</lastmod></url>' % (SITE, p, today) for p in pages]
    for e in entries:
        u.append('<url><loc>%s/articles/%s.html</loc><lastmod>%s</lastmod></url>' % (SITE, e["slug"], e["date"]))
    return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n%s\n</urlset>\n' % "\n".join(u)

def repair_built():
    """Corrige, dans les articles deja construits, le lien Articles du menu
    (articles.html pointait vers /articles/articles.html, qui n'existe pas)."""
    BAD  = '<li><a href="articles.html">Articles</a></li>'
    GOOD = '<li><a href="../articles.html">Articles</a></li>'
    n = 0
    for name in sorted(os.listdir(ART_DIR)):
        if not name.endswith(".html"):
            continue
        path = os.path.join(ART_DIR, name)
        raw = open(path, encoding="utf-8").read()
        if raw.startswith(MARKER) and BAD in raw:
            open(path, "w", encoding="utf-8").write(raw.replace(BAD, GOOD))
            n += 1
    print("Articles repares : %d" % n)

def main():
    os.makedirs(ART_DIR, exist_ok=True)
    manifest_path = os.path.join(ART_DIR, "manifest.json")
    manifest = json.load(open(manifest_path)) if os.path.exists(manifest_path) else {}
    entries, built = [], 0
    for name in sorted(os.listdir(ART_DIR)):
        if not name.endswith(".html"):
            continue
        path = os.path.join(ART_DIR, name)
        raw = open(path, encoding="utf-8").read()
        if raw.startswith(MARKER):
            continue                                   # deja construit
        titre_tmp, _, _, _ = parse_raw(path)
        slug = slugify(titre_tmp)
        iso = manifest.get(slug, {}).get("date") or datetime.date.today().isoformat()
        titre, resume, minutes, page = build_article(path, slug, iso)
        os.remove(path)
        open(os.path.join(ART_DIR, slug + ".html"), "w", encoding="utf-8").write(page)
        manifest[slug] = {"titre": titre, "resume": resume, "minutes": minutes, "date": iso}
        built += 1
    for slug, meta in manifest.items():
        if os.path.exists(os.path.join(ART_DIR, slug + ".html")):
            entries.append(dict(slug=slug, **meta))
    json.dump(manifest, open(manifest_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1, sort_keys=True)
    open(os.path.join(ROOT, "articles.html"), "w", encoding="utf-8").write(build_index(entries))
    open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8").write(build_sitemap(entries))
    print("Articles construits : %d | total publie : %d" % (built, len(entries)))
    repair_built()

if __name__ == "__main__":
    main()
