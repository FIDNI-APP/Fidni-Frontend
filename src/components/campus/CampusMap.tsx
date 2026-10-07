import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, BookOpen, ClipboardList, Cog, Compass, Dumbbell, GraduationCap, Landmark, Users,
} from 'lucide-react';
import type { DashboardStats } from '@/lib/api';
import { useHomeView, type CampusRoomId } from '@/stores/homeViewStore';
import { CampusBag } from './CampusBag';
import { MAP_PINS, campusStats, loadMapImage, nameSaysPage, type PinIcon } from './campusPins';
import { useImmersiveFit } from './useImmersiveFit';
import { useAuth } from '@/contexts/AuthContext';
import { canSeeParcours } from '@/lib/features';
import './campus.css';
import './campusmap.css';

const ICONS: Record<PinIcon, React.ComponentType<{ className?: string }>> = {
  landmark: Landmark, book: BookOpen, dumbbell: Dumbbell, exam: ClipboardList,
  compass: Compass, cap: GraduationCap, cog: Cog, users: Users,
};
const HINT_KEY = 'fd-campus-pan-seen';
/** Marge minimale aux bords de l'écran, largeur de la fiche d'un bâtiment. */
const EDGE = 10, CARD_W = 300;

interface Size { w: number; h: number }
/** Fiche ouverte : position en pixels dans l'illustration affichée. */
interface Card { id: CampusRoomId; left: number; top: number; width: number; above: boolean }

function readHintSeen() { try { return localStorage.getItem(HINT_KEY) === '1'; } catch { return false; } }

interface Props {
  /** Vue affichée (true) ou gardée en mémoire derrière la vue classique (false) pour une bascule instantanée. */
  active: boolean;
  stats: DashboardStats | null;
  username?: string;
  /** Appelé si l'illustration ne peut pas se charger : l'accueil revient à la vue classique. */
  onUnavailable?: () => void;
}

/**
 * Accueil « campus » : l'illustration du campus sert de plan, chaque étiquette ouvre une page du site.
 * Aucune animation d'ambiance : seuls le survol et le clic font réagir la carte.
 */
