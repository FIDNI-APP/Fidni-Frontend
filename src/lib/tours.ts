/**
 * Visites guidées : une par page (ou par état de page), déclenchées la première fois qu'on y arrive
 * et rejouables avec le bouton « ? » de la barre du haut.
 *
 * Chaque étape vise un élément marqué `data-tour="…"` dans la page. Une étape dont l'élément est
 * absent ou caché (visiteur non connecté, téléphone, onglet fermé…) est simplement sautée : on peut
 * donc décrire toute la page sans se soucier des cas particuliers. Sans `target`, la bulle s'affiche
 * au centre de l'écran.
 *
 * Écriture : une phrase ou deux, tutoiement, ce que fait le bouton ET pourquoi s'en servir.
 * Modifier le texte d'une visite ne la remontre pas ; augmenter `version` si.
 */

export interface TourContext {
  kind: 'exercise' | 'exam' | 'lesson';
  isTeacher: boolean;
}

type Text = string | ((c: TourContext) => string);

export interface TourStep {
  /** Valeur(s) de `data-tour` ; la première visible est retenue. */
  target?: string | string[];
  title: Text;
  body: Text;
}

export interface Tour {
  id: string;
  match: RegExp;
  /** `data-tour` qui doit être visible pour que la visite s'applique (état de la page). */
  requires: string;
  steps: TourStep[];
  /** false : seulement via le bouton « ? » (ex. pendant une épreuve chronométrée). */
  auto?: boolean;
  version?: number;
}

export const resolveText = (t: Text, c: TourContext) => (typeof t === 'function' ? t(c) : t);

const le = (c: TourContext) => (c.kind === 'lesson' ? 'la leçon' : c.kind === 'exam' ? "l'examen" : "l'exercice");
const un = (c: TourContext) => (c.kind === 'lesson' ? 'une leçon' : c.kind === 'exam' ? 'un examen' : 'un exercice');

// Étapes communes aux listes et aux pages de contenu.
const SOLUTION: TourStep = {
  target: 'solution',
  title: 'Voir la solution',
  body: "Cherche d'abord, puis ouvre la solution question par question.",
};
const AUTO_EVAL: TourStep = {
  target: 'auto-eval',
  title: 'Auto-évaluation',
  body: "Un clic sous chaque question : Réussi, En partie ou À revoir (re-clique pour effacer). Fidni repère tes notions à retravailler.",
};
const VOTE: TourStep = {
  target: 'vote',
  title: 'J’aime',
  body: (c) => `${c.kind === 'lesson' ? 'Cette leçon t’a aidé' : 'Ce contenu t’a aidé'} ? Mets-lui un j’aime : les contenus aimés remontent dans les listes, ça guide les autres élèves.`,
};

const SIGNALER: TourStep = {
  target: 'signaler',
  title: 'Une erreur ?',
  body: 'Tu as repéré une erreur ? Signale-la ici en indiquant la question : on la corrige pour tout le monde.',
};

