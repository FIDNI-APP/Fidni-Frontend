# Couverture UI et UX de Fidni

Le routeur web contient 104 entrées, réparties ci-dessous par fonctionnalité. Une entrée peut désigner une page, plusieurs vues d’un même modèle ou une redirection. Les constats portent sur les changements des PR 46 à 48 et sur cette livraison.

Les chiffres proviennent de l’audit d’usage du 9 octobre au 7 novembre 2026, comptes maison exclus. Les vues et gestes couvrent 29 ou 30 jours selon leur date d’instrumentation. Les chiffres décrivent la période avant les changements.

## Parcours examinés

| Fonctionnalité | Constat et intervention |
| --- | --- |
| Accueil et recherche | 5 289 vues de l’accueil et 298 de la recherche. L’accueil et la recherche ont été repris, avec des suggestions accessibles dès l’entrée. Le carrousel « Pour continuer » est livré avec la PR 46. |
| Catalogues et chapitres | 5 803 vues des exercices d’un niveau et 4 989 des examens d’un niveau. Le filtre local retrouve un chapitre sans accents. Une erreur de chargement propose une nouvelle tentative. |
| Bac national | 240 vues du catalogue, aucune vue d’une année sur la période mesurée. Chaque ligne présente l’année, les niveaux et le nombre de sujets disponibles avant ouverture. |
| Lecture | Les fiches totalisent 4 564 vues pour les examens, 3 902 pour les exercices et 885 pour les leçons. Le signalement est accessible au clavier au pied d’une correction. Le sommaire des leçons a également été examiné. L’ancien menu de comparaison a été remplacé par l’autoévaluation, ce qui compte dans l’interprétation du zéro avis enregistré. |
| Création de contenu et prévisualisation | L’éditeur partagé affiche la progression dans ses étapes. L’aperçu d’import distingue le type de contenu et le cas où aucun aperçu n’est chargé. La création est réservée à l’équipe. |
| Impression de contenus, listes et cahiers | 361 gestes d’impression ou de PDF. Sur la page d’export commune, le téléchargement précède les réglages et le lecteur mobile dispose de plus de place. |
| Compte et profil | 349 vues du parcours de profil à compléter, et 43 élèves sans niveau. Un élève peut accéder au choix de classe depuis son profil. Les formulaires permettent de vérifier le mot de passe saisi et de réessayer une confirmation interrompue. |
| Favoris, cahiers et listes | 69 enregistrements en favoris et 90 listes créées. Filtrage des favoris par type, navigation dans le cahier et accès au mode révision depuis la liste. Une ancienne adresse de cahier avec son paramètre nb ouvre toujours la liseuse. |
| Préparation au DS | 122 vues des plans et 52 des DS blancs. Les réglages du plan et le passage d’un exercice à l’autre pendant le DS blanc ont été repris. |
| Quiz, progression et révisions | 456 vues des quiz, 309 de la progression et 330 de Réviser. Les PR 46 à 48 couvrent les résultats, le déroulement du quiz, son catalogue, la progression et le tableau de révision. |
| Discussions et membres | Les PR 46 et 47 ont revu le forum et le fil. La rédaction présente le titre puis le message, avec le salon et le niveau ensuite. La modification permet de réessayer un chargement interrompu. La page Membres est fermée depuis le 9 novembre et conserve ses redirections. |
| Défis | Le nombre de tentatives restantes accompagne la réponse. Le défi du jour et les archives se chargent indépendamment. Le détail d’une archive propose un retour au défi du jour. |
| Concours | 157 vues du catalogue et aucune simulation enregistrée. Navigation entre catalogue, conseils et historique, nouvelle tentative après erreur et bilan de simulation par domaine. L’historique mène au bilan des sessions expirées. Sur téléphone, l’éditeur interne permet de choisir une question sans sacrifier la largeur de l’énoncé. |
| Classes, évaluations et corrections | 50 vues de la liste et deux d’une classe, aucune adhésion enregistrée. L’entrée par code, la sélection d’une copie et la lecture des corrections imprimées sur téléphone ont été reprises. |
| Documents pédagogiques | 10 vues pour les documents et deux pour leur éditeur. Les commandes de la liste et de l’éditeur ont été reprises dans le parcours enseignant. |
| Parcours pédagogiques | Les vues des parcours et de leurs vidéos et quiz sont à zéro dans l’audit. La fonctionnalité reste accessible à l’équipe uniquement. Les routes de consultation et d’édition sont recensées ci-dessous. |
| Administration | Le sélecteur mobile de Pilotage donne accès aux neuf sections. La console des journaux comporte des filtres nommés et un tableau à défilement horizontal sur petit écran. |
| Information, aide et page introuvable | Sommaire repliable sur mobile pour les trois textes légaux, contact par e-mail et reprise après erreur. Une adresse introuvable permet de lancer une recherche. |
| Anciennes adresses | Ces entrées transmettent à la page de destination. Les anciens liens conservant un identifiant, une section de révision ou un sous-chemin restent pris en compte. |

