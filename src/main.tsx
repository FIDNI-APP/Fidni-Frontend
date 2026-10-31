window.global ||= window;

import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { languePrete } from './i18n';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import './assets/fonts/fonts.css';
import './index.css';
import './styles/mode-sombre.css';
import { nativePlatform } from './lib/native';

// Application iPhone : la page passe sous la barre du bas (env(safe-area-inset-bottom), déjà géré par la barre
// d'onglets) ; la barre d'état reste hors de la page (ios/App/App/FidniViewController.swift).
if (nativePlatform === 'ios') {
  document.querySelector('meta[name="viewport"]')?.setAttribute('content', 'width=device-width, initial-scale=1.0, viewport-fit=cover');
}

// Pas de <StrictMode> : en mode développement, il exécute chaque effet deux fois
// (double requête, double chargement). fidni.fr étant servi par le serveur de dev
// Vite, chaque visiteur subissait ce doublement sur toutes les pages.
// ErrorBoundary : une erreur d'affichage montre une page de secours au lieu d'une page blanche.
// Interface en arabe : ses traductions sont chargées avant le premier affichage (pas d'éclair en français).
languePrete().then(() => {
  createRoot(document.getElementById('root')!).render(<ErrorBoundary variant="app"><App /></ErrorBoundary>);
});
