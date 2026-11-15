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

import { t } from '@/i18n';

export interface TourContext {
  kind: 'exercise' | 'exam' | 'lesson';
  isTeacher: boolean;
  /** Peut publier un contenu (l'équipe seulement pour l'instant, lib/features canCreateContent). */
  canCreate: boolean;
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

/** Texte d'une étape, traduit (appelé au rendu : les textes ci-dessous restent en français, clés de src/i18n/ar/visites.json). */
export const resolveText = (txt: Text, c: TourContext) => t(typeof txt === 'function' ? txt(c) : txt);

/** Cible principale d'une étape (la première de la liste). */
export const stepKey = (s: TourStep) => (Array.isArray(s.target) ? s.target[0] : s.target);

/** Phrase entière selon le type de contenu (une clé de traduction par phrase, pas de morceaux collés). */
const parType = (c: TourContext, lecon: string, examen: string, exercice: string) =>
  c.kind === 'lesson' ? lecon : c.kind === 'exam' ? examen : exercice;

// Étapes communes aux listes et aux pages de contenu.
const INDICATION: TourStep = {
  target: 'indication',
  title: 'Indication',
  body: "Bloqué ? L'indication te donne la méthode, sans le calcul. La solution complète reste à côté.",
};
const SOLUTION: TourStep = {
  target: 'solution',
  title: 'Voir la solution',
  body: "Cherche d'abord, puis ouvre la solution question par question.",
};
const AUTO_EVAL: TourStep = {
  target: 'auto-eval',
  title: 'Tu avais trouvé ?',
  body: "Sous chaque solution ouverte : Réussi ou À revoir (re-clique pour effacer). Fidni repère ce que tu dois retravailler.",
};
const VOTE: TourStep = {
  target: 'vote',
  title: 'J’aime',
  body: (c) => (c.kind === 'lesson'
    ? 'Cette leçon t’a aidé ? Mets-lui un j’aime : les contenus aimés remontent dans les listes, ça guide les autres élèves.'
    : 'Ce contenu t’a aidé ? Mets-lui un j’aime : les contenus aimés remontent dans les listes, ça guide les autres élèves.'),
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
      { target: 'home-premiers-pas', title: 'Tes premiers pas', body: 'Trois étapes pour bien démarrer. Elles se cochent toutes seules.' },
      { target: 'home-reprendre', title: 'Ton prochain pas', body: 'Ce que tu peux faire maintenant, en un clic.' },
      { target: 'nav-travailler', title: 'Travailler', body: 'Leçons, exercices, devoirs (DS), sujets du Bac national et concours, rangés par niveau et par chapitre.' },
      { target: 'nav-suivi', title: 'Mon suivi', body: 'Ta progression, Réviser, les quiz et tes enregistrements.' },
      { target: 'nav-classe', title: 'Ta classe', body: (c) => (c.isTeacher ? 'Tes classes, leurs élèves et les TD que tu leur donnes.' : 'Les TD donnés par ton prof, dans sa classe.') },
      { target: 'barre-mobile', title: 'La barre du bas', body: 'Les pages principales. « Menu » ouvre le reste.' },
      { target: 'menu-mobile', title: 'Le menu', body: 'Toutes les rubriques : leçons, exercices, devoirs, Bac national, concours, ton suivi et ton compte.' },
      { target: 'recherche', title: 'Rechercher', body: 'Un mot-clé, un chapitre ou un théorème (ex. « TVI ») pour trouver un contenu.' },
      { target: 'notifications', title: 'Notifications', body: 'La cloche te prévient quand quelqu’un te répond.' },
      { target: 'home-defi', title: 'Le défi du jour', body: 'Un problème par jour. Bloqué ? Prends un indice.' },
      { target: 'home-stats', title: 'Où j’en suis', body: 'Ton niveau et ton évolution sur 30 jours. Le détail est dans Ma progression.' },
      { target: 'home-reco', title: 'Pour toi', body: 'Des exercices choisis pour toi, d’après ton niveau et ton travail.' },
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
    version: 3, // cartes et barre de filtres allégées (11/10/2026) : statut en onglets visibles
    autoSteps: ['liste-filtres', 'liste-tri', 'liste-ouvrir'],
    steps: [
      { target: 'liste-statut', title: 'Où tu en es', body: 'Tout, à faire, à revoir ou réussis : un toucher et la liste ne garde que ceux-là.' },
      { target: 'liste-filtres', title: 'Filtrer', body: 'Difficulté, théorème (et niveau ou chapitre hors d’un dossier) : ne garde que ce qui t’intéresse.' },
      { target: 'liste-tri', title: 'Trier', body: '« Pour toi » met en tête ce qui t’aide le plus.' },
      { target: 'liste-vue', title: 'Deux affichages', body: 'Cartes : un aperçu. Énoncés : le texte complet.' },
      { target: 'liste-chrono', title: 'Chronomètre', body: 'Lance-le avant de commencer, puis enregistre ton temps pour suivre tes progrès.' },
      { target: 'liste-terminer', title: 'Terminé ?', body: (c) => parType(c,
        'Marque la leçon « Réussi » ou « À revoir » : ça alimente ta progression.',
        'Marque l’examen « Réussi » ou « À revoir » : ça alimente ta progression.',
        'Marque l’exercice « Réussi » ou « À revoir » : ça alimente ta progression.') },
      { target: 'liste-revision', title: 'Liste de révision', body: 'Mets-le de côté dans une liste pour le retravailler ou l’imprimer.' },
      { target: 'favori', title: 'Favori', body: 'Enregistre-le : tu le retrouves dans Mon suivi › Mes enregistrements.' },
      SOLUTION,
      AUTO_EVAL,
      VOTE,
      { target: 'liste-ouvrir', title: 'Page complète', body: (c) => c.kind === 'lesson'
        ? 'Ouvre la leçon pour la lire en entier et la commenter.'
        : 'Ouvre-le pour travailler : solutions question par question, chrono, commentaires et statistiques.' },
      { target: 'liste-fiche', title: 'Série d’exercices', body: 'Choisis des exercices avec « + Série » pour en faire une série à imprimer.' },
      { target: 'liste-creer', title: 'Publier', body: (c) => parType(c,
        'Tu peux aussi partager une leçon que tu as rédigé.',
        'Tu peux aussi partager un examen que tu as rédigé.',
        'Tu peux aussi partager un exercice que tu as rédigé.'), when: (c) => c.canCreate },
    ],
  },

