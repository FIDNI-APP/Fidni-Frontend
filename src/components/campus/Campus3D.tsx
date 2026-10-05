import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, BarChart3, BookOpen, Brain, GraduationCap, Route, Trophy, X,
} from 'lucide-react';
import { APlusIcon } from '@/components/icons/APlusIcon';
import { LessonIcon } from '@/components/icons/LessonIcon';
import type { DashboardStats } from '@/lib/api';
import { useHomeView } from '@/stores/homeViewStore';
import { CAMPUS_ROOMS, RoomId } from './campusRooms';
import { CampusBag } from './CampusBag';
import { campusStats } from './campusPins';
import { CampusEngine } from './engine/CampusEngine';
import { useImmersiveFit } from './useImmersiveFit';
import { probeWebGL } from './webgl';
import './campus.css';
import './campus3d.css';

/** Mêmes icônes que la sidebar, pour que la 3D parle le même langage. */
const ROOM_ICONS: Record<RoomId, React.ComponentType<{ className?: string }>> = {
  direction: BarChart3, bibliotheque: LessonIcon, td: BookOpen, amphi: APlusIcon,
  stade: Route, gare: Trophy, labo: Brain, classes: GraduationCap,
};
const HINT_KEY = 'fd-campus-hint-seen';

/** Les textures (enseignes, tableau noir) sont dessinées avec les polices du site : on les attend un peu. */
async function fontsReady() {
  if (!document.fonts) return;
  const load = Promise.all(['600 44px Fraunces', 'italic 500 66px Fraunces', '500 40px "DM Mono"', '600 30px "DM Sans"'].map((f) => document.fonts.load(f)));
  await Promise.race([load, new Promise((r) => setTimeout(r, 2500))]).catch(() => undefined);
}

function readHintSeen() { try { return localStorage.getItem(HINT_KEY) === '1'; } catch { return false; } }

interface Props {
  /** Vue affichée (true) ou gardée en mémoire derrière la vue classique (false) pour une bascule instantanée. */
  active: boolean;
  stats: DashboardStats | null;
  username?: string;
  /** Appelé si la 3D ne peut pas démarrer : l'accueil revient à la vue classique. */
  onUnavailable?: () => void;
}

