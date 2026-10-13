/**
 * Pilotage › Membres — journal d'un membre (14/10/2026) : ce qu'il a fait, jour par jour et contenu par contenu
 * (backend apps/users/member_journal.py, GET /api/pilotage/utilisateurs/<id>/journal/?avant=).
 * Par jour : le temps d'étude, les contenus travaillés (questions évaluées, aides, gestes ; détail question par
 * question en dépliant) et les autres actions (quiz, DS, listes, classes…). « Voir plus » remonte de 14 jours.
 * Les documents privés du membre ne sont jamais montrés.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, Bookmark, CalendarClock, ChevronDown, Clock, GraduationCap, Lightbulb, ListPlus, Loader2, LogIn,
  NotebookPen, UserPlus, Users, type LucideIcon,
} from 'lucide-react';
import { api } from '@/lib/api/apiClient';

interface ContentRef { id: number; type: string; title: string; url: string }
interface Geste { at: string; kind: string; label: string }
interface Detail { at: string; question: string; kind: 'evaluation' | 'aide'; status: string | null; texte: string }
interface Contenu {
  content: ContentRef; minutes: number; ouvert: string | null; questions: Record<string, number>; tout_reussi: boolean;
  aides: Record<string, number>; statut: string | null; gestes: Geste[]; detail: Detail[]; debut: string | null; fin: string | null;
}
interface Evenement { at: string; kind: string; label: string; url?: string | null }
interface Jour { date: string; minutes: number; contenus: Contenu[]; evenements: Evenement[] }
interface Journal { jours: Jour[]; suivant: string | null; plus_ancien: string }

const EVENT_ICON: Record<string, LucideIcon> = {
  quiz: GraduationCap, ds: CalendarClock, liste: ListPlus, classe: Users, cahier: NotebookPen, concours: GraduationCap,
  inscription: UserPlus, connexion: LogIn,
};
const TYPE = { exercise: 'Exercice', exam: 'Examen', lesson: 'Leçon' } as Record<string, string>;
const hm = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;

function dayLabel(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  const today = new Date();
  const diff = Math.round((new Date(today.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86400000);
  if (diff === 0) return 'Aujourd’hui';
  if (diff === 1) return 'Hier';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short', ...(diff > 300 ? { year: 'numeric' } : {}) });
}

/** « 5 questions : 3 ✓ · 1 ½ · 1 ✗ » d'après les évaluations du jour. */
function questionsText(q: Record<string, number>) {
  const ok = q.success ?? 0, half = q.partial ?? 0, ko = (q.review ?? 0) + (q.failed ?? 0);
  const n = ok + half + ko;
  if (!n) return null;
  const parts = [`${ok} réussie${ok > 1 ? 's' : ''}`];
  if (half) parts.push(`${half} en partie`);
  if (ko) parts.push(`${ko} à revoir`);
  return `${plural(n, 'question')} évaluée${n > 1 ? 's' : ''} : ${parts.join(', ')}`;
}

