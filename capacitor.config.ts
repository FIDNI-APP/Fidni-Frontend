// Application mobile FIDNI (iOS / Android) : le site construit (dist/) embarqué dans l'application.
// Mode d'emploi : MOBILE.md.
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'fr.fidni.app',
  appName: 'FIDNI',
  webDir: 'dist',
  server: {
    // La page de l'application a pour origine https://fidni.fr (Android) ou capacitor://fidni.fr (iPhone) :
    // l'API la reconnaît comme le site (CORS, vues comptées par apps/things/views.py `_depuis_le_site`).
    hostname: 'fidni.fr',
    androidScheme: 'https',
  },
  android: {
    // Pas de contenu HTTP en clair : l'API est en HTTPS.
    allowMixedContent: false,
  },
  ios: {
    // La WebView ne passe pas sous la barre d'état (FidniViewController) : pas de marge ajoutée par iOS.
    contentInset: 'never',
  },
  plugins: {
    SystemBars: {
      // Android : la page reste entre la barre d'état et la barre de navigation, comme dans un navigateur.
      insetsHandling: 'native',
    },
    SplashScreen: {
      // Retiré par NativeBridge dès que l'interface est affichée ; au plus 3 s si le site ne démarre pas.
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: '#faf9f7',
      showSpinner: false,
    },
    SocialLogin: {
      // Seul Google (Android) sert : les autres fournisseurs ne sont pas embarqués.
      providers: { google: true, facebook: false, apple: false, twitter: false },
      logLevel: 1,
    },
  },
};

export default config;
