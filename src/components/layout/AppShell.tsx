import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { OnboardingBanner } from './OnboardingBanner';
import { IdentityGate } from '@/components/profile/IdentityForm';
import Footer from './Footer';
import { BreadcrumbProvider } from '@/contexts/BreadcrumbContext';
import { useHomeView } from '@/stores/homeViewStore';

const COLLAPSE_KEY = 'fd-sidebar-collapsed';

interface AppShellProps {
  children: React.ReactNode;
  showFooter?: boolean;
}

/**
 * Application shell: persistent left rail + slim contextual top bar.
 * Every page that previously rendered <Navbar/> now routes through here,
 * so navigation chrome lives in exactly one place.
 */
export const AppShell: React.FC<AppShellProps> = ({ children, showFooter = true }) => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState<boolean>(
    () => typeof window !== 'undefined' && localStorage.getItem(COLLAPSE_KEY) === '1'
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  // Campus affiché : il occupe tout l'espace sous la barre du haut, sans pied de page.
  const immersive = useHomeView((s) => s.immersive);

  // Neutralize any legacy `body { padding-top }` (old fixed-navbar offset that
  // may still ship in cached/legacy CSS). An inline style beats any stylesheet,
  // so this removes the blank band above the shell regardless of its source.
  useEffect(() => {
    const prev = document.body.style.paddingTop;
    document.body.style.paddingTop = '0px';
    return () => { document.body.style.paddingTop = prev; };
  }, []);

  // Close the mobile drawer on navigation.
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    document.body.classList.toggle('mobile-menu-open', mobileOpen);
    return () => document.body.classList.remove('mobile-menu-open');
  }, [mobileOpen]);

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
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
        <div className="flex-1 flex flex-col min-w-0">
          <OnboardingBanner />
          <IdentityGate />
          <TopBar onOpenMobile={() => setMobileOpen(true)} />
          <main className="flex-grow">{children}</main>
          {showFooter && !immersive && <Footer />}
        </div>
      </div>
    </BreadcrumbProvider>
  );
};
