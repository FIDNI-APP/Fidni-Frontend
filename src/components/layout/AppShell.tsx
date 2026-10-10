import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { OnboardingBanner } from './OnboardingBanner';
import { MobileTabBar } from './MobileTabBar';
import { TABBAR_OFFSET } from './nav';
import { IdentityGate } from '@/components/profile/IdentityForm';
import Footer from './Footer';
import { BreadcrumbProvider } from '@/contexts/BreadcrumbContext';

const COLLAPSE_KEY = 'fd-sidebar-collapsed';

interface AppShellProps {
  children: React.ReactNode;
  showFooter?: boolean;
}

/**
 * Application shell: persistent left rail + slim contextual top bar, and a bottom tab bar on phones.
 * Every page that previously rendered <Navbar/> now routes through here,
 * so navigation chrome lives in exactly one place.
 */
export const AppShell: React.FC<AppShellProps> = ({ children, showFooter = true }) => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  // Neutralize any legacy `body { padding-top }` (old fixed-navbar offset that
  // may still ship in cached/legacy CSS). An inline style beats any stylesheet,
  // so this removes the blank band above the shell regardless of its source.
  useEffect(() => {
    const prev = document.body.style.paddingTop;
    document.body.style.paddingTop = '0px';
    return () => { document.body.style.paddingTop = prev; };
  }, []);

  // Close the mobile drawer on navigation (y compris un simple changement d'onglet : ?onglet=ds).
  useEffect(() => { setMobileOpen(false); }, [location.pathname, location.search]);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    document.body.classList.toggle('mobile-menu-open', mobileOpen);
    return () => document.body.classList.remove('mobile-menu-open');
  }, [mobileOpen]);

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0'); } catch { /* préférence facultative */ }
      return next;
    });
  };

  return (
    <BreadcrumbProvider>
      <div className="flex min-h-screen" style={{ background: '#faf9f7' }}>
        <Sidebar
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />
        {/* Sur téléphone, la barre d'onglets du bas ne doit cacher ni la fin de la page ni le pied de page. */}
        <div className="flex-1 flex flex-col min-w-0" style={{ paddingBottom: TABBAR_OFFSET }}>
          <OnboardingBanner />
          <IdentityGate />
          <TopBar onOpenMobile={() => setMobileOpen(true)} />
          <main className="flex-grow">{children}</main>
          {showFooter && <Footer />}
        </div>
        <MobileTabBar menuOpen={mobileOpen} onOpenMenu={() => setMobileOpen(true)} />
      </div>
    </BreadcrumbProvider>
  );
};
