/**
 * Application mobile FIDNI : écrans natifs (Ionic) pour l'espace élève — Accueil, Explorer, Réviser, Progression,
 * Profil — avec les mêmes données et règles que le site (lib/api, AuthContext). Ce qui n'a pas encore ses écrans
 * (quiz, DS blanc, classes, documents, Pilotage…) s'ouvre dans la version complète du site, avec « Retour à l'app ».
 */
import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import {
  IonApp, IonIcon, IonLabel, IonSpinner, IonTab, IonTabBar, IonTabButton, IonTabs, setupIonicReact,
} from '@ionic/react';
import { barChart, barChartOutline, compass, compassOutline, home, homeOutline, person, personOutline, refreshCircle, refreshCircleOutline, arrowBack } from 'ionicons/icons';
import { App as CapApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { verifyEmail } from '@/lib/api/authApi';
import { siteInApp, syncSystemBars } from '@/lib/native';
import { t } from '@/i18n';
import { NavStack, type Nav } from './nav';
import { SessionProvider, useSession } from './session';
import { Welcome } from './screens/auth';
import { HomeRoot } from './screens/home';
import { ExploreRoot } from './screens/explore';
import { ReviseRoot } from './screens/revise';
import { ProgressRoot } from './screens/progress';
import { ProfileRoot } from './screens/profile';
import { Onboarding } from './screens/onboarding';
import { ContentScreen, type ContentKind } from './screens/ContentScreen';

setupIonicReact({ swipeBackEnabled: true, hardwareBackButton: true });

const WebApp = lazy(() => import('../App'));

type TabKey = 'home' | 'explore' | 'revise' | 'progress' | 'profile';
const TABS: { key: TabKey; label: string; icon: string; active: string; root: () => React.ReactElement }[] = [
  { key: 'home', label: 'Accueil', icon: homeOutline, active: home, root: () => <HomeRoot /> },
  { key: 'explore', label: 'Explorer', icon: compassOutline, active: compass, root: () => <ExploreRoot /> },
  { key: 'revise', label: 'Réviser', icon: refreshCircleOutline, active: refreshCircle, root: () => <ReviseRoot /> },
  { key: 'progress', label: 'Progression', icon: barChartOutline, active: barChart, root: () => <ProgressRoot /> },
  { key: 'profile', label: 'Profil', icon: personOutline, active: person, root: () => <ProfileRoot /> },
];

const CONTENT_PATH = /^\/(exercises|exams|lessons)\/(\d+)\/?$/;
const KIND: Record<string, ContentKind> = { exercises: 'exercise', exams: 'exam', lessons: 'lesson' };

export default function MobileApp() {
  const { refreshUser } = useAuth();
  const { effectiveTheme } = useTheme();
  const [webPath, setWebPath] = useState<string | null>(null);

  useEffect(() => { document.documentElement.classList.toggle('fdm', !webPath); }, [webPath]);
  // Couleurs des barres au changement de thème et au retour du site ; pas au démarrage : l'écran affiché (accueil
  // vert, onglets) les choisit lui-même, et cet effet, qui passe après les siens, les écraserait.
  const started = useRef(false);
  useEffect(() => {
    if (started.current && !webPath) syncSystemBars(effectiveTheme);
    started.current = true;
  }, [webPath, effectiveTheme]);

  const openWeb = useCallback((path: string) => {
    window.history.replaceState(null, '', path);
    setWebPath(path);
  }, []);
  const closeWeb = useCallback(() => {
    window.history.replaceState(null, '', '/');
    setWebPath(null);
    void refreshUser();
  }, [refreshUser]);

  // Les écrans de l'application restent montés (cachés) pendant que le site est ouvert : au retour, chaque onglet
  // est là où on l'avait laissé.
  return (
    <>
      <IonApp style={webPath ? { display: 'none' } : undefined}>
        <SessionProvider openWeb={openWeb}>
          <Gate />
        </SessionProvider>
      </IonApp>
      {webPath && <SiteInApp onClose={closeWeb} />}
    </>
  );
}

/** Qui voit quoi : accueil (pas connecté), premier lancement d'un compte, ou les onglets. */
function Gate() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { guest, setGuest } = useSession();

  useEffect(() => {
    if (!isLoading) void SplashScreen.hide().catch(() => undefined);
  }, [isLoading]);
  // Connecté : le mode visiteur n'a plus lieu d'être (il reviendrait à la déconnexion).
  useEffect(() => { if (isAuthenticated && guest) setGuest(false); }, [isAuthenticated, guest, setGuest]);

  if (isLoading) return <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}><IonSpinner color="primary" /></div>;
  if (!isAuthenticated && !guest) return <NavStack root={() => <Welcome onGuest={() => setGuest(true)} />} />;
  if (isAuthenticated && user?.profile && !user.profile.onboarding_completed) return <ThemedBars><Onboarding /></ThemedBars>;
  return <Tabs />;
}

