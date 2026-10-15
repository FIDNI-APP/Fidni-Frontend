window.global ||= window;

import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { languePrete } from './i18n';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import './assets/fonts/fonts.css';
import './index.css';
import './styles/mode-sombre.css';

// Pas de <StrictMode> : en mode développement, il exécute chaque effet deux fois
// (double requête, double chargement). fidni.fr étant servi par le serveur de dev
// Vite, chaque visiteur subissait ce doublement sur toutes les pages.
// ErrorBoundary : une erreur d'affichage montre une page de secours au lieu d'une page blanche.
// Interface en arabe : ses traductions sont chargées avant le premier affichage (pas d'éclair en français).
languePrete().then(() => {
  createRoot(document.getElementById('root')!).render(<ErrorBoundary variant="app"><App /></ErrorBoundary>);
});
