/**
 * Pilotage › Aperçu — « Activité en direct » (12/10/2026) : les dernières actions des membres (inscriptions,
 * consultations, contenus réussis ou à revoir, commentaires, solutions, quiz avec leur score ; depuis le 14/10/2026
 * aussi les questions évaluées (regroupées), les indices et solutions ouverts, les favoris, les DS annoncés),
 * relues toutes les 30 s.
 * Tableau sur ordinateur, lignes empilées sur téléphone ; une ligne arrivée à la relecture s'éclaire un instant.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, Bookmark, BookOpen, CalendarClock, CheckCircle2, ChevronDown, Eye, GraduationCap, Lightbulb, ListChecks, Loader2,
  MessageSquare, RotateCcw, UserPlus, type LucideIcon,
} from 'lucide-react';
import { agoShort, useNow, type LiveEvent, type LiveStatus } from './livePilotage';

const SHOWN = 8;

interface KindStyle { label: string; cls: string; icon: LucideIcon }
const KINDS: Record<string, KindStyle> = {
  signup: { label: 'Inscription', cls: 'border-ink bg-ink text-white', icon: UserPlus },
  view: { label: 'Consultation', cls: 'border-line bg-[#f7f6f3] text-ink-faint', icon: Eye },
  success: { label: 'Réussi', cls: 'border-brand-line bg-brand-soft text-brand-hover', icon: CheckCircle2 },
  review: { label: 'À revoir', cls: 'border-gold-line bg-gold-soft text-gold-strong', icon: RotateCcw },
  comment: { label: 'Commentaire', cls: 'border-[#dbe3ec] bg-[#eef2f6] text-[#3d5a73]', icon: MessageSquare },
  solution: { label: 'Solution', cls: 'border-brand-line bg-white text-brand-hover', icon: BookOpen },
  skilliq: { label: 'Quiz', cls: 'border-gold-line bg-white text-gold-strong', icon: GraduationCap },
  evaluation: { label: 'Évaluation', cls: 'border-brand-line bg-white text-brand-hover', icon: ListChecks },
  aide: { label: 'Aide ouverte', cls: 'border-line bg-white text-ink-soft', icon: Lightbulb },
  favori: { label: 'Favori', cls: 'border-line bg-white text-ink-soft', icon: Bookmark },
  ds: { label: 'DS annoncé', cls: 'border-gold-line bg-gold-soft text-gold-strong', icon: CalendarClock },
};
const OTHER: KindStyle = { label: 'Action', cls: 'border-line bg-[#f2f1ee] text-ink-soft', icon: Activity };

function styleOf(e: LiveEvent): KindStyle {
  if (e.kind === 'complete') return /réussi/i.test(e.label) ? KINDS.success : KINDS.review;
  return KINDS[e.kind] ?? { ...OTHER, label: e.label || OTHER.label };
}

const exactTime = (iso: string) => new Date(iso).toLocaleString('fr-FR', {
  weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
});

/** Ce sur quoi porte l'action : le contenu (lien), le chapitre d'un quiz, sinon rien. */
const What: React.FC<{ e: LiveEvent }> = ({ e }) => {
  if (e.content) {
    return (
      <span className="block min-w-0">
        <Link to={e.content.url} title={e.content.title} className="block truncate text-[13px] text-ink hover:text-brand hover:underline">
          {e.content.title}
        </Link>
        {(e.kind === 'evaluation' || e.kind === 'aide') && (
          <span className="block truncate text-[11.5px] text-ink-faint">{e.label.replace(/^A (évalué|ouvert) /, '')}</span>
        )}
      </span>
    );
  }
  if (e.kind === 'skilliq' || e.kind === 'ds') {
    const text = e.label.replace(/^test\s+skill\s*iq\s*:?\s*/i, '').replace(/^quiz\s+/i, '').replace(/^A annoncé un /, '').trim();
    return <span className="block truncate text-[13px] text-ink-soft" title={e.label}>{text || 'Quiz par chapitre'}</span>;
  }
  return <span className="block text-[13px] text-ink-faint" aria-hidden>—</span>;
};