/** Barres aux couleurs du thème pour l'écran qu'elle entoure. */
function ThemedBars({ children }: { children: React.ReactNode }) {
  const { effectiveTheme } = useTheme();
  useEffect(() => { syncSystemBars(effectiveTheme); }, [effectiveTheme]);
  return <>{children}</>;
}

function Tabs() {
  const { refreshUser } = useAuth();
  const { effectiveTheme } = useTheme();
  useEffect(() => { syncSystemBars(effectiveTheme); }, [effectiveTheme]);
  const { openWeb } = useSession();
  const navs = useRef<Partial<Record<TabKey, Nav>>>({});
  const [active, setActive] = useState<TabKey>('home');
  const activeRef = useRef(active);
  activeRef.current = active;

  // Retour d'Android : écran précédent de l'onglet, puis l'onglet Accueil, puis quitter.
  useEffect(() => {
    const onBack = (ev: Event) => {
      (ev as CustomEvent).detail.register(10, async () => {
        const nav = navs.current[activeRef.current];
        if (nav && (await nav.canGoBack())) nav.pop();
        // La barre d'onglets suit `selectedTab` : changer l'état change d'onglet.
        else if (activeRef.current !== 'home') setActive('home');
        else void CapApp.exitApp();
      });
    };
    document.addEventListener('ionBackButton', onBack);
    return () => document.removeEventListener('ionBackButton', onBack);
  }, []);

  // Lien fidni.fr ouvert depuis le téléphone : contenu dans l'onglet courant, confirmation d'adresse, sinon le site.
  useEffect(() => {
    const open = async (url: string) => {
      let u: URL;
      try { u = new URL(url); } catch { return; }
      if (!/^(www\.)?fidni\.fr$/.test(u.hostname)) return;
      const m = CONTENT_PATH.exec(u.pathname);
      if (m) { navs.current[activeRef.current]?.push(() => <ContentScreen id={m[2]} kind={KIND[m[1]]} />); return; }
      if (u.pathname.startsWith('/verify-email') && u.searchParams.get('token')) {
        await verifyEmail(u.searchParams.get('token')!).catch(() => undefined);
        await refreshUser();
        return;
      }
      if (u.pathname !== '/') openWeb(u.pathname + u.search + u.hash);
    };
    void CapApp.getLaunchUrl().then((r) => { if (r?.url) void open(r.url); }).catch(() => undefined);
    const sub = CapApp.addListener('appUrlOpen', ({ url }) => { void open(url); });
    return () => { void sub.then((h) => h.remove()); };
  }, [openWeb, refreshUser]);

  return (
    <IonTabs onIonTabsDidChange={(e) => setActive(e.detail.tab as TabKey)}>
      {TABS.map((tab) => (
        <IonTab key={tab.key} tab={tab.key}>
          <NavStack root={tab.root} onReady={(nav) => { navs.current[tab.key] = nav; }} />
        </IonTab>
      ))}
      <IonTabBar slot="bottom" selectedTab={active}>
        {TABS.map((tab) => (
          <IonTabButton key={tab.key} tab={tab.key} onClick={() => {
            // Re-toucher l'onglet affiché : retour à son premier écran.
            if (tab.key === activeRef.current) void navs.current[tab.key]?.popToRoot();
          }}>
            <IonIcon icon={active === tab.key ? tab.active : tab.icon} />
            <IonLabel>{t(tab.label)}</IonLabel>
          </IonTabButton>
        ))}
      </IonTabBar>
    </IonTabs>
  );
}

/** Version complète du site, avec un bouton pour revenir aux écrans de l'application. */
function SiteInApp({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    siteInApp.close = onClose;
    document.documentElement.classList.add('fdm-site');
    return () => { siteInApp.close = null; document.documentElement.classList.remove('fdm-site'); };
  }, [onClose]);
  return (
    <>
      <Suspense fallback={<div style={{ display: 'grid', placeItems: 'center', height: '100vh' }}><IonSpinner color="primary" /></div>}>
        <WebApp />
      </Suspense>
      <button type="button" onClick={onClose} aria-label={t('Retour à l’app')} style={{
        position: 'fixed', zIndex: 2000, left: 12, bottom: 'calc(var(--fd-tabbar-h, 0px) + 14px)', height: 40, padding: '0 14px 0 10px',
        borderRadius: 20, display: 'flex', alignItems: 'center', gap: 6, background: '#1a7a4a', color: '#fff', fontWeight: 700, fontSize: 14,
        boxShadow: '0 6px 20px rgba(0,0,0,.25)',
      }}>
        <IonIcon icon={arrowBack} />{t('Retour à l’app')}
      </button>
    </>
  );
}
