/** Point d'entrée de l'application mobile (chargé par src/main.tsx sur iPhone et Android seulement). */
import { createRoot } from 'react-dom/client';
import '@ionic/react/css/core.css';
import '@ionic/react/css/structure.css';
import './theme.css';
import { LangProvider } from '@/i18n';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import MobileApp from './MobileApp';

export function renderMobile(root: HTMLElement) {
  createRoot(root).render(
    <ErrorBoundary variant="app">
      <LangProvider>
        <ThemeProvider>
          <AuthProvider>
            <MobileApp />
          </AuthProvider>
        </ThemeProvider>
      </LangProvider>
    </ErrorBoundary>,
  );
}
