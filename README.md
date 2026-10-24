# Site-Jardinnage

Site vitrine d’un jardinier paysagiste indépendant installé à Pau : tonte, taille de haies et d’arbustes, désherbage, débroussaillage, nettoyage et entretien de jardins chez les particuliers.

Le site est **100 % statique** : HTML, CSS et JavaScript, sans backend, sans base de données et sans étape de compilation. Il se publie tel quel sur GitHub Pages et fonctionne aussi en ouvrant directement `index.html`.

---

## Sommaire

1. [Structure des fichiers](#1-structure-des-fichiers)
2. [Personnaliser les informations](#2-personnaliser-les-informations)
3. [Check-list avant la mise en ligne](#3-check-list-avant-la-mise-en-ligne)
4. [Remplacer les visuels par vos photos](#4-remplacer-les-visuels-par-vos-photos)
5. [Le formulaire de devis](#5-le-formulaire-de-devis)
6. [Publier sur GitHub Pages](#6-publier-sur-github-pages)
7. [Tester en local](#7-tester-en-local)
8. [Référencement (SEO)](#8-référencement-seo)
9. [Accessibilité et animations](#9-accessibilité-et-animations)
10. [Licences et crédits](#10-licences-et-crédits)

---

## 1. Structure des fichiers

```text
/
├── index.html                 Page d’accueil (toutes les sections)
├── mentions-legales.html      Mentions légales (champs [À REMPLIR] dans config.js)
├── confidentialite.html       Politique de confidentialité
├── 404.html                   Page « introuvable » (servie automatiquement par GitHub Pages)
├── robots.txt
├── sitemap.xml                Plan du site pour les moteurs de recherche
├── css/
│   └── style.css              Design (couleurs, typographie, composants, animations)
├── js/
│   ├── config.js              ← TOUTES les informations du professionnel
│   ├── main.js                Comportements (menu, animations, formulaire, données structurées…)
│   └── vendor/                GSAP et Lenis hébergés avec le site (+ LICENSES.md)
├── assets/
│   ├── fonts/                 Polices Fraunces et Instrument Sans (+ OFL.txt)
│   └── images/                Illustrations SVG, image de partage, favicon
└── README.md
```

Aucune ressource n’est chargée depuis un service externe : polices, bibliothèques et illustrations sont dans le dépôt.

---

## 2. Personnaliser les informations

Ouvrez **`js/config.js`** et remplacez les valeurs entre guillemets. Le site se met à jour partout automatiquement (en-tête, sections, pied de page, pages légales, e-mail du formulaire).

| Champ | Rôle | Exemple |
|---|---|---|
| `business.name` | Nom de l’activité (logo, pied de page, e-mails) | `"Jardins Martin"` |
| `business.description` | Description courte (données structurées) | |
| `person.firstName` | Prénom (« Appeler… », formule d'appel de l'e-mail de devis) | `"Julien"` |
| `contact.phone` | Téléphone, format libre | `"06 12 34 56 78"` |
| `contact.email` | Adresse qui reçoit les demandes de devis | `"contact@jardins-martin.fr"` |
| `zone.city` | Commune principale | `"Pau"` |
| `zone.communes` | Communes desservies (section Contact et données structurées) ; `[]` pour masquer | `["Billère", "Lons"]` |
| `hours` | Horaires, une ligne par entrée ; `[]` pour masquer | `[{ days: "Lundi – vendredi", time: "8 h – 18 h" }]` |
| `social.*` | Liens Instagram, Facebook, LinkedIn, fiche Google ; `""` pour masquer | `"https://www.instagram.com/…"` |
| `seo.structuredData` | Ajoute les données structurées Google (LocalBusiness) | `false` puis `true` |
| `seo.siteUrl` | Adresse publique du site | `"https://hugoerb.github.io/Site-Jardinnage/"` |
| `legal.*` | Mentions légales : exploitant, adresse, SIRET, immatriculation, TVA, assurance, déclaration Services à la personne, médiateur, hébergeur, date de mise à jour | |

Les valeurs entre crochets (par exemple `[À REMPLIR : numéro SIRET]`) sont **surlignées en vert** sur le site tant qu’elles ne sont pas remplacées. Pour `legal.registration`, `legal.vat`, `legal.insurance` et `legal.sap`, la valeur `""` masque la ligne.

> Les communes de `zone.communes` sont aussi écrites en dur dans `index.html` (FAQ, pied de page, liste affichée sans JavaScript) et dans la `meta description` : modifiez-les aussi à ces endroits.

> Le numéro de téléphone fourni (`06 39 98 00 00`) appartient à une plage réservée aux œuvres de fiction : il ne correspond à personne. Remplacez-le avant la mise en ligne.

---

## 3. Check-list avant la mise en ligne

- [ ] `js/config.js` : nom, prénom, téléphone, e-mail, communes desservies, horaires, réseaux sociaux.
- [ ] `js/config.js` → `legal` : remplacer chaque `[À REMPLIR …]` (adresse, SIRET, immatriculation, TVA, assurance, Services à la personne) et renseigner le **médiateur de la consommation** (obligatoire pour une activité auprès des particuliers).
- [ ] `index.html`, FAQ « crédit d’impôt » : remplacer la mention `[À REMPLIR …]` selon que l’activité est déclarée Services à la personne ou non.
- [ ] `confidentialite.html` : vérifier que les durées de conservation correspondent à votre pratique.
- [ ] `index.html`, `mentions-legales.html`, `confidentialite.html` : vérifier le `<title>`, la `meta description` et les balises `og:*` / `twitter:*` (nom de l’activité, communes).
- [ ] Remplacer les illustrations par de vraies photos (section 4).
- [ ] Une fois les informations réelles en place : `seo.structuredData: true`.
- [ ] Domaine personnalisé : adapter `seo.siteUrl`, les balises `canonical`, `og:url`, `og:image` et `twitter:image` de `index.html`, ainsi que `robots.txt` et `sitemap.xml`.

---

## 4. Remplacer les visuels par vos photos

Les visuels actuels sont des **illustrations originales** (fichiers SVG dans `assets/images/`). Ils évitent de présenter de faux chantiers ou de fausses personnes. Remplacez-les par vos propres photos dès que possible.

**Préparer une photo** (format WebP, léger) avec [ImageMagick](https://imagemagick.org) ou [Squoosh](https://squoosh.app) :

```bash
magick ma-photo.jpg -resize 1600x -quality 72 assets/images/ma-photo.webp
```

Puis, dans `index.html`, remplacez le `src` de l’image concernée et adaptez son texte alternatif `alt` (description de la photo).

| Emplacement | Fichier actuel | Format conseillé |
|---|---|---|
| Hero (grande image d’accueil) | `hero/hero-1-ciel.svg` … `hero-4-premier-plan.svg` (4 calques) | Une photo paysage 1920 × 1080 : remplacez les 4 `<img class="hero__plane">` par une seule (gardez la classe `hero__plane`) |
| Cartes des prestations (×6) | `illus-service-*.svg` | Portrait 800 × 1000 |
| À propos | Scène animée (tondeuse, cisaille, sécateur) dessinée en SVG directement dans `index.html` | **Votre photo**, portrait 1080 × 1350 : remplacez le `<svg>` et le bouton pause de la `<figure class="about__scene">` par une `<img>` |
| Image de partage (réseaux sociaux) | `og-image.jpg` | 1200 × 630, JPEG |

Conseils : photographiez avant et après chaque chantier depuis le même endroit, en lumière naturelle, sans personne reconnaissable sans son accord.

---

## 5. Le formulaire de devis

Le site n’a pas de serveur : le formulaire **n’envoie rien lui-même**. Quand le visiteur clique sur « Préparer l’e-mail », sa messagerie s’ouvre avec un e-mail pré-rempli (objet, message, coordonnées, prestation choisie) adressé à `contact.email`. La demande n’est transmise que lorsqu’il clique sur « Envoyer » dans sa messagerie, et le site le lui indique clairement.

- Les champs Nom, E-mail et Message sont vérifiés avant l’ouverture de la messagerie.
- Si aucune messagerie ne s’ouvre (ordinateur sans logiciel de messagerie configuré), le visiteur peut **copier sa demande** en un clic ou appeler directement.
- Aucune donnée ne transite par un service tiers.

---

## 6. Publier sur GitHub Pages

1. Envoyez les fichiers sur la branche `main` du dépôt.
2. Sur GitHub : **Settings → Pages → Build and deployment → Source : Deploy from a branch**, branche `main`, dossier `/ (root)`.
3. Après une à deux minutes, le site est disponible à l’adresse `https://hugoerb.github.io/Site-Jardinnage/`.

Tous les chemins sont relatifs : le site fonctionne dans un sous-dossier comme sur un domaine personnalisé. Pour un **domaine personnalisé**, renseignez-le dans Settings → Pages (GitHub crée le fichier `CNAME`), puis mettez à jour `seo.siteUrl` et les balises `canonical` / `og:*` de `index.html`.

> Exception : `404.html` utilise des chemins absolus (`/Site-Jardinnage/…`), car GitHub Pages la sert à l’adresse demandée, parfois dans un sous-dossier inexistant. Avec un domaine personnalisé, remplacez `/Site-Jardinnage/` par `/` dans ce fichier.

> Sur une adresse de type `utilisateur.github.io/depot/`, les moteurs de recherche ne lisent pas le `robots.txt` du dépôt (il doit se trouver à la racine du domaine) : déclarez directement `sitemap.xml` dans la Google Search Console. Avec un domaine personnalisé, `robots.txt` et `sitemap.xml` sont lus automatiquement.

---

## 7. Tester en local

- Double-cliquez sur `index.html` : le site s’ouvre dans le navigateur. (La console peut signaler que le préchargement des polices est bloqué en ouverture directe : c’est une restriction normale du navigateur, sans effet sur l’affichage.)
- Ou, pour un test au plus près de la mise en ligne, lancez un petit serveur depuis le dossier du projet :

```bash
python -m http.server 8080
```

puis ouvrez `http://localhost:8080`.

---

## 8. Référencement (SEO)

- Titre, description, balises Open Graph / Twitter et URL canonique dans le `<head>` de `index.html`. Les pages légales et la page 404 sont en `noindex`.
- Un seul `<h1>` par page, avec le métier et la ville ; les communes desservies apparaissent en clair (Contact, FAQ, pied de page).
- Section « Questions fréquentes » : contenu pensé pour les recherches courantes (devis, période de taille, déchets verts, crédit d’impôt).
- Données structurées `LocalBusiness` + `WebSite` (schema.org), générées par `js/main.js` à partir de `config.js` quand `seo.structuredData` vaut `true`. Les valeurs encore `[À REMPLIR]` sont ignorées. Vérifiez le résultat avec le [test des résultats enrichis](https://search.google.com/test/rich-results).
- Aucune ressource externe, polices préchargées, images dimensionnées et chargées à la demande : le site reste léger et rapide.
- Après la mise en ligne : créez une **fiche Google Business Profile** (levier n° 1 du référencement local), puis renseignez son lien dans `social.google`.

---

## 9. Accessibilité et animations

- Navigation complète au clavier, focus visibles, lien « Aller au contenu ».
- Menu mobile accessible : focus piégé tant qu’il est ouvert, fermeture avec Échap.
- Questions fréquentes en `<details>` natifs, utilisables au clavier.
- Si le visiteur a demandé à limiter les animations (réglage « Réduire les animations » du système), le site s’affiche sans animation ni défilement doux.
- La scène animée de la section « À propos » tourne en boucle uniquement quand elle est à l’écran, et un bouton permet de la mettre en pause. Sans animation, elle s’affiche figée sur le jardin entretenu.
- Sans JavaScript, tout le contenu reste lisible.

---

## 10. Licences et crédits

- **Illustrations** : créations originales réalisées pour ce site.
- **Polices** : Fraunces et Instrument Sans, SIL Open Font License 1.1 (`assets/fonts/OFL.txt`).
- **Icônes** : Lucide (ISC).
- **Bibliothèques** : GSAP 3.15 (licence standard GSAP, gratuite), Lenis 1.3 (MIT). Détails dans `js/vendor/LICENSES.md`.
