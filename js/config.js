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
    tagline: "Jardinier paysagiste indépendant",
    description: "Entretien de jardins et d’espaces verts chez les particuliers."
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
     radiusKm : nombre (ex. 20) ou null pour masquer la mention du rayon.
     communes : liste des communes desservies ; [] pour masquer la liste. */
  zone: {
    city: "Pau",                               // Commune principale
    radiusKm: null,
    communes: ["Commune 1", "Commune 2", "Commune 3", "Commune 4", "Commune 5", "Commune 6"]
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

  /* Mode démonstration ----------------------------------------------
     true : affiche « Photo d’illustration » sur les photos de banque
     d’images et une note dans la section Réalisations.
     Passez à false une fois vos propres photos en place. */
  demo: {
    illustrationLabels: true
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
     Remplacez chaque valeur entre crochets par l’information réelle. */
  legal: {
    ownerName: "Axel Royer",
    status: "Entrepreneur individuel (EI)",
    address: "[Adresse postale]",
    siret: "[Numéro SIRET]",
    vat: "",                                    // N° de TVA intracommunautaire, ou "" si non applicable
    mediator: {
      name: "[Nom et coordonnées du médiateur de la consommation]",
      url: ""
    },
    host: {
      name: "GitHub, Inc.",
      address: "88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis",
      url: "https://github.com"
    }
  }
};
