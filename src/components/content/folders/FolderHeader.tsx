/**
 * En-tête des dossiers et des listes (11/10/2026), même allure que PageHeader (components/space/Page) :
 *  - le chemin des dossiers parents (« Exercices › 2ème Bac SM »), chaque cran remonte d'un dossier ;
 *  - le titre : le nom du dossier en grand (chapitre, niveau), le reste du titre du serveur en petit
 *    (« exercices corrigés – 2ème Bac SM ») — le texte du <h1> reste celui de la page pré-remplie (SEO) ;
 *  - une ligne (combien, où en est l'élève) ; à droite, quelques liens (le cours du chapitre…).
 * Le long texte de présentation des moteurs de recherche va en bas de page (FolderAbout).
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, FolderOpen } from 'lucide-react';
import { t } from '@/i18n';

export interface Crumb { label: string; to: string }

/** « Suites numériques : exercices corrigés – 2ème Bac SM » → grand « Suites numériques », petit le reste. */
function splitTitle(title: string, emphasis?: string | null): { big: string; small: string; sep: string; smallFirst: boolean } | null {
  if (!emphasis || emphasis === title) return null;
  if (title.startsWith(emphasis)) {
    const rest = title.slice(emphasis.length);
    const m = rest.match(/^\s*[:–-]\s*/);
    return m ? { big: emphasis, small: rest.slice(m[0].length), sep: m[0], smallFirst: false } : null;
  }
  if (title.endsWith(emphasis)) {
    const rest = title.slice(0, title.length - emphasis.length);
    const m = rest.match(/\s*[:–-]\s*$/);
    return m ? { big: emphasis, small: rest.slice(0, rest.length - m[0].length), sep: m[0], smallFirst: true } : null;
  }
  return null;
}

export const FolderHeader: React.FC<{
  crumbs?: Crumb[];
  title: string;
  /** Partie du titre à montrer en grand (nom du chapitre ou du niveau), s'il commence ou finit par elle. */
  emphasis?: string | null;
  /** Nombre à côté du titre (contenus du dossier). */
  count?: number | null;
  summary?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}> = ({ crumbs, title, emphasis, count, summary, actions, children }) => {
  const parts = splitTitle(title, emphasis);
  const big = 'fd-display block text-ink';
  const bigStyle = { fontSize: 'clamp(28px, 3.4vw, 38px)', lineHeight: 1.08 } as const;
  const small = 'mt-1.5 block font-sans text-[11px] font-bold uppercase tracking-[.1em] text-gold-strong';
  return (
    <header className="mb-5 sm:mb-7">
      {crumbs && crumbs.length > 0 && (
        <nav aria-label={t('Fil d’Ariane')} className="-ms-1 mb-1.5 flex flex-wrap items-center text-[13px] text-ink-faint">
          {crumbs.map((c, i) => (
            <React.Fragment key={`${c.to}-${i}`}>
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#b3aea5]" aria-hidden />}
              <Link to={c.to}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-1 font-medium transition-colors hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 sm:min-h-8">
                {i === 0 && <FolderOpen className="h-4 w-4" aria-hidden />}
                {c.label}
              </Link>
            </React.Fragment>
          ))}
        </nav>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className={parts ? 'flex flex-col' : `${big} flex flex-wrap items-baseline gap-x-2.5`} style={parts ? undefined : bigStyle}>
            {parts ? (
              // Le nom du dossier en grand, le reste du titre dessous en petit ; l'ordre de lecture du titre ne change pas.
              <span className={`flex ${parts.smallFirst ? 'flex-col-reverse' : 'flex-col'}`}>
                {parts.smallFirst && <span className={`${small} first-letter:uppercase`}>{parts.small}<span className="sr-only">{parts.sep}</span></span>}
                <span className={big} style={bigStyle}>
                  {parts.big}
                  {count ? <span className="fd-nums ms-2.5 font-sans text-[15px] font-medium tracking-normal text-ink-faint">{count}</span> : null}
                </span>
                {!parts.smallFirst && <span className={`${small} first-letter:uppercase`}><span className="sr-only">{parts.sep}</span>{parts.small}</span>}
              </span>
            ) : (
              <>
                {title}
                {count ? <span className="fd-nums font-sans text-[15px] font-medium tracking-normal text-ink-faint">{count}</span> : null}
              </>
            )}
          </h1>
          {summary && <div className="mt-2 text-[14px] leading-relaxed text-ink-faint">{summary}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  );
};

/** Liens vers les autres rubriques du dossier (« Cours 1 », « Devoirs 2 ») : petites pastilles. */
export const RelatedLinks: React.FC<{ related: { label: string; count: number; url: string }[] }> = ({ related }) => (
  <>
    {related.map((r) => (
      <Link key={r.url} to={r.url}
        className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line bg-white px-3.5 text-[13px] font-semibold text-ink-soft transition-colors hover:border-[#cfc9bf] hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
        {r.label}
        <span className="fd-nums rounded-full bg-[#f2f1ee] px-1.5 text-[11.5px] text-ink-faint">{r.count}</span>
      </Link>
    ))}
  </>
);

/** Présentation du dossier pour les moteurs de recherche : en bas de page, discrète. */
export const FolderAbout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="mt-12 max-w-3xl border-t border-line pt-5 text-[12.5px] leading-relaxed text-ink-faint">{children}</p>
);

export default FolderHeader;