export default function CampusMap({ active, stats, username, onUnavailable }: Props) {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef<Size | null>(null);
  const pillRefs = useRef<Partial<Record<CampusRoomId, HTMLButtonElement>>>({});
  const timer = useRef<number | undefined>(undefined);
  const drag = useRef<{ x: number; y: number; sl: number; st: number } | null>(null);
  const pointer = useRef('mouse');
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [size, setSize] = useState<Size | null>(null);
  const [card, setCard] = useState<Card | null>(null);
  const [bagOpen, setBagOpen] = useState(false);
  const [pannable, setPannable] = useState(false);
  const [hint, setHint] = useState(() => !readHintSeen());
  const hoverRoom = useHomeView((s) => s.hoverRoom);
  const { user } = useAuth();
  // Parcours pas encore publié : son étiquette (le stade) n'apparaît que pour les admins.
  const pins = canSeeParcours(user) ? MAP_PINS : MAP_PINS.filter((p) => p.id !== 'stade');

  const hideHint = useCallback(() => {
    setHint(false);
    try { localStorage.setItem(HINT_KEY, '1'); } catch { /* stockage indisponible */ }
  }, []);

  // L'illustration (déjà téléchargée si le sélecteur a été survolé).
  useEffect(() => {
    let alive = true;
    setFailed(false);
    loadMapImage().then((i) => { if (alive) { if (i) setImg(i); else setFailed(true); } });
    return () => { alive = false; };
  }, [attempt]);

  // Affichée : occupe l'espace sous la barre du haut ; gardée en mémoire : tout se referme.
  useImmersiveFit(rootRef, active);
  useEffect(() => { if (!active) { setBagOpen(false); setCard(null); } }, [active]);

  // L'illustration couvre toute la zone (comme un fond d'écran) ; ce qui dépasse se parcourt en glissant.
  useEffect(() => {
    const view = viewRef.current;
    if (!img || !view) return;
    const layout = () => {
      const cw = view.clientWidth, ch = view.clientHeight;
      if (!cw || !ch) return; // vue cachée
      const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
      const w = Math.ceil(img.naturalWidth * s), h = Math.ceil(img.naturalHeight * s);
      setSize((prev) => (prev && prev.w === w && prev.h === h ? prev : { w, h }));
    };
    layout();
    const ro = new ResizeObserver(layout);
    ro.observe(view);
    return () => ro.disconnect();
  }, [img]);

  /** Garde chaque étiquette à l'écran près des bords, sans la détacher de sa tige. */
  const place = useCallback(() => {
    const view = viewRef.current, sz = sizeRef.current;
    if (!view || !sz) return;
    const sl = view.scrollLeft, cw = view.clientWidth;
    // Toutes les mesures d'abord, puis toutes les écritures : un seul calcul de mise en page.
    const shifts = MAP_PINS.map((p) => {
      const el = pillRefs.current[p.id];
      if (!el) return null;
      const pw = el.offsetWidth, x = p.x * sz.w - sl - pw / 2, room = pw / 2 - 18;
      const dx = Math.min(Math.max(x, EDGE), cw - EDGE - pw) - x;
      return [el, Math.round(Math.max(-room, Math.min(room, dx)))] as const;
    });
    for (const s of shifts) if (s) s[0].style.setProperty('--dx', `${s[1]}px`);
  }, []);

  // Nouvelle taille ou retour sur la vue : on recentre sur les bâtiments.
  useLayoutEffect(() => {
    const view = viewRef.current;
    sizeRef.current = size;
    if (!size || !view || !active) return;
    const xs = MAP_PINS.map((p) => p.x), ys = MAP_PINS.map((p) => p.y);
    view.scrollLeft = ((Math.min(...xs) + Math.max(...xs)) / 2) * size.w - view.clientWidth / 2;
    view.scrollTop = ((Math.min(...ys) + Math.max(...ys)) / 2) * size.h - 35 - view.clientHeight / 2; // 35 : les étiquettes sont au-dessus des ancres
    setPannable(size.w - view.clientWidth > view.clientWidth * 0.12 || size.h - view.clientHeight > view.clientHeight * 0.12);
    setCard(null);
    place();
    document.fonts?.ready.then(place); // les étiquettes changent de largeur quand les polices arrivent
  }, [size, active, place]);

  // Molette verticale : quand la carte ne dépasse que sur les côtés, elle défile de gauche à droite.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const canX = view.scrollWidth > view.clientWidth + 2, canY = view.scrollHeight > view.clientHeight + 2;
      if (canX && !canY) { view.scrollLeft += e.deltaY; e.preventDefault(); }
    };
    view.addEventListener('wheel', onWheel, { passive: false });
    return () => view.removeEventListener('wheel', onWheel);
  }, []);

  const later = (fn: () => void, ms: number) => { window.clearTimeout(timer.current); timer.current = window.setTimeout(fn, ms); };
  const cancel = () => window.clearTimeout(timer.current);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  /** Ouvre la fiche d'un bâtiment, sous l'étiquette ou au-dessus selon la place disponible. */
  const openCard = useCallback((id: CampusRoomId) => {
    const view = viewRef.current, sz = sizeRef.current, p = MAP_PINS.find((q) => q.id === id);
    if (!view || !sz || !p) return;
    const ax = p.x * sz.w, ay = p.y * sz.h, sx = ax - view.scrollLeft, sy = ay - view.scrollTop;
    const cw = view.clientWidth, width = Math.min(CARD_W, cw - 2 * EDGE);
    const left = view.scrollLeft + Math.min(Math.max(sx - width / 2, EDGE), cw - EDGE - width);
    const above = sy > view.clientHeight * 0.55;
    const pill = pillRefs.current[id], canvas = pill?.closest('.fdm-canvas');
    const pillTop = pill && canvas ? pill.getBoundingClientRect().top - canvas.getBoundingClientRect().top : ay - 70;
    setCard({ id, left, width, above, top: above ? pillTop - 10 : ay + 14 });
  }, []);

  useEffect(() => { if (bagOpen) setCard(null); }, [bagOpen]);

  // Clavier (seulement quand la vue est affichée) : C pour le cartable, Échap pour refermer.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.key === 'Escape') {
        if (bagOpen) setBagOpen(false);
        else if (card) { setCard(null); (document.activeElement as HTMLElement | null)?.blur(); }
        else return;
      } else if (e.key === 'c' || e.key === 'C') setBagOpen((o) => !o);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, bagOpen, card]);

  // Glisser à la souris pour parcourir la carte (au doigt, le défilement natif s'en charge).
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const view = viewRef.current;
    if (pannable) hideHint();
    if (!view || e.pointerType !== 'mouse' || e.button !== 0 || (e.target as HTMLElement).closest('button, a, .fdm-card')) return;
    drag.current = { x: e.clientX, y: e.clientY, sl: view.scrollLeft, st: view.scrollTop };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current, view = viewRef.current;
    if (!d || !view) return;
    view.classList.add('is-dragging');
    view.scrollLeft = d.sl - (e.clientX - d.x);
    view.scrollTop = d.st - (e.clientY - d.y);
  };
  const endDrag = () => { drag.current = null; viewRef.current?.classList.remove('is-dragging'); };

  const onMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // En développement, Alt + clic donne la position d'un point de l'illustration, pour régler les étiquettes (campusPins.ts).
    if (import.meta.env.DEV && e.altKey && size) {
      const r = e.currentTarget.getBoundingClientRect();
      console.info(`x: ${((e.clientX - r.left) / size.w).toFixed(3)}, y: ${((e.clientY - r.top) / size.h).toFixed(3)}`);
      return;
    }
    if (!(e.target as HTMLElement).closest('.fdm-pin, .fdm-card')) setCard(null);
  };

  const cardPin = card ? MAP_PINS.find((p) => p.id === card.id) : undefined;
  const CardIcon = cardPin ? ICONS[cardPin.icon] : null;
  const figures = cardPin ? campusStats(cardPin.id, stats) : [];

  return (
    <div ref={rootRef} className="fdc-root fdm-root">
      <div
        ref={viewRef}
        className={`fdm-view${pannable ? ' is-pannable' : ''}`}
        onScroll={place}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onPointerCancel={endDrag}
        onTouchStart={pannable ? hideHint : undefined}
      >
        {img && size && (
          <div className="fdm-canvas" style={{ width: size.w, height: size.h }} onClick={onMapClick}>
            <img className="fdm-img" src={img.src} width={size.w} height={size.h} alt="" draggable={false} />
            <nav aria-label="Plan du campus : chaque bâtiment ouvre une page du site">
              {pins.map((p) => {
                const Icon = ICONS[p.icon];
                const open = card?.id === p.id;
                return (
                  <div
                    key={p.id}
                    className={`fdm-pin${hoverRoom === p.id ? ' is-hot' : ''}${open ? ' is-open' : ''}`}
                    style={{ left: p.x * size.w, top: p.y * size.h }}
                    onMouseEnter={() => later(() => openCard(p.id), card ? 0 : 110)}
                    onMouseLeave={() => later(() => setCard(null), 160)}
                  >
                    <span className="fdm-dot" aria-hidden="true" />
                    <span className="fdm-stem" aria-hidden="true" />
                    <button
                      ref={(el) => { if (el) pillRefs.current[p.id] = el; }}
                      type="button"
                      className="fdm-pill"
                      aria-describedby={open ? 'fdm-card' : undefined}
                      onPointerDown={(e) => { pointer.current = e.pointerType; }}
                      // Au clavier seulement : à la souris le survol s'en charge, au doigt c'est le premier appui.
                      onFocus={(e) => { if (e.currentTarget.matches(':focus-visible')) { cancel(); openCard(p.id); } }}
                      onBlur={() => later(() => setCard(null), 160)}
                      onClick={() => {
                        // Au doigt, un premier appui montre la fiche ; le second (ou « Ouvrir ») mène à la page.
                        if (pointer.current === 'touch' && !open) { cancel(); openCard(p.id); return; }
                        navigate(p.route(username));
                      }}
                    >
                      <span className="ic"><Icon className="w-[15px] h-[15px]" /></span>
                      <span className="tx">
                        <b>{p.name}</b>
                        {!nameSaysPage(p) && <small>{p.page}</small>}
                      </span>
                    </button>
                  </div>
                );
              })}
            </nav>

            {card && cardPin && CardIcon && (
              <section
                id="fdm-card"
                className={`fdc-card fdm-card${card.above ? ' is-above' : ''}`}
                style={{ left: card.left, top: card.top, width: card.width }}
                onMouseEnter={cancel}
                onMouseLeave={() => later(() => setCard(null), 160)}
                onFocus={cancel}
                onBlur={() => later(() => setCard(null), 160)}
              >
                <div className="eyebrow">{cardPin.name}</div>
                <h3><CardIcon className="w-5 h-5" />{cardPin.page}</h3>
                <p>{cardPin.desc}</p>
                {figures.length > 0 && (
                  <div className="fdc-stats">
                    {figures.map(([v, l]) => <div key={l}><b>{v}</b><span>{l}</span></div>)}
                  </div>
                )}
                <button type="button" className="fdc-btn primary" onClick={() => navigate(cardPin.route(username))}>
                  Ouvrir {cardPin.page} <ArrowRight className="w-4 h-4" />
                </button>
              </section>
            )}
          </div>
        )}
      </div>

      {img && size && pannable && (
        <div className={`fdm-hint${hint ? '' : ' is-hidden'}`} aria-hidden="true">Fais glisser pour parcourir le campus</div>
      )}

      {img && <CampusBag open={bagOpen} onOpenChange={setBagOpen} username={username} />}

      {!img && !failed && <div className="fdc-state"><p>On ouvre les portes du campus…</p></div>}
      {failed && (
        <div className="fdc-state">
          <div>
            <p>Le plan du campus n’a pas pu se charger.</p>
            <div className="fdc-actions" style={{ justifyContent: 'center' }}>
              <button type="button" className="fdc-btn ghost" onClick={() => setAttempt((n) => n + 1)}>Réessayer</button>
              {onUnavailable && <button type="button" className="fdc-btn ghost" onClick={onUnavailable}>Vue classique</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