const Chip: React.FC<{ children: React.ReactNode; tone?: 'brand' | 'gold' | 'plain'; icon?: LucideIcon }> = ({ children, tone = 'plain', icon: Icon }) => (
  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-medium ${
    tone === 'brand' ? 'bg-brand-soft text-brand-hover' : tone === 'gold' ? 'bg-gold-soft text-[#8a6318]' : 'bg-[#f2f1ee] text-ink-soft'}`}>
    {Icon && <Icon className="h-3 w-3" aria-hidden />}{children}
  </span>
);

const ContenuCard: React.FC<{ c: Contenu }> = ({ c }) => {
  const [open, setOpen] = useState(false);
  const qText = questionsText(c.questions);
  const hasDetail = c.detail.length > 0 || c.gestes.length > 0;
  return (
    <li className="rounded-xl border border-line bg-white px-3.5 py-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span className="min-w-0 text-[13px]">
          <span className="text-[11px] font-semibold uppercase tracking-[.05em] text-ink-faint">{TYPE[c.content.type] ?? 'Contenu'} · </span>
          <Link to={c.content.url} className="font-semibold text-ink hover:text-brand hover:underline">{c.content.title}</Link>
        </span>
        <span className="fd-nums shrink-0 text-[11.5px] text-ink-faint">
          {c.debut && c.fin ? (hm(c.debut) === hm(c.fin) ? hm(c.debut) : `${hm(c.debut)}–${hm(c.fin)}`) : ''}
        </span>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {c.minutes > 0 && <Chip icon={Clock}>{c.minutes} min</Chip>}
        {c.ouvert && !qText && !c.minutes && <Chip>Ouvert</Chip>}
        {qText && <span className="text-[12.5px] text-ink-soft">{qText}</span>}
        {c.tout_reussi && <Chip tone="brand">« Tout réussi »</Chip>}
        {(c.aides.indice ?? 0) > 0 && <Chip tone="gold" icon={Lightbulb}>{plural(c.aides.indice, 'indice')}</Chip>}
        {(c.aides.solution ?? 0) > 0 && <Chip tone="gold" icon={Lightbulb}>{plural(c.aides.solution, 'solution')}</Chip>}
        {c.statut && <Chip tone={c.statut === 'success' ? 'brand' : 'gold'}>{c.statut === 'success' ? 'Marqué réussi' : 'Marqué à revoir'}</Chip>}
        {c.gestes.filter((g) => g.kind === 'favori').length > 0 && <Chip icon={Bookmark}>Favori</Chip>}
      </div>
      {c.gestes.some((g) => g.kind !== 'favori' && g.kind !== 'statut') && (
        <ul className="mt-1.5 space-y-0.5 text-[12.5px] text-ink-soft">
          {c.gestes.filter((g) => g.kind !== 'favori' && g.kind !== 'statut').map((g, i) => <li key={i}>{g.label}</li>)}
        </ul>
      )}
      {hasDetail && c.detail.length > 0 && (
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
          className="mt-1 inline-flex min-h-8 items-center gap-1 text-[12px] font-semibold text-ink-faint hover:text-ink">
          Détail par question <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
        </button>
      )}
      {open && (
        <ol className="mt-1 divide-y divide-[#f2f1ee] rounded-lg bg-[#faf9f7] px-3 py-1 text-[12.5px]">
          {c.detail.map((d, i) => (
            <li key={i} className="flex items-baseline gap-3 py-1.5">
              <span className="fd-nums w-11 shrink-0 text-ink-faint">{hm(d.at)}</span>
              <span className="w-24 shrink-0 font-medium text-ink">{d.question}</span>
              <span className={`min-w-0 ${d.kind === 'aide' ? 'text-[#8a6318]' : d.status === 'success' ? 'text-brand-hover' : 'text-ink-soft'}`}>{d.texte}</span>
            </li>
          ))}
        </ol>
      )}
    </li>
  );
};

export const MemberJournal: React.FC<{ userId: number }> = ({ userId }) => {
  const [jours, setJours] = useState<Jour[] | null>(null);
  const [suivant, setSuivant] = useState<string | null>(null);
  const [debut, setDebut] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback((avant: string | null) => {
    setLoading(true);
    setFailed(false);
    api.get(`/pilotage/utilisateurs/${userId}/journal/`, { params: avant ? { avant } : {} })
      .then((r) => {
        const j = r.data as Journal;
        setJours((prev) => [...(avant ? prev ?? [] : []), ...j.jours]);
        setSuivant(j.suivant);
        setDebut(j.plus_ancien);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [userId]);
  useEffect(() => { load(null); }, [load]);

  if (jours === null) {
    return failed
      ? <p className="text-[12.5px] text-ink-faint">Le journal n’a pas pu se charger.</p>
      : <Loader2 className="mt-2 h-4 w-4 animate-spin text-ink-faint" aria-label="Chargement" />;
  }

  return (
    <div>
      {jours.length === 0 && <p className="text-[12.5px] text-ink-faint">Aucune activité enregistrée.</p>}
      <ol className="flex flex-col gap-4">
        {jours.map((j) => (
          <li key={j.date}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 border-b border-line pb-1">
              <h4 className="text-[13px] font-semibold capitalize text-ink">{dayLabel(j.date)}</h4>
              <span className="fd-nums text-[12px] text-ink-faint">
                {j.minutes > 0 ? `${j.minutes} min d’étude · ` : ''}{plural(j.contenus.length, 'contenu')}
              </span>
            </div>
            {j.evenements.length > 0 && (
              <ul className="mb-2 space-y-1">
                {j.evenements.map((e, i) => {
                  const Icon = EVENT_ICON[e.kind] ?? Activity;
                  return (
                    <li key={i} className="flex items-baseline gap-2 text-[12.5px] text-ink-soft">
                      <span className="fd-nums w-11 shrink-0 text-ink-faint">{hm(e.at)}</span>
                      <Icon className="h-3.5 w-3.5 shrink-0 translate-y-0.5 text-ink-faint" aria-hidden />
                      <span className="min-w-0">{e.label}</span>
                    </li>
                  );
                })}
              </ul>
            )}
            {j.contenus.length > 0 && <ul className="flex flex-col gap-1.5">{j.contenus.map((c) => <ContenuCard key={c.content.id} c={c} />)}</ul>}
          </li>
        ))}
      </ol>
      <div className="mt-3">
        {suivant ? (
          <button type="button" onClick={() => load(suivant)} disabled={loading}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-[12.5px] font-semibold text-ink-soft hover:text-ink disabled:opacity-60">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden />} Voir plus
          </button>
        ) : debut && (
          <p className="text-[12px] text-ink-faint">Début de l’activité : inscrit le {new Date(`${debut}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>
        )}
        {failed && jours.length > 0 && <p className="mt-1 text-[12px] text-ink-faint">La suite n’a pas pu se charger.</p>}
      </div>
    </div>
  );
};

export default MemberJournal;
