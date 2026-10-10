/**
 * Visites guidées « comme dans un jeu » : l'écran s'assombrit, l'élément expliqué reste éclairé et
 * une bulle dit à quoi il sert. Définitions des visites : lib/tours.ts.
 *
 * - Démarrage automatique la première fois qu'une page (ou un état de page) est vue, une fois la page
 *   chargée et stable, et jamais par-dessus une fenêtre ouverte (cookies, conditions, connexion…).
 *   Seulement pour un membre connecté qui a fini son onboarding (un visiteur venu de Google veut lire
 *   l'énoncé, pas un voile sombre), et en version courte : 3 étapes au plus (`autoSteps`).
 * - Visite complète avec le bouton « ? » (TourHelpButton).
 * - Mesure (Pilotage › Usage) : lancements automatiques, « Passer » et visites menées au bout.
 * - « Déjà vu » est retenu sur l'appareil (localStorage) : simple confort, rien de grave s'il se perd.
 */
import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { trackAction } from '@/lib/usage';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { HelpCircle, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/components/auth/AuthController';
import { TOURS, resolveText, stepKey, type Tour, type TourContext, type TourStep } from '@/lib/tours';

const SEEN_KEY = 'fidni.visites-vues';

const readSeen = (): Record<string, number> => {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}') || {}; } catch { return {}; }
};
const markSeen = (tour: Tour) => {
  try {
    const seen = readSeen();
    seen[tour.id] = tour.version ?? 1;
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  } catch { /* stockage indisponible : la visite pourra réapparaître, sans gravité */ }
};
const isSeen = (tour: Tour) => (readSeen()[tour.id] ?? 0) >= (tour.version ?? 1);

