#!/usr/bin/env python3
"""
Ajoute l'onglet Articles au menu principal et au pied de page des pages
existantes du site, et y branche la feuille de correctifs site-fixes.css.

Modification chirurgicale par remplacement de chaines : le reste du fichier,
y compris les images encodees en base64, n'est jamais retouche.
Idempotent : relancer le script ne change rien.
Usage : python3 patch_pages.py
"""
import os, re

ROOT = os.path.dirname(os.path.abspath(__file__))

PAGES = ["index.html", "team-randy.html", "team-jeffrey.html", "team-ryan.html",
         "team-jonathan.html", "team-rami.html", "team-eric.html"]

CSS_OLD = '<link rel="stylesheet" href="styles.css">'
CSS_NEW = '<link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="site-fixes.css">'
NAV_ITEM = '<li><a href="articles.html">Articles</a></li>'
FTR_OLD = '<h4>Ressources</h4><ul>'
FTR_NEW = '<h4>Ressources</h4><ul><li><a href="articles.html">Articles</a></li>'


def patch(name):
    path = os.path.join(ROOT, name)
    if not os.path.exists(path):
        print("  ! absent : %s" % name)
        return False
    src = open(path, encoding="utf-8").read()
    out = src

    # 1. feuille de correctifs
    if "site-fixes.css" not in out:
        if CSS_OLD not in out:
            print("  ! %s : balise styles.css introuvable" % name)
            return False
        out = out.replace(CSS_OLD, CSS_NEW, 1)

    # 2. menu principal : Articles entre « Notre equipe » et « Temoignages »
    m = re.search(r'<nav class="main-nav".*?</nav>', out, re.S)
    if not m:
        print("  ! %s : menu introuvable" % name)
        return False
    navblock = m.group(0)
    if "articles.html" not in navblock:
        pref = "" if name == "index.html" else "index.html"
        anchor = '<li><a href="%s#temoignages">' % pref
        if anchor not in navblock:
            print("  ! %s : ancre Temoignages introuvable dans le menu" % name)
            return False
        out = out.replace(navblock, navblock.replace(anchor, NAV_ITEM + anchor, 1), 1)

    # 3. pied de page, colonne Ressources
    if FTR_OLD in out:
        apres = out.split(FTR_OLD, 1)[1][:200]
        if 'href="articles.html">Articles</a></li>' not in apres:
            out = out.replace(FTR_OLD, FTR_NEW, 1)

    if out == src:
        return False
    open(path, "w", encoding="utf-8").write(out)
    print("  + %s (+%d octets)" % (name, len(out) - len(src)))
    return True


# --- Pixel Meta de Kelto avec consentement prealable (Loi 25) -------------------
# Le jeu de donnees appartient au portefeuille Meta de Kelto (pas a une agence).
META_PIXEL_ID = "973439061907168"
META_DOMAIN_VERIFICATION = "b0hnjixad68dpp26fp97ztdancffo8"   # kelto.ca, portefeuille Kelto Hypotheques
META_LOADER = "kelto-meta-pixel.js"
META_LINKS = ('<li><a href="%sconfidentialite.html">Politique de confidentialité</a></li>'
              '<li><a href="#" data-kelto-consent-open>Gérer mes témoins</a></li>')


def meta_pages():
    """Pages statiques + pages d'articles (construites par build_articles.py)."""
    pages = list(PAGES) + ["articles.html", "confidentialite.html"]
    art = os.path.join(ROOT, "articles")
    if os.path.isdir(art):
        pages += ["articles/" + f for f in sorted(os.listdir(art)) if f.endswith(".html")]
    return pages


def patch_meta(name):
    """Ajoute (1) le chargeur du pixel avant script.js, (2) les liens Confidentialite /
    Gerer mes temoins dans la colonne Ressources du pied de page, (3) la balise de
    verification du domaine sur la page d'accueil. Idempotent."""
    path = os.path.join(ROOT, name)
    if not os.path.exists(path):
        return False
    up = "../" if "/" in name else ""
    src = open(path, encoding="utf-8").read()
    out = src

    if META_LOADER not in out:
        old = '<script src="%sscript.js"></script>' % up
        if old not in out:
            print("  ! %s : balise script.js introuvable (pixel non ajoute)" % name)
            return False
        cfg = ('<script>window.KELTO_META={pixelId:"%s",privacyUrl:"%sconfidentialite.html",siteName:"Kelto"};</script>'
               '<script src="%s%s"></script>') % (META_PIXEL_ID, up, up, META_LOADER)
        out = out.replace(old, cfg + old, 1)

    i = out.find(FTR_OLD)
    if i >= 0:
        j = out.find("</ul>", i)
        if j >= 0 and "confidentialite.html" not in out[i:j]:
            out = out[:j] + META_LINKS % up + out[j:]

    if name == "index.html" and "facebook-domain-verification" not in out:
        out = out.replace('<meta charset="UTF-8">',
                          '<meta charset="UTF-8"><meta name="facebook-domain-verification" content="%s">'
                          % META_DOMAIN_VERIFICATION, 1)

    if out == src:
        return False
    open(path, "w", encoding="utf-8").write(out)
    print("  + %s : pixel Meta / confidentialite (+%d octets)" % (name, len(out) - len(src)))
    return True


def main():
    n = sum(1 for name in PAGES if patch(name))
    print("Pages existantes mises a jour : %d" % n)
    m = sum(1 for name in meta_pages() if patch_meta(name))
    print("Pages mises a jour (pixel Meta avec consentement) : %d" % m)


if __name__ == "__main__":
    main()
