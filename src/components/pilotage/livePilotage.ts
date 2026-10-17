/**
 * Pilotage › « En direct » (12/10/2026) : GET /api/pilotage/direct/ relu toutes les 30 s tant que l'onglet du
 * navigateur est visible (en pause sinon, relu dès qu'il redevient visible). Backend : admin_dashboard.live.
 * La réponse est remise en forme ici : un champ absent ou d'un autre type devient zéro ou une liste vide.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api/apiClient';

export interface LiveDay { views: number; active: number; signups: number; work: number; visitors: number }
export interface LiveTodo { reports_open: number; ia_en_cours: number; ia_a_relire: number; brouillons: number }
export interface LiveContent { id: number; type: string; title: string; url: string }
export interface LiveEvent {
  /** Clé stable d'un évènement (sert à repérer les nouveaux à chaque relecture). */
  key: string;
  at: string;
  kind: string;
  username: string | null;
  label: string;
  content: LiveContent | null;
}
export interface LiveData {
  generated_at: string;
  today: LiveDay;
  yesterday: LiveDay;
  todo: LiveTodo;
  activity: LiveEvent[];
}
export type LiveStatus = 'loading' | 'ok' | 'error';

export const POLL_MS = 30_000;
const RETRY_MS = 10_000;

type Json = Record<string, unknown>;
const isObj = (v: unknown): v is Json => !!v && typeof v === 'object' && !Array.isArray(v);
const obj = (v: unknown): Json => (isObj(v) ? v : {});
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : fallback);

const day = (v: unknown): LiveDay => {
  const d = obj(v);
  return { views: num(d.views), active: num(d.active), signups: num(d.signups), work: num(d.work), visitors: num(d.visitors) };
};

export function normalizeLive(raw: unknown): LiveData {
  if (!isObj(raw)) throw new Error('Réponse inattendue du serveur.');
  const todo = obj(raw.todo);
  const seen = new Map<string, number>();
  const activity = (Array.isArray(raw.activity) ? raw.activity : []).filter(isObj).flatMap((e): LiveEvent[] => {
    const at = str(e.at);
    if (!at || Number.isNaN(new Date(at).getTime())) return [];
    const c = isObj(e.content) ? e.content : null;
    const content = c ? { id: num(c.id), type: str(c.type), title: str(c.title, 'Sans titre'), url: str(c.url, '/') } : null;
    const username = typeof e.username === 'string' && e.username ? e.username : null;
    const kind = str(e.kind, 'autre');
    const label = str(e.label);
    // Deux évènements identiques (même seconde, même membre…) gardent chacun leur clé.
    const base = `${at}|${kind}|${username ?? ''}|${content?.id ?? ''}|${label}`;
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return [{ key: n ? `${base}#${n}` : base, at, kind, username, label, content }];
  });
  return {
    generated_at: str(raw.generated_at, new Date().toISOString()),
    today: day(raw.today),
    yesterday: day(raw.yesterday),
    todo: {
      reports_open: num(todo.reports_open),
      ia_en_cours: num(todo.ia_en_cours), ia_a_relire: num(todo.ia_a_relire), brouillons: num(todo.brouillons),
    },
    activity,
  };
}

/**
 * Relit /api/pilotage/direct/ toutes les 30 s, seulement quand la page est visible. Après un échec : nouvel essai
 * au bout de 10 s (les dernières données restent affichées). `refresh()` relit tout de suite et relance le compte.
 */
export function useLivePilotage(enabled: boolean) {
  const [data, setData] = useState<LiveData | null>(null);
  const [status, setStatus] = useState<LiveStatus>('loading');
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const tickRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    let timer: number | undefined;
    let seq = 0;

    const schedule = (ms: number) => {
      window.clearTimeout(timer);
      if (document.visibilityState === 'visible') timer = window.setTimeout(tick, ms);
    };
    async function tick() {
      window.clearTimeout(timer);
      const mine = ++seq;
      let next = POLL_MS;
      try {
        const r = await api.get('/pilotage/direct/');
        const live = normalizeLive(r.data);
        if (cancelled || mine !== seq) return;
        setData(live);
        setStatus('ok');
        setUpdatedAt(Date.now());
      } catch (err) {
        if (cancelled || mine !== seq) return;
        setStatus('error');
        // Serveur plus ancien sans ce point d'entrée : inutile d'insister toutes les 10 s.
        const code = (err as { response?: { status?: number } })?.response?.status;
        next = code === 404 ? POLL_MS : RETRY_MS;
      }
      if (!cancelled && mine === seq) schedule(next);
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick();
      else window.clearTimeout(timer);
    };

    tickRef.current = tick;
    tick();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      tickRef.current = null;
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled]);

  const refresh = useCallback(() => { tickRef.current?.(); }, []);
  return { data, status, updatedAt, refresh };
}

/** L'heure courante, remise à jour toutes les `everyMs` tant que la page est visible (textes « il y a… »). */
export function useNow(everyMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => { if (document.visibilityState === 'visible') setNow(Date.now()); }, everyMs);
    const onVisibility = () => { if (document.visibilityState === 'visible') setNow(Date.now()); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', onVisibility); };
  }, [everyMs]);
  return now;
}

/** « à l'instant », « il y a 12 s », « il y a 3 min », « il y a 2 h », « il y a 4 j », puis la date. */
export function agoShort(iso: string | number | null, now = Date.now()): string {
  if (iso === null) return 'jamais';
  const t = typeof iso === 'number' ? iso : new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const s = Math.max(0, (now - t) / 1000);
  if (s < 5) return 'à l’instant';
  if (s < 60) return `il y a ${Math.floor(s)} s`;
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  const d = Math.floor(s / 86400);
  if (d < 31) return `il y a ${d} j`;
  return new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}
