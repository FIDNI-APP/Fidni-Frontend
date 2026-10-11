/**
 * Visites guidées : une par page (ou par état de page), déclenchées la première fois qu'on y arrive
 * et rejouables avec le bouton « ? » de la barre du haut.
 *
 * Chaque étape vise un élément marqué `data-tour="…"` dans la page. Une étape dont l'élément est
 * absent ou caché (visiteur non connecté, téléphone, onglet fermé…) est simplement sautée : on peut
 * donc décrire toute la page sans se soucier des cas particuliers. Sans `target`, la bulle s'affiche
 * au centre de l'écran.
 *
 * Lancement automatique (membre connecté seulement) : une version courte, `autoSteps` (3 étapes au
 * plus). La visite complète reste sur le bouton « ? ».
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
  /** Étape réservée à certains membres (ex. « Publier » pour les profs). */
  when?: (c: TourContext) => boolean;
}

export interface Tour {
  id: string;
  match: RegExp;
  /** `data-tour` qui doit être visible pour que la visite s'applique (état de la page). */
  requires: string;
  steps: TourStep[];
  /** false : seulement via le bouton « ? » (ex. pendant une épreuve chronométrée). */
  auto?: boolean;
  /**
   * Version courte jouée au lancement automatique : les cibles (`data-tour`) des étapes à garder, dans
   * l'ordre ; 3 étapes visibles au plus. Sans elle : les 3 premières étapes visibles.
   */
  autoSteps?: string[];
  version?: number;
}

export const resolveText = (t: Text, c: TourContext) => (typeof t === 'function' ? t(c) : t);

