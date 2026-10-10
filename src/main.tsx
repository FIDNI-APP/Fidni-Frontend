window.global ||= window;

import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import './assets/fonts/fonts.css';
import './index.css';

// Pas de <StrictMode> : en mode développement, il exécute chaque effet deux fois
// (double requête, double chargement). fidni.fr étant servi par le serveur de dev
// Vite, chaque visiteur subissait ce doublement sur toutes les pages.
// ErrorBoundary : une erreur d'affichage montre une page de secours au lieu d'une page blanche.
createRoot(document.getElementById('root')!).render(<ErrorBoundary variant="app"><App /></ErrorBoundary>);