export const TOURS: Tour[] = [
  // ───────────────────────────────────────────── Accueil (tableau de bord)
  {
    id: 'accueil',
    match: /^\/$/,
    requires: 'home-accueil',
    steps: [
      {
        title: 'Bienvenue sur Fidni',
        body: 'Un tour d’une minute pour trouver tes repères. Tu pourras le revoir à tout moment avec le bouton ?.',
      },
      { target: 'nav-apprendre', title: 'Apprendre', body: 'Les leçons de ton programme, rangées par niveau et par chapitre.' },
      { target: 'nav-entrainer', title: 'S’entraîner', body: 'Exercices et examens corrigés, et les annales des concours en conditions réelles.' },
      { target: 'nav-espace', title: 'Mon espace', body: 'Tes outils perso : cahiers de cours, Skill IQ, listes de révision et favoris.' },
      { target: 'nav-classe', title: 'Ma classe', body: 'Rejoins la classe de ton prof avec son code pour suivre tes TD.' },
      { target: 'menu-mobile', title: 'Le menu', body: 'Toutes les rubriques : leçons, exercices, examens, concours et ton espace perso.' },
      { target: 'recherche', title: 'Rechercher', body: 'Un mot-clé, un chapitre ou un théorème (ex. « TVI ») pour trouver un contenu.' },
      { target: 'notifications', title: 'Notifications', body: 'Quand quelqu’un commente un contenu sur lequel tu as travaillé, ou répond à ton commentaire, la cloche te prévient. Un clic et tu peux lui répondre.' },
      { target: 'home-stats', title: 'Ta semaine', body: 'Ta série de jours, tes questions et ta réussite des 7 derniers jours. Le bilan sur l’année est dans Statistiques.' },
      { target: 'home-reco', title: 'Pour toi', body: 'Des contenus choisis pour ton niveau. Ouvre une carte pour commencer.' },
      { target: 'nav-compte', title: 'Ton compte', body: 'Ton profil, tes statistiques et tes paramètres.' },
      { target: 'aide', title: 'Un doute ?', body: 'Chaque page a son guide : clique sur ? pour le revoir.' },
    ],
  },

  // ───────────────────────────────────────────── Listes : exercices, examens, leçons
  {
    id: 'liste',
    match: /^\/(exercises|exams|lessons)\/?$/,
    requires: 'liste-filtres',
    steps: [
      { target: 'liste-filtres', title: 'Filtrer', body: 'Niveau, chapitre, théorème, difficulté : ne garde que ce qui t’intéresse.' },
      { target: 'liste-tri', title: 'Trier', body: 'Les plus récents, les mieux notés… choisis l’ordre d’affichage.' },
      { target: 'liste-vue', title: 'Deux affichages', body: 'Cartes : un aperçu de chaque contenu (le début de l’énoncé, les exercices d’un sujet, le sommaire d’une leçon). Énoncés : le texte complet, avec chrono et auto-évaluation.' },
      { target: 'liste-chrono', title: 'Chronomètre', body: 'Lance-le avant de commencer, puis enregistre ton temps pour suivre tes progrès.' },
      { target: 'liste-terminer', title: 'Terminé ?', body: (c) => `Marque ${le(c)} Validé ou Échoué : ça alimente tes statistiques.` },
      { target: 'liste-revision', title: 'Liste de révision', body: 'Mets-le de côté dans une liste pour le retravailler ou l’imprimer.' },
      { target: 'favori', title: 'Favori', body: 'Enregistre-le : tu le retrouves dans Mon espace › Favoris.' },
      SOLUTION,
      AUTO_EVAL,
      VOTE,
      { target: 'liste-ouvrir', title: 'Page complète', body: (c) => c.kind === 'lesson'
        ? 'Ouvre la leçon pour la lire en entier et poser tes questions.'
        : 'Chrono, discussions, solutions des autres élèves et statistiques : tout est sur la page du contenu.' },
      { target: 'liste-creer', title: 'Publier', body: (c) => `Tu peux aussi partager ${un(c)} que tu as rédigé.` },
    ],
  },

  // ───────────────────────────────────────────── Exercice
  {
    id: 'exercice',
    match: /^\/exercises\/\d+\/?$/,
    requires: 'detail-onglets',
    steps: [
      {
        target: 'detail-onglets',
        title: 'Les onglets',
        body: 'Solutions des élèves pour comparer ta démarche, Activité pour te situer. Les questions et la discussion sont en bas de l’exercice.',
      },
      { target: 'detail-solutions', title: 'Toutes les solutions', body: 'Affiche ou masque d’un coup la solution de chaque question.' },
      SOLUTION,
      AUTO_EVAL,
      { target: 'detail-progression', title: 'Ta progression', body: 'Elle se remplit à mesure que tu t’auto-évalues.' },
      { target: 'detail-chrono', title: 'Chronomètre', body: 'Démarre, fais une pause, puis enregistre : tu retrouves tous tes temps juste en dessous.' },
      { target: 'detail-terminer', title: 'Où en es-tu ?', body: (c) => `Tout bon ? « Tout réussi » coche toutes les questions d’un coup ; décoche ensuite celles que tu as ratées. Ou marque ${le(c)} « À revoir ».` },
      { target: 'detail-enregistrer', title: 'Enregistrer', body: 'Ajoute-le à tes favoris.' },
      { target: 'detail-liste', title: 'Liste de révision', body: 'Range-le dans une liste pour le réviser plus tard ou l’imprimer.' },
      { target: 'detail-plus', title: 'Plus d’options', body: 'Partager, ou télécharger en PDF façon sujet d’examen.' },
      VOTE,
      SIGNALER,
    ],
  },
  // ───────────────────────────────────────────── Examen (présenté comme un sujet)
  {
    id: 'examen',
    match: /^\/exams\/\d+\/?$/,
    requires: 'examen-fiche',
    steps: [
      { target: 'examen-fiche', title: 'Le sujet', body: 'Durée, barème, nombre d’exercices : comme la copie distribuée en classe.' },
      { target: 'examen-epreuve', title: 'L’épreuve', body: 'Lance le compte à rebours et compose sur une feuille : les solutions restent cachées jusqu’à la fin, et ton temps est enregistré.' },
      SOLUTION,
      AUTO_EVAL,
      { target: 'examen-copie', title: 'Ta copie', body: 'Évalue chaque question après l’épreuve : ta note estimée se calcule avec le barème, exercice par exercice.' },
      { target: 'detail-onglets', title: 'Les onglets', body: 'Solutions des élèves pour comparer ta démarche, Activité pour te situer. Les questions et la discussion sont en bas du sujet.' },
      { target: 'detail-terminer', title: 'Où en es-tu ?', body: 'Après l’épreuve : « Tout réussi » coche toutes les questions, puis décoche celles que tu as ratées. Ta note se calcule avec le barème.' },
      { target: 'detail-plus', title: 'Plus d’options', body: 'Partager, ou télécharger le sujet en PDF pour le faire sur papier.' },
      VOTE,
      SIGNALER,
    ],
  },
  {
    id: 'activite',
    match: /^\/(exercises|exams)\/\d+\/?$/,
    requires: 'activite-bilan',
    steps: [
      { target: 'activite-bilan', title: 'Ton bilan', body: 'Tes questions réussies, en partie et à revoir, à côté de la réussite des autres élèves.' },
      { target: 'activite-questions', title: 'Question par question', body: 'Une colonne par question : la part d’élèves qui la réussissent. Clique une colonne pour le détail, et pour revenir à la question.' },
      { target: 'activite-notions', title: 'Tes notions', body: 'Les plus faibles d’abord : c’est là qu’il faut retravailler.' },
    ],
  },

  // ───────────────────────────────────────────── Leçon
  {
    id: 'lecon',
    match: /^\/lessons\/\d+\/?$/,
    requires: 'lecon-contenu',
    steps: [
      { target: ['lecon-sommaire', 'lecon-sommaire-barre'], title: 'Le sommaire', body: 'Toutes les parties de la leçon : clique pour y aller. La partie en cours est surlignée et Fidni retient où tu t’es arrêté.' },
      { target: 'lecon-contenu', title: 'La leçon', body: 'Définitions, théorèmes, propriétés : chaque encadré annonce sa nature en en-tête.' },
      { target: 'detail-discussion', title: 'Une question ?', body: 'Pose tes questions sur la leçon ici, en bas de la page.' },
      { target: 'lecon-imprimer', title: 'Imprimer', body: 'Télécharge la leçon en PDF, mise en page comme un polycopié, pour la lire ou l’annoter sur papier.' },
      { target: 'detail-cahier', title: 'Cahier', body: 'Ajoute la leçon à ton cahier de cours : elle va directement dans son chapitre.' },
      { target: 'detail-enregistrer', title: 'Enregistrer', body: 'Ajoute-la à tes favoris.' },
      VOTE,
      SIGNALER,
    ],
  },

  // ───────────────────────────────────────────── Création / modification
  {
    id: 'creer',
    match: /^\/(exercises|exams|lessons)\/(new|\d+\/edit)\/?$/,
    requires: 'creer-titre',
    steps: [
      { target: 'creer-classement', title: 'Classement', body: 'Niveau, matière, chapitres, théorèmes : c’est ce qui permet aux élèves de trouver ton contenu.' },
      { target: 'creer-importer', title: 'Importer', body: 'Déjà rédigé ailleurs ? Importe un fichier JSON ou un PDF.' },
      { target: 'creer-titre', title: 'Le titre', body: 'Dis de quoi il s’agit (« Suite homographique ») plutôt que « Exercice 3 ».' },
      {
        target: 'creer-blocs',
        title: 'Le contenu',
        body: (c) => c.kind === 'lesson'
          ? 'Ajoute des sections, puis des encadrés (définition, théorème…). Les formules s’écrivent entre $…$.'
          : 'Un contexte, puis des questions avec sous-questions, solution et barème. Les formules s’écrivent entre $…$.',
      },
      { target: 'creer-apercu', title: 'Aperçu', body: 'Vérifie le rendu final à côté de l’éditeur.' },
      { target: 'creer-enregistrer', title: 'Publier', body: 'Enregistre : ton contenu est en ligne, et tu peux le modifier à tout moment.' },
    ],
  },

  // ───────────────────────────────────────────── Profil (le sien)
  {
    id: 'profil',
    match: /^\/profile\/[^/]+\/?$/,
    requires: 'profil-modifier',
    steps: [
      { target: 'profil-identite', title: 'Ton profil public', body: 'Ce que les autres voient : ton pseudo, ta présentation et tes publications. Ton nom, ta date de naissance et ton établissement restent privés.' },
      { target: 'profil-modifier', title: 'Modifier', body: 'Photo, présentation, identité, niveau et objectifs de notes.' },
      { target: 'profil-onglets', title: 'Les onglets', body: 'Bilan pour la vue d’ensemble, Statistiques et Progression pour le détail, Paramètres pour ton compte et tes données.' },
    ],
  },

  // ───────────────────────────────────────────── Mon espace
  {
    id: 'cahiers',
    match: /^\/notebooks\/?$/,
    requires: 'cahiers-nouveau',
    steps: [
      { target: 'cahiers-nouveau', title: 'Nouveau cahier', body: 'Un cahier par matière et par niveau, rempli avec les leçons que tu y ranges.' },
      { target: 'cahiers-liste', title: 'Tes cahiers', body: 'Ouvre-en un pour relire tes leçons, classées par chapitre.' },
    ],
  },
  {
    id: 'cahier-ouvert',
    match: /^\/notebooks\/?$/,
    requires: 'cahier-sections',
    steps: [
      { target: 'cahier-sections', title: 'Les chapitres', body: 'Choisis un chapitre pour lire ses leçons. Pour en ajouter une : bouton « Cahier » sur sa page.' },
      { target: 'cahier-contenu', title: 'La lecture', body: 'Tes leçons s’affichent ici, comme dans un vrai cahier.' },
      { target: 'cahier-imprimer', title: 'Imprimer le cahier', body: 'Tout ton cahier en PDF : un chapitre par page, avec tes notes si tu le souhaites.' },
    ],
  },
  {
    id: 'statistiques',
    match: /^\/statistiques\/?$/,
    requires: 'stats-filtres',
    steps: [
      { target: 'stats-filtres', title: 'Choisis la période', body: '7 jours, 30 jours, 3 mois… et, si tu en as plusieurs, la matière et le niveau : tout se recalcule.' },
      { target: 'stats-resultats', title: 'Tes résultats', body: 'Ta moyenne, ta meilleure et ta plus basse note aux examens que tu as corrigés, comparées à la période précédente.' },
      { target: 'stats-evolution', title: 'Ta progression', body: 'La courbe de tes notes d’examen, ou de ta réussite aux questions, au fil du temps.' },
      { target: 'stats-difficultes', title: 'Tes difficultés', body: 'Les notions que tu réussis le moins, avec un lien pour t’entraîner dessus.' },
      { target: 'stats-temps', title: 'Ton temps d’étude', body: 'Combien de temps tu travailles, et sur quels chapitres.' },
    ],
  },
  {
    id: 'revisions',
    match: /^\/revision-lists\/?$/,
    requires: 'revisions-nouvelle',
    steps: [
      { target: 'revisions-suggestions', title: 'À retravailler', body: 'Les exercices que tu as ratés et que tu n’as encore rangés nulle part : ajoute-les en un clic.' },
      { target: 'revisions-nouvelle', title: 'Nouvelle liste', body: 'Regroupe des exercices à retravailler (ex. « Limites – DS 1 »), avec un niveau, une matière et des chapitres si tu veux. On en ajoute depuis leur page ou leur carte, bouton « Liste ».' },
      { target: 'revisions-filtres', title: 'Filtrer', body: 'Retrouve tes listes par niveau, matière ou chapitre.' },
      { target: 'revisions-liste', title: 'Réviser', body: 'Ouvre une liste pour refaire ses exercices à la suite ; la barre montre ce qui est réussi et ce qui reste à revoir.' },
    ],
  },
  {
    id: 'revision-liste',
    match: /^\/(profile\/)?revision-lists\/\d+\/?$/,
    requires: 'revision-pdf',
    steps: [
      { target: 'revision-solutions', title: 'Solutions', body: 'Affiche ou masque toutes les solutions de la liste.' },
      { target: 'revision-pdf', title: 'Feuille de TD', body: 'Exporte la liste en PDF, avec ou sans corrigé, prête à imprimer.' },
      { target: 'revision-modifier', title: 'Modifier', body: 'Renomme la liste ou change sa description.' },
    ],
  },
  {
    id: 'favoris',
    match: /^\/saved\/?$/,
    requires: 'favoris-recherche',
    steps: [
      { target: 'favoris-recherche', title: 'Tes favoris', body: 'Tout ce que tu as enregistré avec le signet. Cherche-le ici par son titre.' },
      { target: 'favoris-filtres', title: 'Filtrer', body: 'N’affiche que les exercices, les leçons ou les examens.' },
    ],
  },
  {
    id: 'skilliq',
    match: /^\/skill-iq\/?$/,
    requires: 'skilliq-niveaux',
    steps: [
      { target: 'skilliq-hero', title: 'Skill IQ', body: 'Des quiz courts par chapitre pour mesurer où tu en es.' },
      { target: 'skilliq-niveaux', title: 'Choisis un chapitre', body: 'Ouvre ton niveau et ta matière, puis lance le quiz d’un chapitre. Ton score s’affiche à côté.' },
    ],
  },

  // ───────────────────────────────────────────── Concours
  {
    id: 'concours',
    match: /^\/concours\/?$/,
    requires: 'concours-types',
    steps: [
      { target: 'concours-types', title: 'Choisis ton concours', body: 'Clique sur un concours pour n’afficher que ses annales.' },
      { target: 'concours-simulation', title: 'Simulation', body: 'Un sujet en conditions réelles, chronométré : une annale ou un mix de questions de plusieurs années.' },
      { target: 'concours-filtres', title: 'Les années', body: 'Limite les annales à une période.' },
      { target: 'concours-annales', title: 'Les annales', body: 'Ouvre un sujet pour le réviser question par question, avec la correction.' },
      { target: 'concours-onglets', title: 'Historique et astuces', body: 'Retrouve tes simulations passées et des conseils de méthode.' },
    ],
  },
  {
    id: 'concours-sujet',
    match: /^\/concours\/exams\/\d+\/?$/,
    requires: 'concours-sujet-onglets',
    steps: [
      { target: 'concours-sujet-onglets', title: 'Les onglets', body: 'Navigation pour réviser, Statistiques du sujet, Activité pour tes résultats.' },
      { target: 'concours-reponse', title: 'La correction', body: 'Choisis ta réponse, puis révèle la correction et son explication.' },
    ],
  },
  {
    id: 'simulation',
    match: /^\/concours\/simulate\/[^/]+\/?$/,
    requires: 'simulation-chrono',
    auto: false, // l'épreuve est chronométrée : on ne l'interrompt pas
    steps: [
      { target: 'simulation-chrono', title: 'Le temps restant', body: 'À zéro, ta copie est rendue automatiquement.' },
      { target: 'simulation-grille', title: 'Les questions', body: 'Passe d’une question à l’autre ; celles déjà répondues sont marquées.' },
      { target: 'simulation-soumettre', title: 'Soumettre', body: 'Rends ta copie quand tu veux : tu obtiens ton score et la correction.' },
    ],
  },

  // ───────────────────────────────────────────── Classes
  {
    id: 'classes',
    match: /^\/classrooms\/?$/,
    requires: 'classes-actions',
    steps: [
      {
        target: 'classes-actions',
        title: (c) => (c.isTeacher ? 'Tes classes' : 'Rejoindre une classe'),
        body: (c) => (c.isTeacher
          ? 'Crée une classe, puis donne son code à tes élèves pour qu’ils la rejoignent.'
          : 'Entre le code donné par ton prof pour rejoindre sa classe.'),
      },
      { target: 'classes-liste', title: 'Tes classes', body: 'Ouvre une classe pour voir ses élèves et ses TD.' },
    ],
  },
  {
    id: 'classe',
    match: /^\/classrooms\/\d+\/?$/,
    requires: 'classe-onglets',
    steps: [
      { target: 'classe-code', title: 'Le code de la classe', body: 'Partage-le pour inviter des élèves.' },
      { target: 'classe-onglets', title: 'Les onglets', body: 'Élèves pour le classement et les progrès, TD listes pour le travail à faire.' },
    ],
  },

  // ───────────────────────────────────────────── Recherche, PDF
  {
    id: 'recherche',
    match: /^\/search\/?$/,
    requires: 'recherche-barre',
    steps: [
      { target: 'recherche-barre', title: 'Rechercher', body: 'Un mot-clé, un chapitre, un théorème… dans tous les contenus.' },
      { target: 'recherche-onglets', title: 'Affiner', body: 'Ne garde qu’un type de contenu.' },
    ],
  },
  {
    id: 'pdf',
    match: /\/pdf\/?$/,
    requires: 'pdf-telecharger',
    steps: [
      { target: 'pdf-personnaliser', title: 'Personnaliser', body: 'Titre, établissement, date, durée… pour une feuille qui ressemble à un vrai sujet.' },
      { target: 'pdf-corrige', title: 'Le corrigé', body: 'Sans corrigé, à la fin, ou sous chaque question.' },
      { target: 'pdf-telecharger', title: 'Télécharger', body: 'Récupère le PDF, prêt à imprimer.' },
    ],
  },
];