/** Vue 3D de l'accueil : chaque bâtiment ouvre une page du site. Chargée à la demande (React.lazy). */
export default function Campus3D({ active, stats, username, onUnavailable }: Props) {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<CampusEngine | null>(null);
  const labelRefs = useRef<Partial<Record<RoomId, HTMLButtonElement>>>({});
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [focus, setFocus] = useState<RoomId | null>(null);
  const [bagOpen, setBagOpen] = useState(false);
  const [hint, setHint] = useState(() => !readHintSeen());
  const hoverRoom = useHomeView((s) => s.hoverRoom);

  const select = useCallback((id: RoomId | null) => {
    const eng = engineRef.current; if (!eng) return;
    setBagOpen(false);
    const room = id ? CAMPUS_ROOMS.find((r) => r.id === id) : undefined;
    if (room) { eng.focus(room.id, room.cam); setFocus(room.id); }
    else { eng.overview(); setFocus(null); }
  }, []);

  const hideHint = useCallback(() => {
    setHint(false);
    try { localStorage.setItem(HINT_KEY, '1'); } catch { /* stockage indisponible */ }
  }, []);

  // Moteur : un canvas neuf à chaque montage, tout est libéré au démontage.
  useEffect(() => {
    const root = rootRef.current;
    const support = probeWebGL();
    if (!root || !support.ok) { setFailed(true); return; }
    let cancelled = false, engine: CampusEngine | null = null;
    const canvas = document.createElement('canvas');
    canvas.className = 'fdc-canvas';
    canvas.setAttribute('aria-label', 'Campus 3D : chaque bâtiment ouvre une page du site');
    root.prepend(canvas);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    fontsReady().then(() => {
      if (cancelled) return;
      try {
        engine = new CampusEngine(root, canvas, { onSelect: select, onInteract: hideHint }, { tier: support.tier, reduceMotion, autoTier: true });
        engine.setLabels(labelRefs.current);
        engineRef.current = engine;
        setReady(true);
      } catch (err) {
        console.error('Campus3D: la vue 3D n’a pas pu démarrer', err);
        setFailed(true);
      }
    });
    return () => {
      cancelled = true;
      engine?.dispose();
      engineRef.current = null;
      canvas.remove();
    };
  }, [select, hideHint]);

  // Affichée : occupe l'espace sous la barre du haut ; gardée en mémoire : ferme le cartable.
  useImmersiveFit(rootRef, active);
  useEffect(() => { if (!active) setBagOpen(false); }, [active]);

  // Survol d'une entrée de la sidebar : le bâtiment correspondant se soulève.
  useEffect(() => { if (ready) engineRef.current?.setUiHover(hoverRoom); }, [hoverRoom, ready]);

  // Clavier (seulement quand la vue est affichée) : 1–8, flèches, +/−, C pour le cartable, Échap.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      const eng = engineRef.current; if (!eng) return;
      const room = CAMPUS_ROOMS.find((r) => r.key === e.key);
      if (room) { select(room.id); hideHint(); return; }
      switch (e.key) {
        case 'Escape': if (bagOpen) setBagOpen(false); else if (focus) select(null); else return; break;
        case 'c': case 'C': setBagOpen((o) => !o); break;
        case 'ArrowLeft': eng.nudge(0.3, 0); break;
        case 'ArrowRight': eng.nudge(-0.3, 0); break;
        case 'ArrowUp': eng.nudge(0, -0.12); break;
        case 'ArrowDown': eng.nudge(0, 0.12); break;
        case '+': case '=': eng.nudge(0, 0, 0.85); break;
        case '-': eng.nudge(0, 0, 1.15); break;
        default: return;
      }
      e.preventDefault();
      hideHint();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, select, hideHint, bagOpen, focus]);

  const room = focus ? CAMPUS_ROOMS.find((r) => r.id === focus) : undefined;
  const RoomIcon = room ? ROOM_ICONS[room.id] : null;
  const figures = room ? campusStats(room.id, stats) : [];

  return (
    <div ref={rootRef} className="fdc-root fdc-3d">
      <div className="fdc-labels">
        {CAMPUS_ROOMS.map((r) => (
          <button
            key={r.id}
            type="button"
            tabIndex={-1}
            className="fdc-tag is-gone"
            ref={(el) => { if (el) labelRefs.current[r.id] = el; }}
            onClick={() => { select(r.id); hideHint(); }}
            onMouseEnter={() => engineRef.current?.setUiHover(r.id)}
            onMouseLeave={() => engineRef.current?.setUiHover(null)}
            aria-label={`${r.page} — ${r.building}`}
          >
            <span className="k">{r.key}</span>
            <span className="pg">{r.page}</span>
            <span className="bn">· {r.building}</span>
          </button>
        ))}
      </div>

      {ready && (
        <div className={`fdc-hint${hint ? '' : ' is-hidden'}`} aria-hidden={!hint}>
          Glisse pour tourner · molette pour zoomer · clique sur un bâtiment
        </div>
      )}

      {room && RoomIcon && (
        <section className="fdc-card fdc-panel" aria-labelledby="fdc-room-title">
          <button type="button" className="close" onClick={() => select(null)} aria-label="Revenir à la vue d'ensemble">
            <X className="w-4 h-4" />
          </button>
          <div className="eyebrow"><span className="key">{room.key}</span>{room.building}</div>
          <h2 id="fdc-room-title"><RoomIcon className="w-6 h-6" />{room.page}</h2>
          <p>{room.desc}</p>
          {figures.length > 0 && (
            <div className="fdc-stats">
              {figures.map(([v, l]) => <div key={l}><b>{v}</b><span>{l}</span></div>)}
            </div>
          )}
          <div className="fdc-actions">
            <button type="button" className="fdc-btn primary" onClick={() => navigate(room.route(username))}>
              Ouvrir {room.page} <ArrowRight className="w-4 h-4" />
            </button>
            <button type="button" className="fdc-btn ghost" onClick={() => select(null)} aria-label="Revenir à la vue d'ensemble">Retour</button>
          </div>
        </section>
      )}

      {ready && <CampusBag open={bagOpen} onOpenChange={setBagOpen} username={username} />}

      {!ready && !failed && <div className="fdc-state"><p>On ouvre les portes du campus…</p></div>}
      {failed && (
        <div className="fdc-state">
          <div>
            <p>La vue 3D n’a pas pu démarrer sur cet appareil.</p>
            {onUnavailable && <button type="button" className="fdc-btn ghost" onClick={onUnavailable}>Revenir à la vue classique</button>}
          </div>
        </div>
      )}
    </div>
  );
}