/** Cible principale d'une étape (la première de la liste). */
export const stepKey = (s: TourStep) => (Array.isArray(s.target) ? s.target[0] : s.target);

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
  body: "Un clic sous chaque question : Réussi ou À revoir (re-clique pour effacer). Fidni repère tes notions à retravailler.",
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
    version: 3, // menu du 10/10/2026 (Travailler / Mon suivi), barre d'onglets mobile, « Tes premiers pas »
    // Nouvel élève : « Tes premiers pas » d'abord (absent ensuite : l'étape est sautée).
    autoSteps: ['home-premiers-pas', 'home-reprendre', 'nav-suivi', 'barre-mobile', 'aide'],
    steps: [
      {
        title: 'Bienvenue sur Fidni',
        body: 'Un tour d’une minute pour trouver tes repères. Tu pourras le revoir à tout moment avec le bouton ?.',
      },
      { target: 'home-premiers-pas', title: 'Tes premiers pas', body: 'Pour bien démarrer : indique ton niveau, ouvre ton premier exercice, puis annonce ton prochain DS. Chaque pas se coche tout seul.' },
      { target: 'home-reprendre', title: 'Ton prochain pas', body: 'Ton prochain pas, en un clic : reprendre ce que tu as commencé, préparer ton DS quand il approche, ou commencer l’exercice proposé.' },
      { target: 'nav-travailler', title: 'Travailler', body: 'Leçons, exercices, devoirs (DS), sujets du Bac national et concours, rangés par niveau et par chapitre.' },
      { target: 'nav-suivi', title: 'Mon suivi', body: 'Ta progression, Réviser (ton prochain DS, ce que tu as raté et tes listes), les quiz par chapitre et tes enregistrements (favoris et cahiers).' },
      { target: 'nav-classe', title: 'Ta classe', body: (c) => (c.isTeacher ? 'Tes classes, leurs élèves et les TD que tu leur donnes.' : 'Les TD donnés par ton prof, dans sa classe.') },
      { target: 'barre-mobile', title: 'La barre du bas', body: 'Accueil, tes exercices, tes devoirs (DS) et Réviser, à portée de pouce. « Menu » ouvre tout le reste, dont ta progression.' },
      { target: 'menu-mobile', title: 'Le menu', body: 'Toutes les rubriques : leçons, exercices, devoirs, Bac national, concours, ton suivi et ton compte.' },
      { target: 'recherche', title: 'Rechercher', body: 'Un mot-clé, un chapitre ou un théorème (ex. « TVI ») pour trouver un contenu.' },
      { target: 'notifications', title: 'Notifications', body: 'Quand quelqu’un commente un contenu sur lequel tu as travaillé, ou répond à ton commentaire, la cloche te prévient. Un clic et tu peux lui répondre.' },
      { target: 'home-stats', title: 'Ta semaine', body: 'Ta semaine en une ligne : ta série, tes questions et ta réussite des 7 derniers jours. Touche-la pour le détail dans Ma progression.' },
      { target: 'home-reco', title: 'Pour toi', body: 'Des contenus choisis d’après ton niveau et ton travail : la suite de tes chapitres en cours, ce qui est à retravailler, des nouveautés. Ouvre une carte pour commencer.' },
      { target: 'nav-compte', title: 'Ton compte', body: 'Ton profil et tes paramètres.' },
      { target: 'aide', title: 'Un doute ?', body: 'Chaque page a son guide : touche ? pour le revoir en entier.' },
    ],
  },

  // ───────────────────────────────────────────── Listes : exercices, examens, leçons (et leurs pages de niveau)
  // Depuis le 10/10/2026, les rubriques s'ouvrent en dossiers (niveaux, chapitres, années du Bac) : la visite
  // ne se lance que dans un dossier ouvert, là où la liste et ses filtres (« liste-filtres ») sont affichés.
  {
    id: 'liste',
    match: /^\/(exercises|exams|lessons)(\/nationaux(\/[^/]+)?|\/niveau\/[^/]+(\/[^/]+)?)?\/?$/,
    requires: 'liste-filtres',
    version: 2, // « Publier » réservé aux profs, nouveaux mots du statut et du menu
    autoSteps: ['liste-filtres', 'liste-tri', 'liste-ouvrir'],
    steps: [
      { target: 'liste-filtres', title: 'Filtrer', body: 'Difficulté, statut (à faire, à revoir, réussis), théorème : ne garde que ce qui t’intéresse dans ce dossier.' },
      { target: 'liste-tri', title: 'Trier', body: '« Pour toi » met en tête ce qui te fera progresser. Tu peux aussi trier du plus facile au plus difficile, ou par nouveauté.' },
      { target: 'liste-vue', title: 'Deux affichages', body: 'Cartes : un aperçu de chaque contenu (le début de l’énoncé, les exercices d’un sujet, le sommaire d’une leçon). Énoncés : le texte complet, avec chrono et auto-évaluation.' },
      { target: 'liste-chrono', title: 'Chronomètre', body: 'Lance-le avant de commencer, puis enregistre ton temps pour suivre tes progrès.' },
      { target: 'liste-terminer', title: 'Terminé ?', body: (c) => `Marque ${le(c)} « Réussi » ou « À revoir » : ça alimente ta progression.` },
      { target: 'liste-revision', title: 'Liste de révision', body: 'Mets-le de côté dans une liste pour le retravailler ou l’imprimer.' },
      { target: 'favori', title: 'Favori', body: 'Enregistre-le : tu le retrouves dans Mon suivi › Mes enregistrements.' },
      SOLUTION,
      AUTO_EVAL,
      VOTE,
      { target: 'liste-ouvrir', title: 'Page complète', body: (c) => c.kind === 'lesson'
        ? 'Ouvre la leçon pour la lire en entier et poser tes questions.'
        : 'Ouvre-le pour travailler : solutions question par question, chrono, discussion et statistiques.' },
      { target: 'liste-creer', title: 'Publier', body: (c) => `Tu peux aussi partager ${un(c)} que tu as rédigé.`, when: (c) => c.isTeacher },
    ],
  },

  // ───────────────────────────────────────────── Exercice
  {
    id: 'exercice',
    match: /^\/exercises\/\d+\/?$/,
    requires: 'detail-onglets',
    autoSteps: ['solution', 'auto-eval', 'detail-terminer'],
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
      { target: 'detail-imprimer', title: 'Imprimer / PDF', body: 'Télécharge-le en PDF façon sujet d’examen, avec ou sans corrigé.' },
      { target: 'detail-plus', title: 'Plus d’options', body: 'Partager, ou signaler une erreur.' },
      VOTE,
      SIGNALER,
    ],
  },
  // ───────────────────────────────────────────── Examen (présenté comme un sujet)
  {
    id: 'examen',
    match: /^\/exams\/\d+\/?$/,
    requires: 'examen-fiche',
    autoSteps: ['examen-epreuve', 'solution', 'examen-copie'],
    steps: [
      { target: 'examen-fiche', title: 'Le sujet', body: 'Durée, barème, nombre d’exercices : comme la copie distribuée en classe.' },
      { target: 'examen-epreuve', title: 'L’épreuve', body: 'Lance le compte à rebours et compose sur une feuille : les solutions restent cachées jusqu’à la fin, et ton temps est enregistré.' },
      SOLUTION,
      AUTO_EVAL,
      { target: 'examen-copie', title: 'Ta copie', body: 'Évalue chaque question après l’épreuve : ta note estimée se calcule avec le barème, exercice par exercice.' },
      { target: 'detail-onglets', title: 'Les onglets', body: 'Solutions des élèves pour comparer ta démarche, Activité pour te situer. Les questions et la discussion sont en bas du sujet.' },
      { target: 'detail-terminer', title: 'Où en es-tu ?', body: 'Après l’épreuve : « Tout réussi » coche toutes les questions, puis décoche celles que tu as ratées. Ta note se calcule avec le barème.' },
      { target: 'detail-imprimer', title: 'Imprimer / PDF', body: 'Télécharge le sujet en PDF pour le faire sur papier.' },
      { target: 'detail-plus', title: 'Plus d’options', body: 'Partager, ou signaler une erreur.' },
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
    autoSteps: ['lecon-sommaire', 'detail-cahier', 'detail-discussion'],
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
    autoSteps: ['creer-classement', 'creer-blocs', 'creer-enregistrer'],
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
      { target: 'profil-onglets', title: 'Les onglets', body: 'Profil pour la vue d’ensemble, Réussis / à revoir pour tes exercices, Paramètres pour ton compte et tes données.' },
    ],
  },

  // ───────────────────────────────────────────── Mon suivi
  {
    id: 'cahiers',
    match: /^\/enregistrements\/?$/,
    requires: 'cahiers-nouveau',
    version: 2, // onglet Cahiers de Mes enregistrements (11/10/2026)
    steps: [
      { target: 'cahiers-nouveau', title: 'Nouveau cahier', body: 'Un cahier par matière et par niveau, prêt en un clic. Il se remplit avec les leçons que tu y ranges depuis leur page.' },
      { target: 'cahiers-liste', title: 'Tes cahiers', body: 'Ouvre-en un pour relire tes leçons, classées par chapitre. Le menu ⋯ : renommer, imprimer, supprimer.' },
    ],
  },
  {
    id: 'cahier-ouvert',
    match: /^\/notebooks\/?$/,
    requires: 'cahier-sections',
    version: 2,
    steps: [
      { target: 'cahier-sections', title: 'Les chapitres', body: 'Ceux qui ont des leçons d’abord. Un chapitre vide ? Touche-le pour trouver ses leçons ; sur sa page, « Ajouter à mon cahier ».' },
      { target: 'cahier-contenu', title: 'La lecture', body: 'Tes leçons s’affichent ici, comme dans un vrai cahier. Le menu ⋯ d’une leçon : ouvrir sa page ou la retirer du cahier.' },
      { target: 'cahier-annoter', title: 'Annoter', body: 'Surligne, écris une note ou dessine sur la feuille : c’est enregistré tout seul.' },
      { target: 'cahier-imprimer', title: 'Imprimer le cahier', body: 'Tout ton cahier en PDF, un chapitre par page.' },
    ],
  },
  {
    id: 'progression',
    match: /^\/progression\/?$/,
    requires: 'prog-resume',
    version: 2, // refonte du 11/10/2026 : « Ton prochain pas » en tête de page
    steps: [
      { target: 'prog-resume', title: 'Ton prochain pas', body: 'Le chapitre à travailler maintenant, choisi d’après tes réponses, et ce que tu as déjà fait cette semaine. Nouveau ici ? Commence par un exercice de ton niveau.' },
      { target: 'prog-carte', title: 'Ton programme', body: 'Tous tes chapitres, ceux à renforcer d’abord. Touche un chapitre : ce que tu réussis, ce qui reste à travailler et de quoi t’entraîner.' },
      { target: 'prog-activite', title: 'Ton activité', body: 'Ton temps de travail de la semaine et ton objectif (touche-le pour le changer), ou tout ce que tu as réussi depuis le début.' },
    ],
  },
  {
    id: 'revisions',
    match: /^\/reviser\/?$/,
    requires: 'revisions-ds',
    version: 4, // page « Réviser » du 11/10/2026 : prochain DS, à refaire, mes listes
    autoSteps: ['revisions-ds', 'revisions-suggestions', 'revisions-nouvelle'],
    steps: [
      { target: 'revisions-ds', title: 'Ton prochain DS', body: 'Annonce ton prochain DS (date, chapitres) : Fidni te prépare une révision ciblée — tes chapitres fragiles d’abord, des exercices choisis pour toi, un DS blanc chronométré — et te le rappelle sur l’accueil. Après le DS, note ta note.' },
      { target: 'revisions-suggestions', title: 'À refaire', body: 'Les exercices que tu as ratés ou marqués « À revoir », les plus anciens d’abord. Refais-en un, ou range-les tous dans une liste en un clic.' },
      { target: 'revisions-liste', title: 'Mes listes', body: 'Ouvre une liste pour refaire ses exercices à la suite ; la barre montre ce qui est réussi (vert) et ce qui reste à revoir (or).' },
      { target: 'revisions-nouvelle', title: 'Nouvelle liste', body: 'Regroupe des exercices à retravailler (ex. « Limites – DS 1 »). On en ajoute depuis leur page ou leur carte, bouton « Liste ».' },
    ],
  },
  {
    id: 'revision-liste',
    match: /^\/(profile\/)?revision-lists\/\d+\/?$/,
    requires: 'revision-pdf',
    version: 2, // « Mode révision » et « Feuille à imprimer »
    steps: [
      {
        target: 'revision-mode', title: 'Deux façons de réviser',
        body: 'Mode révision : un exercice à la fois, tu dis « Réussi » ou « À revoir », puis « Exercice suivant ». Feuille à imprimer : tous les énoncés, les solutions et le PDF.',
      },
      { target: 'revision-solutions', title: 'Solutions', body: 'Affiche ou masque toutes les solutions de la liste.' },
      { target: 'revision-pdf', title: 'Feuille de TD', body: 'Exporte la liste en PDF, avec ou sans corrigé, prête à imprimer.' },
      { target: 'revision-modifier', title: 'Modifier', body: 'Renomme la liste ou change sa description.' },
    ],
  },
  {
    id: 'favoris',
    match: /^\/enregistrements\/?$/,
    requires: 'favoris-liste',
    version: 2, // onglet Favoris de Mes enregistrements (11/10/2026)
    steps: [
      { target: 'enregistrements-onglets', title: 'Favoris et cahiers', body: 'Ce que tu as mis de côté : tes favoris (le signet) et tes cahiers de cours.' },
      { target: 'favoris-liste', title: 'Tes favoris', body: 'Rangés par type, avec où tu en es. Le signet vert les retire (tu peux annuler) ; une leçon se range dans ton cahier d’un clic.' },
      { target: 'favoris-recherche', title: 'Chercher', body: 'Retrouve un favori par son titre ou son chapitre.' },
    ],
  },
  {
    id: 'skilliq',
    match: /^\/skill-iq\/?$/,
    requires: 'skilliq-niveaux',
    version: 3, // nouvelle page : prochain quiz + quiz du niveau rangés par thème
    steps: [
      { target: 'skilliq-hero', title: 'Quiz par chapitre', body: 'Des quiz courts, un par chapitre, pour mesurer où tu en es. Refais-le plus tard : tu vois ta progression.' },
      { target: 'skilliq-niveaux', title: 'Tous tes quiz', body: 'Les quiz prêts de ton niveau, rangés par thème. Ton dernier score s’affiche à côté : refais-le plus tard pour voir ta progression.' },
    ],
  },

  // ───────────────────────────────────────────── Concours
  {
    id: 'concours',
    match: /^\/concours\/?$/,
    requires: 'concours-types',
    autoSteps: ['concours-types', 'concours-simulation', 'concours-annales'],
    steps: [
      { target: 'concours-types', title: 'Les écoles', body: 'L’ENSA, l’ENSAM et la médecine. Quand leurs annales sont en ligne, clique sur une école pour n’afficher que ses sujets.' },
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
    version: 3, // plus de classement entre élèves ; « Mes compétences » côté élève
    steps: [
      { target: 'classe-code', title: 'Le code de la classe', body: 'Partage-le pour inviter des élèves.', when: (c) => c.isTeacher },
      {
        target: 'classe-onglets', title: 'Les onglets',
        body: (c) => (c.isTeacher
          ? 'Élèves pour suivre leurs progrès, TD listes pour le travail que tu donnes, Matières pour les profs de la classe.'
          : 'TD listes : le travail donné par ton prof. Mes compétences : où tu en es, d’après ton travail sur Fidni (tes camarades ne la voient pas).'),
      },
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
