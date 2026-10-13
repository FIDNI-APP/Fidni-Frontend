// Pilotage › Quiz : écrire les questions du quiz de chaque chapitre (par niveau), puis le mettre en ligne.
// Une question nouvelle est un brouillon ; « Mettre en ligne » publie le quiz du chapitre, qui apparaît alors
// aux élèves dans « Quiz par chapitre » (10 questions à chaque passage, une par théorème d'abord).
// Chaque question est rattachée aux théorèmes qu'elle évalue : bilan « maîtrisé / à revoir » pour l'élève.
// Un quiz = (chapitre, niveau) depuis le 13/10/2026 : l'onglet de niveau choisit le quiz (jamais partagé entre niveaux).
// Questions importées (rédigées par Claude d'après les résultats des élèves, `a_relire`) : jamais montrées aux
// élèves avant d'être validées ici, une à une ou toutes celles du chapitre une fois relues.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, CheckCheck, ChevronRight, Eye, EyeOff, Loader2, Plus, Search, Target, Trash2 } from 'lucide-react';
import { api } from '@/lib/api/apiClient';
import { getClassLevels } from '@/lib/api';
import { MathText } from '@/components/skilliq/MathText';
import type { ClassLevelModel } from '@/types';

interface ChapterRow {
  id: number; name: string; domaine: string; total: number; en_ligne: number; brouillons: number; passages: number;
  a_relire: number; contenus: boolean;
}
interface TheoremRef { id: number; name: string }
interface ChapterTheorem extends TheoremRef { niveaux: string[] }
interface Question {
  id: number; question: string; options: string[]; correct_answer: number;
  difficulty: 'easy' | 'medium' | 'hard'; explanation: string; en_ligne: boolean;
  source?: string; a_relire?: boolean; motif?: string; theoremes?: TheoremRef[];
}
interface Detail {
  chapitre: { id: number; name: string; domaine: string; niveau: { id: number; name: string }; niveaux: string[]; theoremes: ChapterTheorem[] };
  questions: Question[]; par_quiz: number; min_en_ligne: number; passages: number;
}
type Draft = Omit<Question, 'id' | 'en_ligne'> & { id?: number; en_ligne?: boolean };

const DIFF: { key: Question['difficulty']; label: string }[] = [
  { key: 'easy', label: 'Facile' }, { key: 'medium', label: 'Moyen' }, { key: 'hard', label: 'Difficile' },
];
const emptyDraft = (): Draft => ({ question: '', options: ['', '', '', ''], correct_answer: 0, difficulty: 'medium', explanation: '', theoremes: [] });
const errorText = (e: unknown, fallback: string) => {
  const d = (e as { response?: { data?: Record<string, unknown> } })?.response?.data;
  const v = d && Object.values(d)[0];
  return typeof v === 'string' ? v : Array.isArray(v) && typeof v[0] === 'string' ? v[0] : fallback;
};

const Status: React.FC<{ row: Pick<ChapterRow, 'total' | 'en_ligne'> }> = ({ row }) => (
  row.en_ligne > 0
    ? <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11.5px] font-semibold text-brand-hover">En ligne · {row.en_ligne}</span>
    : row.total > 0
      ? <span className="rounded-full bg-gold-soft px-2 py-0.5 text-[11.5px] font-semibold text-gold-strong">Brouillon · {row.total}</span>
      : <span className="rounded-full bg-[#f2f1ee] px-2 py-0.5 text-[11.5px] text-ink-faint">Pas de quiz</span>
);
const ToReview: React.FC<{ n: number }> = ({ n }) => (
  <span className="rounded-full border border-gold/60 bg-white px-2 py-0.5 text-[11.5px] font-semibold text-gold-strong">À relire · {n}</span>
);
const TheoremChips: React.FC<{ list?: TheoremRef[] }> = ({ list }) => (
  list && list.length > 0
    ? (
      <div className="mt-2 flex flex-wrap gap-1">
        {list.map((t) => <span key={t.id} className="rounded-full bg-[#f2f1ee] px-2 py-0.5 text-[11.5px] text-ink-soft">{t.name}</span>)}
      </div>
    )
    : <p className="mt-2 text-[11.5px] text-gold-strong">Aucun théorème : la question ne compte pas dans le bilan de l’élève.</p>
);

