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


def main():
    n = sum(1 for name in PAGES if patch(name))
    print("Pages existantes mises a jour : %d" % n)


if __name__ == "__main__":
    main()
