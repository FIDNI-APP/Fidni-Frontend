import type { ReactNode } from 'react';
import { ConcoursNavTabs } from './ConcoursNavTabs';

/**
 * Shared gradient hero for every concours section page (Examens / Historique /
 * Astuces). Keeps the header, badge, title and nav tabs at identical width and
 * vertical rhythm across pages so nothing jumps when switching tabs.
 */
export function ConcoursHero({
  icon: Icon, badge, title, subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="relative" style={{
      background: 'linear-gradient(115deg,#1e1b4b 0%,#4338ca 45%,#6d28d9 100%)',
    }}>
      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.12] pointer-events-none overflow-hidden">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="concoursHeroGrid" width="22" height="22" patternUnits="userSpaceOnUse">
              <path d="M 22 0 L 0 0 0 22" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#concoursHeroGrid)" />
        </svg>
      </div>
      {/* Glow */}
      <div className="absolute top-0 right-0 w-[420px] h-[420px] bg-violet-400/20 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4 pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-4 md:px-6 pt-10 pb-0">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider text-white"
              style={{ background: 'rgba(255,255,255,.15)', backdropFilter: 'blur(6px)' }}>
          <Icon className="w-3 h-3" /> {badge}
        </span>
        <h1 className="text-white font-extrabold tracking-tight mt-4"
            style={{ fontSize: 'clamp(28px,4vw,38px)', letterSpacing: '-0.04em', lineHeight: 1.05 }}>
          {title}
        </h1>
        <p className="text-white/75 mt-3 max-w-xl" style={{ fontSize: 15, lineHeight: 1.6, minHeight: 48 }}>
          {subtitle}
        </p>

        <div className="mt-7">
          <ConcoursNavTabs variant="hero" />
        </div>
      </div>
    </div>
  );
}