/** Une question : lecture (aperçu tel que l'élève le voit) ou édition. */
const QuestionCard: React.FC<{
  value: Draft; index: number; editing: boolean; theorems: ChapterTheorem[]; onEdit: () => void; onCancel: () => void;
  onSave: (d: Draft) => Promise<void>; onDelete?: () => void; onToggle?: () => void; onValidate?: () => Promise<void>;
}> = ({ value, index, editing, theorems, onEdit, onCancel, onSave, onDelete, onToggle, onValidate }) => {
  const [d, setD] = useState<Draft>(value);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (editing) { setD(value); setErr(null); } }, [editing]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));

  if (!editing) {
    const review = !!value.a_relire;
    return (
      <div className={`rounded-2xl border p-4 ${review ? 'border-gold/70 bg-[#fffaf0]' : value.en_ligne ? 'border-line bg-white' : 'border-dashed border-[#d8d4cc] bg-white'}`}>
        <div className="flex items-start gap-3">
          <span className="fd-nums mt-0.5 text-[12px] font-semibold text-ink-faint">{index + 1}.</span>
          <div className="min-w-0 flex-1">
            {review && (
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[.08em] text-gold-strong">Rédigée par Claude · à relire, invisible des élèves</p>
            )}
            <p className="text-[14.5px] text-ink"><MathText text={value.question} /></p>
            <ul className="mt-2 grid gap-1 sm:grid-cols-2">
              {value.options.map((o, i) => (
                <li key={i} className={`flex items-start gap-1.5 rounded-lg px-2 py-1 text-[13.5px] ${i === value.correct_answer ? 'bg-brand-soft text-brand-hover' : 'text-ink-soft'}`}>
                  {i === value.correct_answer ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <span className="w-3.5 shrink-0" />}
                  <MathText text={o} />
                </li>
              ))}
            </ul>
            {value.explanation && <p className="mt-2 text-[12.5px] text-ink-faint"><MathText text={value.explanation} /></p>}
            <TheoremChips list={value.theoremes} />
            {value.motif && (
              <p className="mt-2 flex items-start gap-1.5 text-[12px] text-ink-soft">
                <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-faint" aria-hidden />
                <span><span className="font-semibold">Pourquoi cette question :</span> <MathText text={value.motif} /></span>
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <span className="text-[11.5px] text-ink-faint">{DIFF.find((x) => x.key === value.difficulty)?.label}</span>
            {review && onValidate ? (
              <button type="button" disabled={busy} title="Je l’ai relue : elle peut être montrée aux élèves"
                onClick={async () => { setBusy(true); try { await onValidate(); } finally { setBusy(false); } }}
                className="fd-btn-primary min-h-8 px-3 text-[12.5px]">
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Valider
              </button>
            ) : onToggle && (
              <button type="button" onClick={onToggle} title={value.en_ligne ? 'Retirer cette question du quiz' : 'Mettre cette question en ligne'}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${value.en_ligne ? 'bg-brand-soft text-brand-hover' : 'bg-gold-soft text-gold-strong'}`}>
                {value.en_ligne ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}{value.en_ligne ? 'En ligne' : 'Brouillon'}
              </button>
            )}
            <button type="button" onClick={onEdit} className="text-[12.5px] font-medium text-ink-soft underline-offset-2 hover:text-ink hover:underline">Modifier</button>
          </div>
        </div>
      </div>
    );
  }

  const save = async () => {
    setBusy(true); setErr(null);
    try { await onSave(d); } catch (e) { setErr(errorText(e, 'L’enregistrement a échoué.')); } finally { setBusy(false); }
  };
  const chosen = new Set((d.theoremes ?? []).map((t) => t.id));
  const toggleTheorem = (t: ChapterTheorem) => set({
    theoremes: chosen.has(t.id) ? (d.theoremes ?? []).filter((x) => x.id !== t.id) : [...(d.theoremes ?? []), { id: t.id, name: t.name }],
  });
  return (
    <div className="rounded-2xl border border-ink/70 bg-white p-4 shadow-sm">
      <label className="block text-[12.5px] font-semibold text-ink">Question {index + 1}</label>
      <textarea value={d.question} onChange={(e) => set({ question: e.target.value })} rows={2} autoFocus
        placeholder="Ex. Combien vaut $\lim_{x \to 0} \frac{\sin x}{x}$ ?"
        className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-[14px] focus:border-brand focus:outline-none" />
      {d.question.includes('$') && <p className="mt-1 rounded-lg bg-paper px-3 py-1.5 text-[14px] text-ink"><MathText text={d.question} /></p>}

      <p className="mt-3 text-[12.5px] font-semibold text-ink">Réponses <span className="font-normal text-ink-faint">— coche la bonne</span></p>
      <div className="mt-1 space-y-1.5">
        {d.options.map((o, i) => (
          <div key={i} className="flex items-center gap-2">
            <input type="radio" name={`bonne-${d.id ?? 'new'}`} checked={d.correct_answer === i} onChange={() => set({ correct_answer: i })}
              aria-label={`Réponse ${i + 1} est la bonne`} className="h-4 w-4 accent-[#1a7a4a]" />
            <input value={o} onChange={(e) => set({ options: d.options.map((x, j) => (j === i ? e.target.value : x)) })}
              placeholder={`Réponse ${i + 1}`}
              className={`h-10 min-w-0 flex-1 rounded-lg border px-3 text-[14px] focus:outline-none ${d.correct_answer === i ? 'border-brand bg-brand-soft/40' : 'border-line focus:border-brand'}`} />
            {o.includes('$') && <span className="hidden max-w-[40%] truncate text-[13px] sm:inline"><MathText text={o} /></span>}
            {d.options.length > 2 && (
              <button type="button" aria-label="Retirer cette réponse" className="rounded-lg p-1.5 text-ink-faint hover:bg-[#f2f1ee] hover:text-[#a23b34]"
                onClick={() => set({ options: d.options.filter((_, j) => j !== i), correct_answer: d.correct_answer > i ? d.correct_answer - 1 : d.correct_answer === i ? 0 : d.correct_answer })}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
        {d.options.length < 6 && (
          <button type="button" onClick={() => set({ options: [...d.options, ''] })}
            className="ml-6 text-[12.5px] font-medium text-ink-soft hover:text-ink">+ une réponse</button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[12.5px] font-semibold text-ink">Difficulté</span>
        {DIFF.map((x) => (
          <button key={x.key} type="button" aria-pressed={d.difficulty === x.key} onClick={() => set({ difficulty: x.key })}
            className={`rounded-full border px-3 py-1 text-[12.5px] ${d.difficulty === x.key ? 'border-ink bg-ink text-white' : 'border-line text-ink-soft hover:text-ink'}`}>{x.label}</button>
        ))}
      </div>
      <p className="mt-3 text-[12.5px] font-semibold text-ink">Théorèmes évalués <span className="font-normal text-ink-faint">— pour le bilan de l’élève</span></p>
      {theorems.length === 0
        ? <p className="mt-1 text-[12.5px] text-ink-faint">Aucun théorème rattaché à ce chapitre.</p>
        : (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {theorems.map((t) => (
              <button key={t.id} type="button" aria-pressed={chosen.has(t.id)} onClick={() => toggleTheorem(t)}
                title={t.niveaux.length ? `Au programme : ${t.niveaux.join(', ')}` : undefined}
                className={`rounded-full border px-2.5 py-1 text-[12.5px] ${chosen.has(t.id) ? 'border-brand bg-brand-soft text-brand-hover' : 'border-line text-ink-soft hover:text-ink'}`}>
                {chosen.has(t.id) && <Check className="mr-1 inline h-3 w-3" />}{t.name}
              </button>
            ))}
          </div>
        )}
      <label className="mt-3 block text-[12.5px] font-semibold text-ink">Explication <span className="font-normal text-ink-faint">(montrée après la réponse)</span></label>
      <textarea value={d.explanation} onChange={(e) => set({ explanation: e.target.value })} rows={2}
        className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-[13.5px] focus:border-brand focus:outline-none" />

      {err && <p className="mt-2 text-[12.5px] text-[#9c3b2e]">{err}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={save} disabled={busy} className="fd-btn-primary min-h-10 px-4 text-[13.5px]">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Enregistrer
        </button>
        <button type="button" onClick={onCancel} className="min-h-10 rounded-xl px-3 text-[13px] text-ink-soft hover:bg-[#f2f1ee]">Annuler</button>
        {onDelete && (
          <button type="button" onClick={() => { if (window.confirm('Supprimer cette question ?')) onDelete(); }}
            className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12.5px] text-ink-faint hover:text-[#a23b34]"><Trash2 className="h-3.5 w-3.5" /> Supprimer</button>
        )}
      </div>
    </div>
  );
};

const ChapterQuiz: React.FC<{ chapterId: number; levelId: number; onBack: () => void; onChanged: () => void }> = ({ chapterId, levelId, onBack, onChanged }) => {
  const [data, setData] = useState<Detail | null>(null);
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const niveau = { niveau: levelId };
  const load = useCallback(() => api.get(`/pilotage/quiz/chapitre/${chapterId}/`, { params: { niveau: levelId } })
    .then((r) => setData(r.data)), [chapterId, levelId]);
  useEffect(() => { load(); }, [load]);

  if (!data) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-ink-faint" /></div>;
  const online = data.questions.filter((q) => q.en_ligne).length;
  const toReview = data.questions.filter((q) => q.a_relire).length;
  const total = data.questions.length;
  const validated = total - toReview;
  const theorems = data.chapitre.theoremes ?? [];

  const saveQuestion = async (d: Draft) => {
    const body = { question: d.question, options: d.options, correct_answer: d.correct_answer, difficulty: d.difficulty,
      explanation: d.explanation, theoremes: (d.theoremes ?? []).map((t) => t.id) };
    if (d.id) await api.patch(`/pilotage/quiz/question/${d.id}/`, body);
    else await api.post(`/pilotage/quiz/chapitre/${chapterId}/`, { ...body, ...niveau });
    setEditing(null); await load(); onChanged();
  };
  const publish = async (on: boolean) => {
    setBusy(true); setMsg(null);
    try {
      await api.post(`/pilotage/quiz/chapitre/${chapterId}/publier/`, { en_ligne: on, ...niveau });
      setMsg({ ok: true, text: on ? 'Quiz en ligne : les élèves le voient dans « Quiz par chapitre ».' : 'Quiz retiré : les élèves ne le voient plus.' });
      await load(); onChanged();
    } catch (e) { setMsg({ ok: false, text: errorText(e, 'Échec.') }); } finally { setBusy(false); }
  };
  const validateAll = async () => {
    if (!window.confirm(`Tu as relu les ${toReview} questions rédigées par Claude ? Elles deviendront publiables${online ? ' et seront aussitôt en ligne' : ''}.`)) return;
    setBusy(true); setMsg(null);
    try {
      const r = await api.post(`/pilotage/quiz/chapitre/${chapterId}/valider/`, niveau);
      setMsg({ ok: true, text: `${r.data.validees} question${r.data.validees > 1 ? 's' : ''} validée${r.data.validees > 1 ? 's' : ''}${r.data.en_ligne ? ' et en ligne' : ' : mets le quiz en ligne quand tu veux'}.` });
      await load(); onChanged();
    } catch (e) { setMsg({ ok: false, text: errorText(e, 'Échec.') }); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[13px] text-ink-soft hover:bg-[#f2f1ee] hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Tous les chapitres
      </button>
      <div className="fd-card flex flex-wrap items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[.08em] text-ink-faint">{data.chapitre.domaine} · quiz {data.chapitre.niveau.name}</p>
          <h2 className="fd-display mt-1 text-[20px] leading-tight text-ink">{data.chapitre.name}</h2>
          <p className="mt-1 text-[12.5px] text-ink-faint">
            {total} question{total > 1 ? 's' : ''} · {online} en ligne{toReview ? ` · ${toReview} à relire` : ''} · {data.passages} passage{data.passages > 1 ? 's' : ''} d’élèves.
            Chaque passage pose toutes les questions en ligne ({data.par_quiz} au plus), dans un ordre au hasard.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Status row={{ total: validated, en_ligne: online }} />
          {online < validated && (
            <button type="button" onClick={() => publish(true)} disabled={busy || validated < data.min_en_ligne}
              title={validated < data.min_en_ligne ? `${data.min_en_ligne} questions validées au moins` : undefined}
              className="fd-btn-primary min-h-10 px-4 text-[13.5px] disabled:opacity-50">
              <Eye className="h-4 w-4" /> Mettre en ligne{online ? ' tout' : ''}
            </button>
          )}
          {online > 0 && (
            <button type="button" onClick={() => publish(false)} disabled={busy}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-line bg-white px-3 text-[13px] font-medium text-ink-soft hover:text-ink">
              <EyeOff className="h-4 w-4" /> Retirer
            </button>
          )}
        </div>
        {validated < data.min_en_ligne && toReview === 0 && <p className="w-full text-[12.5px] text-gold-strong">Encore {data.min_en_ligne - validated} question{data.min_en_ligne - validated > 1 ? 's' : ''} avant de pouvoir le mettre en ligne.</p>}
        {msg && <p className={`w-full text-[13px] ${msg.ok ? 'text-brand-hover' : 'text-[#9c3b2e]'}`}>{msg.text}</p>}
      </div>

      {toReview > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gold/60 bg-[#fffaf0] p-4">
          <p className="min-w-0 flex-1 text-[13px] text-ink-soft">
            <b className="font-semibold text-ink">{toReview} question{toReview > 1 ? 's' : ''} rédigée{toReview > 1 ? 's' : ''} par Claude</b> d’après les résultats des élèves.
            Les élèves ne les voient pas tant que tu ne les as pas validées : relis-les, corrige ou supprime si besoin.
          </p>
          <button type="button" onClick={validateAll} disabled={busy}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-ink bg-white px-3 text-[13px] font-semibold text-ink hover:bg-paper">
            <CheckCheck className="h-4 w-4" /> Tout valider
          </button>
        </div>
      )}

      <div className="space-y-3">
        {data.questions.map((q, i) => (
          <QuestionCard key={q.id} value={q} index={i} editing={editing === q.id} theorems={theorems}
            onEdit={() => setEditing(q.id)} onCancel={() => setEditing(null)} onSave={saveQuestion}
            onDelete={async () => { await api.delete(`/pilotage/quiz/question/${q.id}/`); setEditing(null); await load(); onChanged(); }}
            onToggle={async () => { await api.patch(`/pilotage/quiz/question/${q.id}/`, { en_ligne: !q.en_ligne }); await load(); onChanged(); }}
            onValidate={async () => { await api.patch(`/pilotage/quiz/question/${q.id}/`, { valider: true }); await load(); onChanged(); }} />
        ))}
        {editing === 'new'
          ? <QuestionCard value={emptyDraft()} index={total} editing theorems={theorems} onEdit={() => {}} onCancel={() => setEditing(null)} onSave={saveQuestion} />
          : (
            <button type="button" onClick={() => setEditing('new')}
              className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-[#cfcdc8] bg-white py-4 text-[13.5px] font-medium text-ink-soft hover:border-ink hover:text-ink">
              <Plus className="h-4 w-4" /> Ajouter une question
            </button>
          )}
      </div>
    </div>
  );
};

export const QuizAdminTab: React.FC = () => {
  const [levels, setLevels] = useState<ClassLevelModel[]>([]);
  const [level, setLevel] = useState<string>('');
  const [rows, setRows] = useState<ChapterRow[] | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [q, setQ] = useState('');
  const [onlyReview, setOnlyReview] = useState(false);
  useEffect(() => { getClassLevels().then((l) => { setLevels(l); if (l[0]) setLevel(String(l[0].id)); }).catch(() => {}); }, []);
  const load = useCallback(() => {
    if (!level) return;
    api.get('/pilotage/quiz/', { params: { niveau: level } }).then((r) => setRows(r.data)).catch(() => setRows([]));
  }, [level]);
  useEffect(() => { setRows(null); load(); }, [load]);

  const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const groups = useMemo(() => Object.entries((rows ?? [])
    .filter((r) => (!q || fold(r.name).includes(fold(q))) && (!onlyReview || r.a_relire > 0))
    .reduce<Record<string, ChapterRow[]>>((acc, r) => { (acc[r.domaine || 'Autres'] ||= []).push(r); return acc; }, {})), [rows, q, onlyReview]);
  const counts = (rows ?? []).reduce((a, r) => ({
    on: a.on + (r.en_ligne > 0 ? 1 : 0), draft: a.draft + (r.en_ligne === 0 && r.total > 0 ? 1 : 0), review: a.review + r.a_relire,
  }), { on: 0, draft: 0, review: 0 });

  if (open !== null) return <ChapterQuiz chapterId={open} levelId={Number(level)} onBack={() => { setOpen(null); load(); }} onChanged={load} />;

  return (
    <div className="space-y-4">
      <div className="fd-card p-5">
        <h2 className="fd-display text-[16px] text-ink">Quiz par chapitre</h2>
        <p className="mt-0.5 text-[12.5px] text-ink-faint">
          Écris les questions d’un chapitre (brouillon), puis mets le quiz en ligne : il apparaît aux élèves dans « Quiz par chapitre ».
        </p>
        <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Niveau">
          {levels.map((l) => (
            <button key={l.id} type="button" role="tab" aria-selected={level === String(l.id)} onClick={() => setLevel(String(l.id))}
              className={`min-h-9 rounded-full border px-3.5 text-[13px] font-medium ${level === String(l.id) ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-soft hover:text-ink'}`}>
              {l.name}
            </button>
          ))}
        </div>
        {rows && (
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[12.5px] text-ink-soft">
            <span>{counts.on} quiz en ligne · {counts.draft} en brouillon · {rows.length - counts.on - counts.draft} chapitre{rows.length - counts.on - counts.draft > 1 ? 's' : ''} sans quiz</span>
            {counts.review > 0 && (
              <button type="button" aria-pressed={onlyReview} onClick={() => setOnlyReview((v) => !v)}
                className={`rounded-full border px-2.5 py-0.5 font-semibold ${onlyReview ? 'border-gold bg-gold-soft text-gold-strong' : 'border-gold/60 bg-white text-gold-strong'}`}>
                {counts.review} question{counts.review > 1 ? 's' : ''} à relire{onlyReview ? ' · voir tout' : ''}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="fd-card p-2 sm:p-3">
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher un chapitre…" aria-label="Chercher un chapitre"
            className="h-10 w-full rounded-xl border border-line bg-white pl-9 pr-3 text-[13.5px] focus:border-brand focus:outline-none" />
        </div>
        {!rows ? <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-ink-faint" /></div>
          : groups.length === 0 ? <p className="px-3 py-6 text-center text-[13px] text-ink-faint">Aucun chapitre.</p>
            : groups.map(([g, list]) => (
              <div key={g} className="mb-2">
                <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[.08em] text-ink-faint">{g}</p>
                {list.map((r) => (
                  <button key={r.id} type="button" onClick={() => setOpen(r.id)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-paper">
                    <span className="min-w-0 flex-1 truncate text-[14px] text-ink">{r.name}</span>
                    {r.passages > 0 && <span className="hidden text-[12px] text-ink-faint sm:inline">{r.passages} passage{r.passages > 1 ? 's' : ''}</span>}
                    {r.a_relire > 0 && <ToReview n={r.a_relire} />}
                    <Status row={{ total: r.total - r.a_relire, en_ligne: r.en_ligne }} />
                    <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint" />
                  </button>
                ))}
              </div>
            ))}
      </div>
    </div>
  );
};

export default QuizAdminTab;