## Inventaire du routeur

| Fonctionnalité | Entrées de src/App.tsx |
| --- | --- |
| Accueil et recherche | `/`, `/search` |
| Catalogues et chapitres | `/exercises`, `/exercises/niveau/:level/:chapter?`, `/lessons/niveau/:level/:chapter?`, `/exams/niveau/:level/:chapter?`, `/exams`, `/lessons` |
| Bac national | `/exams/nationaux`, `/exams/nationaux/:annee` |
| Lecture | `/exercises/:id`, `/exams/:id`, `/lessons/:id` |
| Création de contenu et prévisualisation | `/apercu-import`, `/exercises/new`, `/exercises/:id/edit`, `/pilotage/brouillons/:brouillonId/modifier`, `/exams/new`, `/exams/:id/edit`, `/lessons/new`, `/lessons/:id/edit` |
| Impression de contenus, listes et cahiers | `/exercises/:id/pdf`, `/exams/:id/pdf`, `/revision-lists/:id/pdf`, `/lessons/:id/pdf`, `/notebooks/:id/pdf`, `/pilotage/ia/:id/pdf` |
| Compte et profil | `/login`, `/signup`, `/verify-email`, `/reset-password`, `/profile/:username`, `/profile/:username/edit`, `/complete-profile` |
| Favoris, cahiers et listes | `/profile/revision-lists/:id`, `/enregistrements`, `/notebooks` |
| Préparation au DS | `/revisions/ds/:id`, `/revisions/ds/:id/blanc` |
| Quiz, progression et révisions | `/reviser`, `/progression`, `/skill-iq` |
| Discussions et membres | `/discussions`, `/discussions/nouvelle`, `/discussions/:id`, `/discussions/:id/modifier`, `/membres` |
| Défis | `/defis`, `/defis/:date` |
| Concours | `/concours`, `/concours/exams/:id`, `/concours/simulate/:sessionId`, `/concours/sessions`, `/concours/sessions/:sessionId/recap`, `/concours/tips`, `/concours/tips/:id`, `/concours/admin`, `/concours/admin/exams/:id/questions`, `/concours/editor-test` |
| Classes, évaluations et corrections | `/classrooms`, `/classrooms/:id`, `/classrooms/:id/evaluations/:eid`, `/classrooms/:id/evaluations/:eid/copies/:copieId`, `/correction-ia/:id`, `/mes-copies/:id`, `/classrooms/:id/evaluations/:eid/copies/:copieId/pdf`, `/classrooms/:id/evaluations/:eid/corrections/pdf`, `/mes-copies/:id/pdf` |
| Documents pédagogiques | `/documents`, `/documents/:id` |
| Parcours pédagogiques | `/learning-path`, `/learning-path/:id`, `/learning-path/:pathId/chapters/:chapterId/videos/:videoId`, `/learning-path/:pathId/chapters/:chapterId/quiz`, `/learning-path/create`, `/learning-path/:id/edit`, `/learning-path/:id/chapters/create` |
| Administration | `/logs`, `/pilotage` |
| Information, aide et page introuvable | `/terms-of-service`, `/privacy-policy`, `/mentions-legales`, `/a-propos`, `/contact`, `*` |
| Anciennes adresses | `/saved`, `/revision-lists`, `/revisions`, `/statistiques`, `/new`, `/edit/:id`, `/new-exam`, `/edit-exam/:id`, `/new-lesson`, `/edit-lesson/:id`, `/structured/exercises`, `/structured/exercises/new`, `/structured/exercises/:id`, `/structured/exercises/:id/edit`, `/structured/exams`, `/structured/exams/:id`, `/structured/lessons`, `/structured/lessons/:id`, `/learning-paths/*` |

## Vérifications

Contrôles de navigation et de rendu sur Chromium à 390 et 1 366 px, avec les composants du site et des réponses API simulées. Les scénarios couvrent notamment les chapitres, le Bac national, les exports, les favoris, les listes, le DS blanc, les concours, les corrections de copies, le formulaire de discussion, les défis, les sommaires et les sections de Pilotage. Le site compilé a également été vérifié avec son routeur complet pour le Bac national, la redirection des favoris, les mentions légales et l’entrée fermée des parcours, en français sur les deux formats et en arabe sur téléphone. Les autres routes de compatibilité et écrans internes figurent dans la revue du code.

La compilation TypeScript et le build de production vérifient l’ensemble du frontend. Les envois d’e-mails et le téléchargement de PDF authentifié ne font pas partie des scénarios navigateur. Les mesures postérieures au déploiement permettront de comparer, entre autres, les ouvertures d’une année du Bac, les classes rejointes et les simulations commencées.
