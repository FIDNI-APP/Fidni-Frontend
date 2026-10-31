# Application mobile FIDNI (iOS + Android)

Une vraie application ([Capacitor 8](https://capacitorjs.com) + [Ionic](https://ionicframework.com) 9) : ses propres
écrans, pensés pour le téléphone, avec les mêmes données et les mêmes règles que le site.

- Identifiant : `fr.fidni.app` · nom affiché : **FIDNI** · configuration : `capacitor.config.ts`
- Projets natifs : `android/` (Android Studio) et `ios/` (Xcode). Images sources des icônes : `assets/`.
- `src/main.tsx` charge `src/mobile/` dans l'application (`isNativeApp`, `src/lib/native.ts`), le site sinon.

## Les écrans de l'application (`src/mobile/`)

Onglets (barre d'onglets native, une pile d'écrans par onglet, glissement et retour par balayage) :
**Accueil** (prochain objectif, où j'en suis, prochain DS, à refaire) · **Explorer** (Exercices / Cours / Devoirs,
niveaux, chapitres, contenus « Pour toi », Bac national) · **Réviser** (DS, à refaire, mes listes) · **Progression**
(chiffres, activité, points faibles, chapitres) · **Profil** (favoris, réglages, langue, mode sombre). Plus l'accueil
de l'application, la connexion, l'inscription et le premier lancement d'un compte.

Réutilisé du site, sans copie : `lib/api/*`, `AuthContext`, `ThemeContext`, `i18n` (arabe : `i18n/ar/mobile.json`),
le rendu des formules (`TipTapRenderer`, `LessonRenderer`), le temps passé (`usePageTimeTracker`), les aides
(`helpTracking`). Une question évaluée dans l'application l'est sur le site, et inversement.

Pas encore refait en écrans natifs : quiz par chapitre, plan de DS et DS blanc, cahiers, classes et copies, concours,
documents, Pilotage, modifier son profil. Ils s'ouvrent dans la **version complète du site**, dans l'application,
avec « Retour à l'app » (`openWeb`, `SiteInApp` dans `MobileApp.tsx`) ; les onglets restent où on les avait laissés.

Ajouter un écran : un composant qui rend `<Screen>` (`src/mobile/ui.tsx`), ouvert par `useNav().push(() => <MonEcran />)`.

## Le site dans l'application (version complète) : ce qui diffère du navigateur

| Sur le site | Dans l'application | Où |
|---|---|---|
| Publicité AdSense + bandeau cookies | Aucune pub, aucun bandeau (AdSense interdit en WebView) | `lib/ads.ts` |
| `window.print()` (PDF des sujets, feuilles de correction, documents) | Fenêtre d'impression du système (imprimante ou PDF) | `printPage`, plugin `FidniNative` |
| Téléchargement (notes CSV/XLSX, .docx, .tex) | Feuille de partage (Fichiers, Drive, WhatsApp…) | `saveFile` |
| `navigator.share` | Partage du système, lien `https://fidni.fr/…` | `shareLink`, `publicUrl` |
| Lien extérieur / `window.open` | Navigateur intégré ; liens fidni.fr ouverts dans l'application | `NativeBridge` |
| Choix d'un fichier image | « Appareil photo » ou fichiers (copie à corriger, copies d'une classe…) | Android `FidniWebChromeClient` ; iOS natif |
| Connexion Google (bouton Google) | Android : sélecteur de compte du téléphone. iPhone : masquée (voir plus bas) | `lib/googleAuth.ts` |
| Bouton « retour » | Android : page précédente, puis quitter | `NativeBridge` |
| Liens reçus par e-mail (confirmation, mot de passe) | Ouvrent l'application si elle est installée (après l'étape « Liens » ci-dessous) | `NativeBridge`, manifeste, entitlements |

La page de l'application a pour origine `https://fidni.fr` (Android) ou `capacitor://fidni.fr` (iPhone) : pour l'API,
c'est le site (CORS, vues comptées par `_depuis_le_site`).

## À faire une fois côté serveur