  // ───────────────────────────────────────────── Exercice
  {
    id: 'exercice',
    match: /^\/exercises\/\d+\/?$/,
    requires: 'detail-onglets',
    version: 5, // 15/10/2026 : réussite de la classe à côté de chaque question (plus d'onglet Activité)
    autoSteps: ['indication', 'solution', 'reussite', 'detail-solutions', 'detail-terminer'],
    steps: [
      {
        target: 'detail-onglets',
        title: 'Les onglets',
        body: 'Solutions des élèves pour comparer ta démarche. Commentaires pour écrire sous l’exercice.',
      },
      { target: 'detail-terminer', title: 'Où en es-tu ?', body: (c) => parType(c,
        'En haut de la page (et rappelé en bas) : « Tout réussi » coche toutes les questions d’un coup ; décoche ensuite celles que tu as ratées. Ou marque la leçon « À revoir ».',
        'En haut de la page (et rappelé en bas) : « Tout réussi » coche toutes les questions d’un coup ; décoche ensuite celles que tu as ratées. Ou marque l’examen « À revoir ».',
        'En haut de la page (et rappelé en bas) : « Tout réussi » coche toutes les questions d’un coup ; décoche ensuite celles que tu as ratées. Ou marque l’exercice « À revoir ».') },
      { target: 'detail-progression', title: 'Ta progression', body: 'En vert tes questions réussies, en or celles à revoir.' },
      { target: 'detail-solutions', title: 'Toutes les solutions', body: 'Affiche ou masque d’un coup la solution de chaque question.' },
      INDICATION,
      SOLUTION,
      AUTO_EVAL,
      { target: 'reussite', title: 'Réussite des élèves par question', body: 'La part d’élèves qui réussissent chaque question. La pastille, c’est toi.' },
      { target: 'detail-chrono', title: 'Chronomètre', body: 'Lance le chrono quand tu commences ; en pause, ✓ enregistre ton temps. Tes temps sont dans le menu ⋯.' },
      { target: 'detail-enregistrer', title: 'Enregistrer', body: 'Ajoute-le à tes favoris.' },
      { target: 'detail-liste', title: 'Liste de révision', body: 'En bas de la page (ou dans le menu ⋯) : range-le dans une liste pour le réviser plus tard ou l’imprimer.' },
      { target: 'detail-imprimer', title: 'Imprimer / PDF', body: 'Télécharge-le en PDF façon sujet d’examen, avec ou sans corrigé.' },
      { target: 'detail-plus', title: 'Plus d’options', body: 'Partager, ranger dans une liste de révision, revoir tes temps, ou signaler une erreur.' },
      VOTE,
      SIGNALER,
    ],
  },
  // ───────────────────────────────────────────── Examen (présenté comme un sujet)
  {
    id: 'examen',
    match: /^\/exams\/\d+\/?$/,
    requires: 'examen-fiche',
    version: 5, // 15/10/2026 : réussite de la classe à côté de chaque question (plus d'onglet Activité)
    autoSteps: ['examen-epreuve', 'indication', 'solution', 'examen-copie'],
    steps: [
      { target: 'examen-fiche', title: 'Le sujet', body: 'Durée, barème, nombre d’exercices : comme la copie distribuée en classe.' },
      { target: 'examen-epreuve', title: 'L’épreuve', body: 'Lance le chrono et compose sur une feuille. Les solutions restent cachées jusqu’à la fin.' },
      INDICATION,
      SOLUTION,
      AUTO_EVAL,
      { target: 'examen-copie', title: 'Ta copie', body: 'Après l’épreuve, coche tes questions réussies : ta note se calcule toute seule.' },
      { target: 'detail-onglets', title: 'Les onglets', body: 'Solutions des élèves pour comparer ta démarche. Commentaires pour écrire sous le sujet.' },
      { target: 'detail-terminer', title: 'Où en es-tu ?', body: '« Tout réussi » coche tout : décoche ensuite ce que tu as raté.' },
      { target: 'detail-imprimer', title: 'Imprimer / PDF', body: 'Télécharge le sujet en PDF pour le faire sur papier.' },
      { target: 'detail-plus', title: 'Plus d’options', body: 'Partager, ranger dans une liste de révision, revoir tes passages, ou signaler une erreur.' },
      VOTE,
      SIGNALER,
    ],
  },