export const LiveActivity: React.FC<{ events: LiveEvent[] | null; status: LiveStatus }> = ({ events, status }) => {
  const now = useNow(10000);
  const [all, setAll] = useState(false);
  const [fresh, setFresh] = useState<Set<string>>(() => new Set());
  const seen = useRef<Set<string> | null>(null);

  // Lignes nouvelles depuis la relecture précédente (rien à la première : tout serait « nouveau »).
  useLayoutEffect(() => {
    if (!events) return;
    if (seen.current === null) { seen.current = new Set(events.map((e) => e.key)); return; }
    const known = seen.current;
    const added = events.filter((e) => !known.has(e.key)).map((e) => e.key);
    events.forEach((e) => known.add(e.key));
    if (added.length) setFresh(new Set(added));
  }, [events]);
  useEffect(() => {
    if (!fresh.size) return undefined;
    const t = window.setTimeout(() => setFresh(new Set()), 1400);
    return () => window.clearTimeout(t);
  }, [fresh]);

  const list = events ?? [];
  const rows = all ? list : list.slice(0, SHOWN);

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white" aria-labelledby="pilotage-activite">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
        <h2 id="pilotage-activite" className="fd-display text-[16px] text-ink">Activité en direct</h2>
        <span className="text-[12px] text-ink-faint">Dernières actions des membres · relu toutes les 30 s</span>
      </div>

      {!events ? (
        <div className="flex flex-1 items-center justify-center py-10 text-[13px] text-ink-faint">
          {status === 'error' ? 'Activité indisponible pour l’instant.' : <Loader2 className="h-5 w-5 animate-spin" aria-label="Chargement" />}
        </div>
      ) : list.length === 0 ? (
        <p className="flex-1 px-5 py-10 text-center text-[13px] text-ink-faint">Aucune activité récente</p>
      ) : (
        <>
          <div aria-hidden className="hidden border-y border-line bg-[#faf9f7] px-5 py-2 text-[11px] font-semibold uppercase tracking-[.06em] text-ink-faint sm:grid sm:grid-cols-[88px_minmax(0,130px)_120px_minmax(0,1fr)] sm:gap-x-4">
            <span>Heure</span><span>Membre</span><span>Action</span><span>Contenu</span>
          </div>
          <ol className="divide-y divide-[#f2f1ee] border-t border-line sm:border-t-0" aria-label="Dernières actions">
            {rows.map((e) => {
              const k = styleOf(e);
              const Icon = k.icon;
              const isNew = fresh.has(e.key);
              return (
                <li key={e.key}
                  className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-2.5 sm:grid-cols-[88px_minmax(0,130px)_120px_minmax(0,1fr)] sm:gap-x-4 sm:px-5 ${
                    isNew ? 'bg-brand-soft' : 'bg-transparent transition-colors duration-[1600ms] ease-out'}`}>
                  <time dateTime={e.at} title={exactTime(e.at)}
                    className="fd-nums order-3 whitespace-nowrap text-right text-[12px] text-ink-faint sm:order-1 sm:text-left">
                    {agoShort(e.at, now)}
                  </time>
                  <span className="order-2 min-w-0 truncate text-[13px]">
                    {e.username
                      ? <Link to={`/profile/${e.username}`} className="font-medium text-ink hover:text-brand hover:underline">{e.username}</Link>
                      : <span className="text-ink-faint">Compte supprimé</span>}
                  </span>
                  <span className="order-1 sm:order-3">
                    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11.5px] font-medium ${k.cls}`}>
                      <Icon className="h-3 w-3 shrink-0" aria-hidden /> {k.label}
                    </span>
                  </span>
                  <span className={`order-4 col-span-3 min-w-0 sm:col-span-1 ${!e.content && e.kind !== 'skilliq' && e.kind !== 'ds' ? 'hidden sm:block' : ''}`}>
                    <What e={e} />
                  </span>
                </li>
              );
            })}
          </ol>
          {list.length > SHOWN && (
            <div className="mt-auto border-t border-line px-4 py-2.5 sm:px-5">
              <button type="button" onClick={() => setAll((v) => !v)} aria-expanded={all}
                className="inline-flex items-center gap-1 rounded-lg px-1 text-[12.5px] font-semibold text-ink-soft hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
                <ChevronDown className={`h-4 w-4 transition-transform ${all ? 'rotate-180' : ''}`} aria-hidden />
                {all ? 'Replier' : `Tout voir (${list.length})`}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default LiveActivity;
