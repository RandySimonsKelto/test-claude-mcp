#!/usr/bin/env python3
"""
Genere confidentialite.html (politique de confidentialite) avec le meme gabarit
que les pages d'articles (en-tete, menu, pied de page de build_articles.py).

BROUILLON : le texte doit etre valide par un juriste avant la mise en ligne
(duree de conservation, liste des fournisseurs, evaluation des facteurs relatifs
a la vie privee, adresse du responsable).

Usage : python3 build_confidentialite.py   (puis python3 patch_pages.py pour le chargeur du pixel)
"""
import os, datetime
import build_articles as ba

ROOT = os.path.dirname(os.path.abspath(__file__))
URL = ba.SITE + "/confidentialite.html"
TITRE = "Politique de confidentialité"
RESUME = ("Comment Kelto recueille, utilise et protège vos renseignements personnels, "
          "et comment exercer vos droits (Loi 25, Québec).")

# Responsable de la protection des renseignements personnels.
# L'adresse publique du site (info@kelto.ca) sert tant qu'une adresse dediee n'est pas confirmee.
RESPONSABLE = "Ryan Rizkallah"
COURRIEL = "info@kelto.ca"
TELEPHONE = "(514) 660-6655"

CORPS = """
<p>Groupe Kelto inc. (« Kelto », « nous ») exploite le site kelto.ca. Cette politique explique, en langage clair,
quels renseignements personnels nous recueillons, pourquoi, avec qui nous les partageons et comment exercer vos droits,
conformément à la <em>Loi sur la protection des renseignements personnels dans le secteur privé</em> du Québec (Loi&nbsp;25).</p>

<h2>1. Responsable de la protection des renseignements personnels</h2>
<p>%(resp)s est la personne responsable de la protection des renseignements personnels chez Kelto.
Pour toute question ou demande : <a href="mailto:%(mail)s">%(mail)s</a> ou %(tel)s.</p>

<h2>2. Les renseignements que nous recueillons</h2>
<ul>
<li><strong>Ce que vous nous transmettez :</strong> votre nom, votre numéro de téléphone, votre courriel et vos réponses aux questions
du formulaire de soumission (type de projet, situation hypothécaire, etc.) lorsque vous demandez une soumission ou un rendez-vous.</li>
<li><strong>Votre réservation :</strong> les renseignements saisis dans le calendrier de réservation (nom, courriel, notes).</li>
<li><strong>Des données de navigation, seulement si vous les acceptez :</strong> pages consultées, identifiants de témoin, adresse IP,
type d’appareil et de navigateur, et le fait que vous êtes arrivé(e) à partir d’une de nos publicités (voir la section 4).</li>
</ul>

<h2>3. Pourquoi nous les utilisons</h2>
<ul>
<li>répondre à votre demande, vous contacter et évaluer votre situation de financement;</li>
<li>vous proposer un rendez-vous et assurer le suivi de votre dossier;</li>
<li>respecter nos obligations légales et réglementaires de courtier hypothécaire;</li>
<li>seulement si vous l’acceptez : mesurer l’efficacité de nos publicités.</li>
</ul>
<p>Nous n’utilisons pas vos renseignements à d’autres fins sans votre consentement.</p>

<h2>4. Témoins et pixel Meta (Facebook et Instagram)</h2>
<p>Le pixel Meta est <strong>désactivé par défaut</strong>. Il n’est chargé qu’après votre clic sur « Accepter » dans la bannière,
et vous pouvez refuser aussi facilement. Il s’agit d’une technologie qui permet d’identifier un visiteur et de relier sa visite
à une publicité (une forme de profilage publicitaire) : c’est pourquoi nous demandons votre accord au préalable.</p>
<p>Si vous acceptez, Meta reçoit des informations sur votre visite (par exemple la page consultée, un identifiant de témoin,
votre adresse IP et votre navigateur) ainsi que l’événement « Lead » ou « Schedule » lorsque vous envoyez une demande ou réservez un rendez-vous.
Pour relier correctement une demande à l’annonce qui l’a générée, votre courriel, votre numéro de téléphone et votre nom
peuvent aussi être transmis à Meta sous forme chiffrée (hachée, donc non lisible en clair).
<strong>Nous n’envoyons jamais à Meta de renseignements financiers</strong> (montant, revenu, mise de fonds, cote de crédit, etc.).</p>
<p>Vous pouvez changer d’avis en tout temps avec le lien « Gérer mes témoins » au bas de chaque page, ou en supprimant les témoins
de votre navigateur. Si vous refusez, rien n’est envoyé à Meta et votre demande est traitée exactement de la même façon.</p>

<h2>5. Avec qui nous partageons vos renseignements</h2>
<ul>
<li>Nos fournisseurs de services, qui les traitent pour nous : hébergement du site (Vercel), automatisation (Zapier),
gestion de la relation client (GoHighLevel, et Pipedrive pour les dossiers retenus), calendrier de réservation (Cal.com).</li>
<li>Meta, seulement si vous avez accepté les témoins publicitaires (section 4).</li>
<li>Les prêteurs et institutions financières, seulement si vous nous autorisez à présenter votre dossier.</li>
</ul>
<p>Nous ne vendons pas vos renseignements.</p>

<h2>6. Où sont conservés vos renseignements</h2>
<p>Certains de nos fournisseurs peuvent traiter ou conserver des renseignements à l’extérieur du Québec, notamment aux États-Unis.</p>

<h2>7. Combien de temps nous les conservons</h2>
<p>Nous les conservons aussi longtemps que nécessaire pour les fins décrites ci-dessus et pour respecter nos obligations légales,
puis nous les détruisons ou les anonymisons.</p>

<h2>8. Vos droits</h2>
<p>Vous pouvez, en tout temps, demander à accéder à vos renseignements, à les faire rectifier, à en obtenir une copie dans un format
technologique structuré et couramment utilisé, à retirer votre consentement ou à demander que nous cessions de diffuser vos
renseignements. Écrivez au responsable (section 1) : nous répondons dans les 30 jours.</p>
<p>Si vous estimez que vos droits ne sont pas respectés, vous pouvez déposer une plainte auprès de la
<a href="https://www.cai.gouv.qc.ca/" rel="noopener">Commission d’accès à l’information du Québec</a>.</p>

<h2>9. Sécurité</h2>
<p>Nous prenons des mesures raisonnables pour protéger vos renseignements contre la perte, l’accès non autorisé et l’utilisation abusive.
Nous vous demandons de ne pas nous transmettre de numéro de carte, de mot de passe ou de numéro d’assurance sociale par le formulaire du site.</p>

<h2>10. Mises à jour</h2>
<p>Nous pouvons modifier cette politique. La date de la dernière mise à jour figure en haut de la page.</p>
""" % dict(resp=RESPONSABLE, mail=COURRIEL, tel=TELEPHONE)


def build():
    jour = ba.date_fr(datetime.date.today().isoformat())
    page = ("<!-- BROUILLON : à faire valider par un juriste avant la mise en production -->" +
      ba.head(TITRE + " | Kelto", RESUME, URL, "") + ba.header("confidentialite", "") +
      '<main id="main"><article class="article-page">'
      '<header class="article-head"><div class="container container-narrow">'
      '<h1>%s</h1><p class="article-meta">Dernière mise à jour : %s</p>'
      '</div></header>'
      '<div class="container container-narrow article-content">%s</div>'
      '</article></main>' % (TITRE, jour, CORPS)
      + ba.footer(""))
    open(os.path.join(ROOT, "confidentialite.html"), "w", encoding="utf-8").write(page)
    print("confidentialite.html écrit (%d octets)" % len(page.encode("utf-8")))


if __name__ == "__main__":
    build()