1. **CORS (indispensable pour l'iPhone)** — dans le `.env` du serveur OVH :
   `CORS_ALLOWED_ORIGINS=https://fidni.fr,capacitor://fidni.fr` puis redémarrer `fidni-backend`.
   (Android marche déjà : son origine est `https://fidni.fr`.) Branche backend `feat/mobile-app`.
2. **Déployer le front de cette branche** : sans effet visible sur le site (tout est conditionné par `isNativeApp`).
3. **Liens fidni.fr → application** (facultatif, recommandé) — publier dans `public/.well-known/` :
   - `assetlinks.json` (Android) avec l'empreinte SHA-256 du certificat de signature **de production** (Play Console ›
     Intégrité de l'application) :
     ```json
     [{"relation":["delegate_permission/common.handle_all_urls"],
       "target":{"namespace":"android_app","package_name":"fr.fidni.app",
                 "sha256_cert_fingerprints":["<SHA-256 de Play App Signing>"]}}]
     ```
   - `apple-app-site-association` (sans extension, `Content-Type: application/json`) :
     ```json
     {"applinks":{"details":[{"appIDs":["<TEAM_ID>.fr.fidni.app"],"components":[{"/":"*"}]}]}}
     ```
     puis dans Xcode › Signing & Capabilities › **+ Associated Domains** : `applinks:fidni.fr`.
   Vérifier que nginx sert ces deux fichiers tels quels (pas le pré-rendu SEO ni `index.html`).

## Connexion avec Google

- **Android** : même Client ID web qu'aujourd'hui (le serveur ne change pas). Dans Google Cloud Console › Identifiants,
  créer un client OAuth **Android** (même projet) : paquet `fr.fidni.app` + empreinte SHA-1 de chaque certificat :
  - débogage (cette machine) : `8D:4A:A1:CD:07:BE:6B:C4:D3:3A:69:C7:93:29:D1:35:5F:C9:AE:F0`
  - production : SHA-1 de votre clé d'envoi **et** celle de Play App Signing.
  Sans cela, le sélecteur de compte s'ouvre puis échoue (« La connexion avec Google a échoué ») ; l'e-mail marche toujours.
- **iPhone** : bouton masqué. L'App Store exige « Se connecter avec Apple » dès qu'une connexion Google est proposée
  (règle 4.8). Pour l'ajouter : un `POST /api/auth/apple/` calqué sur `apps/authentication/google.py` (clés
  `https://appleid.apple.com/auth/keys`, audience `fr.fidni.app`), `apple: true` dans `capacitor.config.ts`, puis
  `googleSignInAvailable` à `true` sur iOS (avec un Client ID iOS dans `SocialLogin.initialize`).

## Développer et construire

Prérequis : Node 22 (Capacitor 8), JDK 21 + Android SDK 36 (Android Studio les installe), un Mac avec Xcode pour iOS.

```bash
npm run mobile:sync      # build du site + copie dans android/ et ios/ (après CHAQUE changement du site)
npm run mobile:android   # idem, puis ouvre Android Studio (▶ pour lancer sur un téléphone ou un émulateur)
npm run mobile:ios       # idem, puis ouvre Xcode (Mac) : choisir l'équipe dans Signing & Capabilities, ▶
```

APK de test sans Android Studio : `cd android && ./gradlew assembleDebug` → `android/app/build/outputs/apk/debug/app-debug.apk`.

Icônes et écrans de démarrage (après un changement de `assets/`) :
`npx @capacitor/assets@4.0.0 generate --ios --android --iconBackgroundColor '#1a7a4a' --iconBackgroundColorDark '#1a7a4a' --splashBackgroundColor '#faf9f7' --splashBackgroundColorDark '#24221f'`

## Tester sur iPhone (sans Mac)