  // ───────────────────────────────────────────── Leçon
  {
    id: 'lecon',
    match: /^\/lessons\/\d+\/?$/,
    requires: 'lecon-contenu',
    version: 3, // 11/10/2026 : police et encadrés de la leçon imprimée, « Marquer comme lue » en haut
    autoSteps: ['lecon-sommaire', 'detail-cahier', 'detail-discussion'],
    steps: [
      { target: ['lecon-sommaire', 'lecon-sommaire-barre'], title: 'Le sommaire', body: 'Clique sur une partie pour y aller.' },
      { target: 'detail-terminer', title: 'Leçon lue', body: 'En haut de la page (et rappelé en bas) : marque-la comme lue, elle compte dans ta progression.' },
      { target: 'lecon-contenu', title: 'La leçon', body: 'Définitions, théorèmes et propriétés sont encadrés.' },
      { target: 'detail-discussion', title: 'Une question ?', body: 'Pose tes questions sur la leçon ici, en bas de la page.' },
      { target: 'lecon-imprimer', title: 'Imprimer', body: 'Télécharge la leçon en PDF, mise en page comme un polycopié, pour la lire ou l’annoter sur papier.' },
      { target: 'detail-cahier', title: 'Cahier', body: 'En bas de la leçon (ou dans le menu ⋯) : ajoute-la à ton cahier de cours, directement dans son chapitre.' },
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
    version: 2, // 11/10/2026 : assistant en 3 étapes (le contenu, écrire, vérifier et publier)
    autoSteps: ['creer-titre', 'creer-classement', 'creer-blocs', 'creer-enregistrer'],
    steps: [
      { target: 'creer-titre', title: 'Le titre', body: 'Dis de quoi il s’agit (« Suite homographique ») plutôt que « Exercice 3 ».' },
      { target: 'creer-classement', title: 'Niveau et chapitre', body: 'C’est ce qui permet aux élèves de trouver ton contenu. La matière et le domaine se déduisent du chapitre.' },
      {
        target: 'creer-blocs',
        title: 'Écrire',
        body: (c) => c.kind === 'lesson'
          ? 'Une partie à la fois ; « Encarts » ajoute définitions et théorèmes. Les formules s’écrivent entre $…$.'
          : 'Une carte par question : l’énoncé, puis, si tu veux, une indication, la solution, le barème ou des sous-questions.',
      },
      { target: 'creer-importer', title: 'Importer', body: 'Déjà rédigé ailleurs ? Importe un fichier JSON ou un PDF.' },
      { target: 'creer-apercu', title: 'Aperçu', body: 'Le rendu tel que les élèves le verront.' },
      { target: 'creer-enregistrer', title: 'Publier', body: 'Ton contenu est en ligne, et tu peux le modifier à tout moment.' },
    ],
  },

  // ───────────────────────────────────────────── Profil (le sien)
  {
    id: 'profil',
    match: /^\/profile\/[^/]+\/?$/,
    requires: 'profil-modifier',
    steps: [
      { target: 'profil-identite', title: 'Ton profil public', body: 'Ce que les autres membres voient de toi. Ta date de naissance et ton établissement restent privés.' },
      { target: 'profil-modifier', title: 'Modifier', body: 'Photo, présentation, identité, niveau et objectifs de notes.' },
      { target: 'profil-onglets', title: 'Les onglets', body: 'Ton profil, tes exercices et tes paramètres.' },
    ],
  },

  // ───────────────────────────────────────────── Mon suivi
  {
    id: 'cahiers',
    match: /^\/enregistrements\/?$/,
    requires: 'cahiers-nouveau',
    version: 2, // onglet Cahiers de Mes enregistrements (11/10/2026)
    steps: [
      { target: 'cahiers-nouveau', title: 'Nouveau cahier', body: 'Un cahier par matière et par niveau, avec tes leçons.' },
      { target: 'cahiers-liste', title: 'Tes cahiers', body: 'Ouvre-en un pour relire tes leçons, classées par chapitre. Le menu ⋯ : renommer, imprimer, supprimer.' },
    ],
  },
  {
    id: 'cahier-ouvert',
    match: /^\/notebooks\/?$/,
    requires: 'cahier-sections',
    version: 2,
    steps: [
      { target: 'cahier-sections', title: 'Les chapitres', body: 'Touche un chapitre pour trouver ses leçons.' },
      { target: 'cahier-contenu', title: 'La lecture', body: 'Tes leçons, comme dans un vrai cahier.' },
      { target: 'cahier-annoter', title: 'Annoter', body: 'Surligne, écris une note ou dessine sur la feuille : c’est enregistré tout seul.' },
      { target: 'cahier-imprimer', title: 'Imprimer le cahier', body: 'Tout ton cahier en PDF, un chapitre par page.' },
    ],
  },
  {
    id: 'progression',
    match: /^\/progression\/?$/,
    requires: 'prog-tuiles',
    version: 5, // tableau de bord en onglets du 13/10/2026 : période, tuiles, graphique, onglets
    steps: [
      { target: 'prog-periode', title: 'La période', body: '7 jours, 30 jours, 3 mois ou depuis le début : tout le tableau suit.' },
      { target: 'prog-tuiles', title: 'Tes chiffres', body: 'Questions réussies, note aux examens, temps, jours actifs. Touche une tuile pour son graphique.' },
      { target: 'prog-graphique', title: 'Jour par jour', body: 'Touche une barre pour voir ce que tu as fait ce jour-là.' },
      { target: 'prog-onglets', title: 'Tout en onglets', body: 'Tes points faibles (les théorèmes à retravailler), tes chapitres (ta note aux examens) et ton temps.' },
    ],
  },
  {
    id: 'revisions',
    match: /^\/reviser\/?$/,
    requires: 'revisions-ds',
    version: 4, // page « Réviser » du 11/10/2026 : prochain DS, à refaire, mes listes
    autoSteps: ['revisions-ds', 'revisions-suggestions', 'revisions-nouvelle'],
    steps: [
      { target: 'revisions-ds', title: 'Ton prochain DS', body: 'Indique la date et les chapitres de ton DS : Fidni te prépare un DS blanc.' },
      { target: 'revisions-suggestions', title: 'À refaire', body: 'Les exercices ratés ou marqués « À revoir ». Refais-en un.' },
      { target: 'revisions-liste', title: 'Mes listes', body: 'Ouvre une liste pour refaire ses exercices à la suite.' },
      { target: 'revisions-nouvelle', title: 'Nouvelle liste', body: 'Regroupe des exercices à refaire, avec le bouton « Liste ».' },
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
        body: 'Mode révision : un exercice à la fois. Feuille à imprimer : tout en PDF.',
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
      { target: 'favoris-liste', title: 'Tes favoris', body: 'Rangés par type. Le signet vert les retire.' },
      { target: 'favoris-recherche', title: 'Chercher', body: 'Retrouve un favori par son titre ou son chapitre.' },
    ],
  },
  {
    id: 'skilliq',
    match: /^\/skill-iq\/?$/,
    requires: 'skilliq-niveaux',
    version: 5, // 10/11/2026 : chapitres en liste, dans l’ordre du programme (avant : cartes rangées par thème)
    steps: [
      { target: 'skilliq-hero', title: 'Quiz par chapitre', body: 'Des questions chronométrées, corrigées tout de suite.' },
      { target: 'skilliq-choix-niveau', title: 'Ton niveau, ou un autre', body: 'Tu peux aussi faire les quiz d’un autre niveau.' },
      { target: 'skilliq-niveaux', title: 'Tous tes quiz', body: 'Un quiz par chapitre. Clique sur ton score pour revoir ta correction.' },
    ],
  },

  // ───────────────────────────────────────────── Concours
  {
    id: 'concours',
    match: /^\/concours\/?$/,
    requires: 'concours-types',
    autoSteps: ['concours-types', 'concours-simulation', 'concours-annales'],
    steps: [
      { target: 'concours-types', title: 'Les écoles', body: 'Clique sur une école pour voir ses sujets.' },
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
