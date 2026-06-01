import { Link, useLocation } from 'react-router-dom';
import { BookOpen, History as HistoryIcon, Lightbulb } from 'lucide-react';

const TABS = [
  { to: '/concours', label: 'Examens', icon: BookOpen, exact: true },
  { to: '/concours/sessions', label: 'Mon historique', icon: HistoryIcon, exact: false },
  { to: '/concours/tips', label: 'Astuces', icon: Lightbulb, exact: false },
];

/**
 * Concours section nav.
 *  - "card"  (default): standalone white pill bar on a light page.
 *  - "hero":  sits at the bottom of a dark gradient hero — white tabs that
 *             merge into the page below (ContentDetail-style).
 */
export function ConcoursNavTabs({ variant = 'card' }: { variant?: 'card' | 'hero' }) {
  const { pathname } = useLocation();

  if (variant === 'hero') {
    return (
      <div className="flex items-center gap-1 -mb-px overflow-x-auto scrollbar-hide">
        {TABS.map(({ to, label, icon: Icon, exact }) => {
          const active = exact ? pathname === to : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-xl transition-all whitespace-nowrap ${
                active ? 'bg-[#f8f7ff] text-indigo-700' : 'text-white/75 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex gap-1 mb-6 animate-fade-up" style={{
      background: '#fff',
      borderRadius: 14,
      padding: 4,
      boxShadow: '0 1px 4px rgba(0,0,0,.08)',
    }}>
      {TABS.map(({ to, label, icon: Icon, exact }) => {
        const active = exact ? pathname === to : pathname.startsWith(to);
        return (
          <Link
            key={to}
            to={to}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '9px 18px', borderRadius: 10,
              fontSize: 14, fontWeight: active ? 700 : 500,
              color: active ? '#4f46e5' : '#6b7280',
              background: active ? '#eef2ff' : 'transparent',
              textDecoration: 'none',
              transition: 'all .15s',
              flex: '0 0 auto',
            }}
          >
            <Icon style={{ width: 16, height: 16, flexShrink: 0 }} />
            {label}
            {active && (
              <span style={{
                marginLeft: 4, width: 6, height: 6, borderRadius: '50%',
                background: '#4f46e5', display: 'inline-block',
              }} />
            )}
          </Link>
        );
      })}
    </div>
  );
}