L'application iPhone se construit sur un Mac de GitHub (`.github/workflows/ios.yml`, gratuit : dépôt public) puis
s'installe avec **TestFlight**. Il faut l'**Apple Developer Program** (99 $/an, aussi indispensable pour l'App Store).

À faire une fois :
1. [developer.apple.com](https://developer.apple.com/account) › Membership details : noter le **Team ID**.
2. Certificates, IDs & Profiles › Identifiers › **+** › App IDs › App : description `FIDNI`, Bundle ID explicite `fr.fidni.app`.
3. [App Store Connect](https://appstoreconnect.apple.com) › Apps › **+** › New App : iOS, nom `FIDNI`, langue Français,
   Bundle ID `fr.fidni.app`, SKU `fidni`.
4. App Store Connect › Users and Access › Integrations › App Store Connect API › Team Keys › **+** : nom `GitHub`,
   accès **Admin** (Apple crée alors lui-même le certificat de distribution). Télécharger le fichier `.p8` (possible
   une seule fois), noter le **Key ID** et l'**Issuer ID** (en haut de la page).
5. GitHub › Fidni-Frontend › Settings › Secrets and variables › Actions › New repository secret, ou en ligne de commande :
   ```bash
   gh secret set APPLE_TEAM_ID --body "XXXXXXXXXX"
   gh secret set ASC_KEY_ID    --body "XXXXXXXXXX"
   gh secret set ASC_ISSUER_ID --body "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
   gh secret set ASC_KEY_P8 < AuthKey_XXXXXXXXXX.p8
   ```

Chaque version à tester :
1. GitHub › Actions › **iOS** › Run workflow (choisir la branche) : 15 à 25 min.
2. App Store Connect › FIDNI › TestFlight : le build apparaît après le traitement d'Apple (10 à 30 min). La première
   fois : Internal Testing › **+** un groupe, s'y ajouter (et les autres membres de l'équipe Apple).
3. Sur l'iPhone : installer **TestFlight** (App Store), ouvrir l'invitation reçue par e-mail › Installer. Les versions
   suivantes arrivent dans TestFlight (notification). Un build TestFlight expire au bout de 90 jours.

Sans compte payant, seul un Mac permet d'essayer (gratuit) :
1. Mac : Xcode (App Store), Node 22 (nodejs.org), puis
   `git clone -b feat/mobile-app https://github.com/FIDNI-APP/Fidni-Frontend.git && cd Fidni-Frontend && npm ci && npm run mobile:ios`.
2. Xcode › Settings › Accounts › **+** › Apple ID (le sien, gratuit). Cible **App** › Signing & Capabilities :
   Team = « (Personal Team) », Bundle Identifier = **`fr.fidni.app.test`** (une équipe gratuite s'approprie l'identifiant :
   garder `fr.fidni.app` pour le compte payant).
3. iPhone branché en USB, « Faire confiance » ; iPhone › Réglages › Confidentialité et sécurité › **Mode développeur**
   (redémarrage). Choisir l'iPhone en haut de Xcode, ▶.
4. Premier lancement refusé : iPhone › Réglages › Général › VPN et gestion de l'appareil › faire confiance au développeur.
L'application cesse de s'ouvrir au bout de 7 jours : la réinstaller depuis Xcode (▶). Ne pas commiter le changement
d'identifiant ni d'équipe fait dans Xcode.

## Publier

Chaque version : `npm run mobile:sync`, puis augmenter les numéros —
Android `android/app/build.gradle` (`versionCode` +1, `versionName`), iOS Xcode › General (Version, Build).

- **Google Play** : créer une clé d'envoi (`keytool -genkey -v -keystore fidni-upload.jks -alias fidni -keyalg RSA
  -keysize 2048 -validity 10000`, à garder hors du dépôt), Android Studio › Build › Generate Signed App Bundle (AAB),
  Play Console › nouvelle application › tests internes puis production.
- **App Store** : compte Apple Developer, Xcode › Product › Archive › Distribute App › App Store Connect, puis TestFlight.
  `ITSAppUsesNonExemptEncryption = false` est déjà déclaré.
- Les deux magasins demandent une politique de confidentialité (`https://fidni.fr/privacy-policy`) et la suppression du
  compte dans l'application (Profil › Paramètres › Supprimer mon compte : déjà là).

## Ce qui se met à jour tout seul, et ce qui ne le fait pas

- **Toujours à jour** (vient de l'API à chaque ouverture) : exercices, cours, devoirs, quiz, notes, progression,
  classes, copies, comptes… Ajouter un exercice ou corriger une solution n'exige rien côté application.
- **Figé à chaque version** : le code du site lui-même (pages, boutons, mise en page, nouvelles fonctions). Une
  modification du front est visible sur fidni.fr dès la mise en ligne, mais dans l'application seulement après
  `npm run mobile:sync`, une nouvelle version publiée (vérification Apple : 1 à 2 jours) et sa mise à jour par l'élève.
- **Le risque** : une version ancienne de l'application parle à l'API d'aujourd'hui. Si l'API change de façon
  incompatible (champ renommé ou retiré, réponse au format différent), les téléphones pas encore mis à jour
  affichent une erreur. Règle : **ajouter des champs, ne pas renommer ni retirer** ceux que le front lit ; s'il le
  faut, garder l'ancien champ quelques semaines.