/** Premier élément `data-tour="name"` réellement visible (ni masqué, ni hors du rendu). */
export function findTarget(names: string | string[] | undefined): HTMLElement | null {
  if (!names) return null;
  for (const name of Array.isArray(names) ? names : [names]) {
    const els = document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`);
    for (const el of Array.from(els)) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden') return el;
    }
  }
  return null;
}

/** Une fenêtre est ouverte (bandeau cookies, conditions, connexion, menu mobile…) : on attend. */
const somethingOpen = () =>
  document.body.classList.contains('mobile-menu-open')
  // Une autre demande est déjà à l'écran (« Tu avais trouvé ? ») : une seule à la fois.
  || !!findTarget('trouve')
  || Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"], [aria-modal="true"]'))
    .some((el) => !el.closest('[data-tour-card]') && el.getBoundingClientRect().height > 0);

/** Visite en cours : ses étapes retenues (selon le membre), courte au lancement automatique. */
interface ActiveTour { tour: Tour; steps: TourStep[]; short: boolean }

function prepare(tour: Tour, context: TourContext, auto: boolean): ActiveTour {
  const steps = tour.steps.filter((s) => !s.when || s.when(context));
  if (!auto) return { tour, steps, short: false };
  const wanted = tour.autoSteps;
  const pool = wanted
    ? steps.filter((s) => wanted.includes(stepKey(s) ?? '')).sort((a, b) => wanted.indexOf(stepKey(a) ?? '') - wanted.indexOf(stepKey(b) ?? ''))
    : steps;
  const visible = (list: TourStep[]) => list.filter((s) => !s.target || findTarget(s.target)).slice(0, 3);
  const chosen = visible(pool);
  const short = chosen.length ? chosen : visible(steps);
  return { tour, steps: short, short: short.length < steps.length };
}

interface TourApi {
  /** Une visite existe pour la page affichée (le bouton « ? » ne s'affiche que dans ce cas). */
  hasTour: boolean;
  start: () => void;
}
const TourCtx = createContext<TourApi>({ hasTour: false, start: () => undefined });
export const useTour = () => useContext(TourCtx);

export const TourProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { pathname } = useLocation();
  const { user } = useAuth();
  // Fenêtre de connexion / inscription ouverte : la visite se met en pause (elle la masquait).
  const { isOpen: authOpen } = useAuthModal();
  const [active, setActive] = useState<ActiveTour | null>(null);
  const [available, setAvailable] = useState<Tour | null>(null);
  const stableSince = useRef<Record<string, number>>({});

  const context: TourContext = useMemo(() => ({
    kind: /^\/exams/.test(pathname) ? 'exam' : /^\/lessons/.test(pathname) ? 'lesson' : 'exercise',
    isTeacher: user?.profile?.user_type === 'teacher',
  }), [pathname, user]);
  // Lus par la surveillance ci-dessous sans la relancer à chaque changement.
  const contextRef = useRef(context);
  contextRef.current = context;
  // Membre connecté qui a fini son onboarding (sinon une seule demande à la fois : choisir sa classe).
  const canAutoRef = useRef(false);
  canAutoRef.current = !!user && user.profile?.onboarding_completed !== false;
  const activeRef = useRef(active);
  activeRef.current = active;

  // Changement de page : la visite en cours n'a plus de sens.
  useEffect(() => { setActive(null); stableSince.current = {}; }, [pathname]);

  // Surveillance légère : quelle visite s'applique à ce qu'on voit, et faut-il la lancer ?
  useEffect(() => {
    const tick = () => {
      const candidates = TOURS.filter((t) => t.match.test(pathname) && findTarget(t.requires));
      // La plus spécifique (la dernière définie) répond au bouton « ? ».
      const current = candidates[candidates.length - 1] ?? null;
      setAvailable((prev) => (prev?.id === current?.id ? prev : current));

      const now = Date.now();
      const present = new Set(candidates.map((t) => t.id));
      for (const id of Object.keys(stableSince.current)) if (!present.has(id)) delete stableSince.current[id];
      for (const t of candidates) stableSince.current[t.id] ??= now;

      // Lancement automatique : membres connectés seulement.
      if (active || !canAutoRef.current || document.visibilityState !== 'visible' || somethingOpen()) return;
      const next = candidates.find((t) => t.auto !== false && !isSeen(t) && now - stableSince.current[t.id] >= 1200);
      const prepared = next && prepare(next, contextRef.current, true);
      // Rien d'affichable pour l'instant (cibles pas encore là) : on réessaie au prochain passage.
      if (prepared && prepared.steps.some((s) => !s.target || findTarget(s.target))) {
        setActive(prepared);
        trackAction('visite-auto');
      }
    };
    tick();
    const id = window.setInterval(tick, 700);
    return () => window.clearInterval(id);
  }, [pathname, active]);

  const start = useCallback(() => {
    if (!available) return;
    setActive(prepare(available, contextRef.current, false));
    trackAction('visite-guidee');
  }, [available]);

  /** `done` : vrai = menée au bout, faux = passée (croix, « Passer », Échap) ; absent = rien à montrer. */
  const finish = useCallback((done?: boolean) => {
    const current = activeRef.current;
    if (current) markSeen(current.tour);
    if (current && done !== undefined) trackAction(done ? 'visite-finie' : 'visite-passee');
    setActive(null);
  }, []);

  return (
    <TourCtx.Provider value={{ hasTour: !!available, start }}>
      {children}
      {active && !authOpen && createPortal(
        <TourOverlay key={`${active.tour.id}-${active.short ? 'courte' : 'complete'}`} active={active} context={context} onClose={finish} />,
        document.body,
      )}
    </TourCtx.Provider>
  );
};

/* ───────────────────────────── Bouton « ? » ───────────────────────────── */

export const TourHelpButton: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => {
  const { hasTour, start } = useTour();
  if (!hasTour) return null;
  return (
    <button
      type="button"
      onClick={start}
      data-tour="aide"
      aria-label="Guide de cette page"
      title="Guide de cette page"
      className={className}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 38, height: 38, borderRadius: 10, border: '1px solid #e7e3dc',
        background: '#fff', color: '#33302b', cursor: 'pointer', flexShrink: 0, ...style,
      }}
    >
      <HelpCircle className="w-[18px] h-[18px]" />
    </button>
  );
};

/* ───────────────────────────── Voile + bulle ───────────────────────────── */

const PAD = 6;       // marge du halo autour de l'élément
const GAP = 14;      // distance bulle ↔ élément
const EDGE = 12;     // marge minimale au bord de l'écran
const TOP_BAR = 60;  // barre du haut collante : ne pas cacher l'élément dessous

interface Placement { top: number; left: number; arrow: 'up' | 'down' | null; arrowLeft: number }

/** Hauteur de la barre d'onglets du téléphone (un élément dessous serait caché). */
const bottomInset = () => document.querySelector<HTMLElement>('[data-tour="barre-mobile"]')?.getBoundingClientRect().height ?? 0;

const TourOverlay: React.FC<{ active: ActiveTour; context: TourContext; onClose: (done?: boolean) => void }> = ({ active, context, onClose }) => {
  const { tour, steps, short } = active;
  const [index, setIndex] = useState(() => nextVisible(steps, 0, 1));
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [cardSize, setCardSize] = useState({ w: 340, h: 180 });
  const cardRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);

  // Étapes réellement affichables (pour « 2 / 5 ») : recalculées à chaque étape, la page peut bouger.
  const visibleSteps = steps.map((s, i) => ({ s, i })).filter(({ s }) => !s.target || findTarget(s.target));
  const position = visibleSteps.findIndex(({ i }) => i === index);
  const step = index >= 0 ? steps[index] : null;
  const isLast = index >= 0 && nextVisible(steps, index + 1, 1) === -1;
  const isFirst = index >= 0 && nextVisible(steps, index - 1, -1) === -1;

  useEffect(() => { if (index === -1) onClose(); }, [index, onClose]);

  // Amener l'élément à l'écran puis suivre sa position (défilement, redimensionnement, page qui bouge).
  useLayoutEffect(() => {
    if (!step) return;
    const el = findTarget(step.target);
    // Un élément fixé (barre du bas…) est déjà à l'écran : rien à faire défiler.
    if (el && getComputedStyle(el).position !== 'fixed') {
      const r = el.getBoundingClientRect();
      if (r.top < TOP_BAR + PAD || r.bottom > window.innerHeight - PAD - bottomInset()) {
        el.scrollIntoView({ block: r.height > window.innerHeight * 0.6 ? 'start' : 'center', inline: 'nearest' });
      }
    }
    const measure = () => {
      const target = findTarget(step.target);
      setRect(target ? target.getBoundingClientRect() : null);
    };
    measure();
    const id = window.setInterval(measure, 250);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [step]);

  useLayoutEffect(() => {
    const el = cardRef.current;
    if (el) setCardSize((s) => (s.w === el.offsetWidth && s.h === el.offsetHeight ? s : { w: el.offsetWidth, h: el.offsetHeight }));
  });

  useEffect(() => { primaryRef.current?.focus({ preventScroll: true }); }, [index]);

  const go = useCallback((dir: 1 | -1) => {
    setIndex((i) => nextVisible(steps, i + dir, dir) === -1 && dir === -1 ? i : nextVisible(steps, i + dir, dir));
  }, [steps]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(false); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, onClose]);

  if (!step) return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const hole = rect && {
    top: Math.max(rect.top - PAD, 0),
    left: Math.max(rect.left - PAD, 0),
    right: Math.min(rect.right + PAD, vw),
    bottom: Math.min(rect.bottom + PAD, vh),
  };
  const place = placeCard(hole, cardSize, vw, vh);
  const titleId = `tour-title-${tour.id}`;

  return (
    <div className="fixed inset-0 z-[1000] print:hidden" data-tour-card>
      {/* Voile : un halo découpé autour de l'élément, ou un voile plein pour une bulle centrée.
          Il capte les clics pour que la page ne bouge pas pendant la visite. */}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />
      {hole ? (
        <div
          aria-hidden
          className="absolute pointer-events-none rounded-xl transition-all duration-200 ease-out motion-reduce:transition-none"
          style={{
            top: hole.top, left: hole.left, width: hole.right - hole.left, height: hole.bottom - hole.top,
            boxShadow: '0 0 0 2px #c0892f, 0 0 0 9999px rgba(20,18,16,.62)',
          }}
        />
      ) : (
        <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: 'rgba(20,18,16,.62)' }} />
      )}

      {/* La bulle */}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute bg-white rounded-2xl border border-line shadow-2xl"
        style={{ top: place.top, left: place.left, width: Math.min(340, vw - 2 * EDGE), padding: '16px 18px 14px' }}
      >
        {place.arrow && (
          <span
            aria-hidden
            className="absolute w-3 h-3 bg-white border-line rotate-45"
            style={{
              left: place.arrowLeft,
              ...(place.arrow === 'up'
                ? { top: -7, borderLeftWidth: 1, borderTopWidth: 1 }
                : { bottom: -7, borderRightWidth: 1, borderBottomWidth: 1 }),
            }}
          />
        )}
        <div className="flex items-start justify-between gap-3">
          <span className="text-[10.5px] font-semibold uppercase tracking-widest text-gold-strong fd-nums"
            style={{ fontFamily: "'DM Mono', ui-monospace, monospace" }}>
            {visibleSteps.length > 1 ? `${position + 1} / ${visibleSteps.length}` : 'Guide'}
          </span>
          <button type="button" onClick={() => onClose(false)} aria-label="Fermer le guide"
            className="-mt-2 -mr-2.5 inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-faint hover:text-ink hover:bg-[#f2f1ee]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <h2 id={titleId} className="mt-1 text-[15.5px] font-bold text-ink leading-snug">{resolveText(step.title, context)}</h2>
        <p className="mt-1 text-[13.5px] text-ink-soft leading-relaxed">{resolveText(step.body, context)}</p>
        {/* Version courte : le reste est sur « ? » (sauf si l'étape en parle déjà). */}
        {short && isLast && stepKey(step) !== 'aide' && (
          <p className="mt-2 text-[12.5px] text-ink-faint">Le guide complet de la page : bouton ? en haut.</p>
        )}

        <div className="mt-3.5 flex items-center gap-2">
          {!isLast && (
            <button type="button" onClick={() => onClose(false)} className="min-h-[36px] text-[12.5px] font-medium text-ink-faint hover:text-ink">
              Passer
            </button>
          )}
          <span className="flex-1" />
          {!isFirst && (
            <button type="button" onClick={() => go(-1)}
              className="min-h-[36px] px-3 py-1.5 rounded-lg border border-line text-[13px] font-medium text-ink-soft hover:border-ink">
              Précédent
            </button>
          )}
          <button ref={primaryRef} type="button" onClick={() => (isLast ? onClose(true) : go(1))}
            className="min-h-[36px] px-3.5 py-1.5 rounded-lg bg-brand text-white text-[13px] font-semibold hover:bg-brand-hover">
            {isLast ? 'C’est compris' : 'Suivant'}
          </button>
        </div>
      </div>
    </div>
  );
};

/** Prochaine étape affichable à partir de `from` dans le sens `dir` (-1 s'il n'y en a pas). */
function nextVisible(steps: TourStep[], from: number, dir: 1 | -1): number {
  for (let i = from; i >= 0 && i < steps.length; i += dir) {
    const s = steps[i];
    if (!s.target || findTarget(s.target)) return i;
  }
  return -1;
}

function placeCard(
  hole: { top: number; left: number; right: number; bottom: number } | null,
  card: { w: number; h: number },
  vw: number,
  vh: number,
): Placement {
  const w = Math.min(card.w, vw - 2 * EDGE);
  if (!hole) return { top: Math.max(EDGE, (vh - card.h) / 2), left: (vw - w) / 2, arrow: null, arrowLeft: 0 };

  const centerX = (hole.left + hole.right) / 2;
  const left = Math.min(Math.max(centerX - w / 2, EDGE), vw - w - EDGE);
  const arrowLeft = Math.min(Math.max(centerX - left - 6, 18), w - 30);

  if (vh - hole.bottom >= card.h + GAP + EDGE) return { top: hole.bottom + GAP, left, arrow: 'up', arrowLeft };
  if (hole.top - TOP_BAR >= card.h + GAP + EDGE || hole.top >= card.h + GAP + EDGE) {
    return { top: hole.top - GAP - card.h, left, arrow: 'down', arrowLeft };
  }
  // Élément trop haut pour loger la bulle au-dessus ou en dessous : à côté s'il y a la place…
  if (vw - hole.right >= w + GAP + EDGE) {
    return { top: Math.min(Math.max(hole.top, TOP_BAR + EDGE), vh - card.h - EDGE), left: hole.right + GAP, arrow: null, arrowLeft: 0 };
  }
  // … sinon en bas de l'écran, par-dessus l'élément.
  return { top: vh - card.h - EDGE, left: (vw - w) / 2, arrow: null, arrowLeft: 0 };
}
