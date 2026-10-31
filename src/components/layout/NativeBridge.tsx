/**
 * Application mobile (Capacitor) : ce qu'un navigateur fait de lui-même et qu'une WebView ne fait pas.
 * - bouton « retour » d'Android : page précédente, sinon fermer l'application ;
 * - liens fidni.fr ouverts depuis le téléphone (e-mail de confirmation, mot de passe oublié, lien partagé) ;
 * - liens extérieurs (et window.open) dans le navigateur intégré, liens « nouvel onglet » du site dans l'application ;
 * - barre d'état assortie au thème, écran de démarrage retiré une fois l'interface affichée.
 * Sur le web, ce composant ne fait rien.
 */
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { App as CapApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { useTheme } from '@/contexts/ThemeContext';
import { isNativeApp, openExternal, siteInApp, syncSystemBars } from '@/lib/native';

const SITE_HOSTS = new Set(['fidni.fr', 'www.fidni.fr']);
// Un fichier du site (/emails/bienvenue.png, /robots.txt…) n'est pas une page de l'application.
const FILE_PATH = /\/[^/]+\.[a-z0-9]{2,5}$/i;

/** Chemin de l'application pour une adresse du site (https://fidni.fr/…, ou l'origine de la WebView), sinon null. */
function inAppPath(href: string): string | null {
  let url: URL;
  try { url = new URL(href, window.location.href); } catch { return null; }
  const internal = url.host === window.location.host
    || (url.protocol === 'https:' && SITE_HOSTS.has(url.hostname));
  if (!internal || FILE_PATH.test(url.pathname)) return null;
  return url.pathname + url.search + url.hash;
}

const isWebUrl = (href: string) => /^https?:\/\//i.test(href);

export function NativeBridge() {
  const navigate = useNavigate();
  // useNavigate change à chaque page (BrowserRouter) : les écouteurs, posés une fois, lisent la dernière.
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const { effectiveTheme } = useTheme();

  useEffect(() => { syncSystemBars(effectiveTheme); }, [effectiveTheme]);

  useEffect(() => {
    if (!isNativeApp) return;
    void SplashScreen.hide().catch(() => undefined);

    const open = (href: string): boolean => {
      const path = inAppPath(href);
      if (path) { navigateRef.current(path); return true; }
      if (isWebUrl(href)) { openExternal(href); return true; }
      return false;
    };

    // Lien d'une page du site ouvert depuis le téléphone, application fermée ou en arrière-plan (sauf site ouvert
    // depuis les écrans de l'application : c'est elle qui les reçoit).
    const embedded = siteInApp.close !== null;
    if (!embedded) void CapApp.getLaunchUrl().then((r) => { if (r?.url) open(r.url); }).catch(() => undefined);
    const urlOpen = embedded ? null : CapApp.addListener('appUrlOpen', ({ url }) => { open(url); });
    // Première page : retour aux écrans de l'application s'ils ont ouvert le site, sinon fermer l'application.
    const back = CapApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) window.history.back();
      else if (siteInApp.close) siteInApp.close();
      else void CapApp.exitApp();
    });

    // Après les gestionnaires de React (phase de bouillonnement sur window) : un <Link> déjà traité est ignoré.
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || a.hasAttribute('download')) return;
      const href = a.getAttribute('href') || '';
      if (!href || href.startsWith('#')) return;
      if (open(a.href)) e.preventDefault();
    };
    window.addEventListener('click', onClick);

    const nativeOpen = window.open;
    window.open = ((url?: string | URL) => {
      if (url) open(String(url));
      return null;
    }) as typeof window.open;

    return () => {
      void urlOpen?.then((h) => h.remove());
      void back.then((h) => h.remove());
      window.removeEventListener('click', onClick);
      window.open = nativeOpen;
    };
  }, []);

  return null;
}
