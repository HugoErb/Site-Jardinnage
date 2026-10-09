/* =====================================================================
   CONFIGURATION DU SITE
   ---------------------------------------------------------------------
   Toutes les informations du professionnel sont réunies ici.
   Modifiez uniquement les valeurs entre guillemets, puis enregistrez.
   Les valeurs actuelles sont des EXEMPLES À REMPLACER avant la mise
   en ligne (voir la check-list du README).
   ===================================================================== */

window.SITE_CONFIG = {
  /* Activité ------------------------------------------------------- */
  business: {
    name: "Axel Royer",                 // Ex. « Jardins Martin » (logo, pied de page, e-mails)
    description: "Jardinier paysagiste indépendant à Pau : tonte, taille de haies et d’arbustes, désherbage, débroussaillage, nettoyage et entretien régulier de jardins chez les particuliers."
  },

  /* Le professionnel ----------------------------------------------- */
  person: {
    firstName: "Axel"                           // Utilisé dans « Bonjour, je suis… » et « Appeler… »
  },

  /* Coordonnées ----------------------------------------------------
     Le numéro ci-dessous appartient à une plage réservée aux œuvres
     de fiction : il ne correspond à personne. À REMPLACER. */
  contact: {
    phone: "06 39 98 00 00",                    // Format libre, ex. "06 12 34 56 78"
    email: "contact@example.com"                // À REMPLACER
  },

  /* Zone d’intervention ---------------------------------------------
     communes : communes desservies, affichées dans la section Contact
     et reprises dans les données structurées ; [] pour masquer. */
  zone: {
    city: "Pau",                               // Commune principale
    communes: ["Billère", "Lons", "Lescar", "Jurançon", "Gelos", "Bizanos", "Idron", "Lée", "Mazères-Lezons", "Gan"]
  },

  /* Horaires : une ligne par entrée ; [] pour masquer le bloc. */
  hours: [
    { days: "Jours et horaires", time: "à compléter" }
  ],

  /* Réseaux sociaux : collez l’adresse complète (https://…) ;
     laissez "" pour masquer le lien correspondant. */
  social: {
    instagram: "",
    facebook: "",
    linkedin: "",
    google: ""                                  // Fiche Google Business Profile
  },

  /* Référencement ----------------------------------------------------
     structuredData : passez à true une fois les informations réelles
     renseignées (ajoute les données structurées LocalBusiness).
     siteUrl : adresse publique du site (à adapter si domaine personnalisé). */
  seo: {
    structuredData: false,
    siteUrl: "https://hugoerb.github.io/Site-Jardinnage/"
  },

  /* Mentions légales (pages mentions-legales.html et confidentialite.html)
     Remplacez chaque valeur entre crochets par l’information réelle :
     elles restent surlignées en vert sur le site tant qu’elles ne le
     sont pas. Une valeur "" masque la ligne correspondante. */
  legal: {
    ownerName: "Axel Royer",
    status: "Entrepreneur individuel (EI)",
    address: "[À REMPLIR : adresse postale]",
    siret: "[À REMPLIR : numéro SIRET]",
    registration: "[À REMPLIR : immatriculation, ex. « Registre national des entreprises (RNE) »]",
    vat: "[À REMPLIR : n° de TVA intracommunautaire, ou « TVA non applicable, art. 293 B du CGI » en micro-entreprise]",
    insurance: "[À REMPLIR : assureur responsabilité civile professionnelle et zone couverte, ou \"\" si aucune]",
    sap: "[À REMPLIR : n° de déclaration Services à la personne, ou \"\" si non déclaré]",
    mediator: {
      name: "[À REMPLIR : nom et coordonnées du médiateur de la consommation]",
      url: ""
    },
    host: {
      name: "GitHub, Inc.",
      address: "88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis",
      phone: "+1 877 448 4820",
      url: "https://github.com"
    },
    updated: "9 octobre 2026"                   // Date de dernière mise à jour des pages légales
  }
};
