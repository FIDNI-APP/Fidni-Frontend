import { ConcoursNavTabs } from './ConcoursNavTabs';

/**
 * En-tête commun des pages concours (Examens / Historique / Astuces), dans le style
 * des autres pages du site : fond papier, petite étiquette, titre, onglets soulignés.
 * (Il était noir avec une grille et un halo violet, seul de son genre sur le site.)
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
    <div style={{ background: '#faf9f7', borderBottom: '1px solid #e7e3dc' }}>
      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-8 md:pt-10">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase"
              style={{ background: '#f2f1ee', color: '#1a1a1a' }}>
          <Icon className="w-3 h-3" /> {badge}
        </span>
        <h1 className="font-bold tracking-tight mt-3"
            style={{ fontSize: 'clamp(26px,3.4vw,34px)', letterSpacing: '-0.03em', lineHeight: 1.1, color: '#1a1a1a' }}>
          {title}
        </h1>
        <p className="mt-2 max-w-2xl" style={{ fontSize: 15, lineHeight: 1.6, color: '#6b6862' }}>
          {subtitle}
        </p>

        <div className="mt-6">
          <ConcoursNavTabs variant="hero" />
        </div>
      </div>
    </div>
  );
}
