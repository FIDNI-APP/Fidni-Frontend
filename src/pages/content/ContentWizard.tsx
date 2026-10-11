/**
 * « Ajouter un contenu » — assistant en 3 étapes (refonte du 11/10/2026 ; l'ancienne page demandait niveaux,
 * matière, sous-domaines, chapitres et théorèmes avant même d'écrire, et personne ne s'en servait).
 *
 *   1. Le contenu : type, titre, niveau, chapitre (matière et sous-domaine déduits du chapitre), difficulté ;
 *      établissement d'origine et théorèmes dans « Plus d'options ».
 *   2. Écrire : une carte par question (énoncé ; indication, solution, barème, sous-questions d'un clic),
 *      ou des parties pour une leçon ; aperçu à côté sur ordinateur.
 *   3. Vérifier et publier : récapitulatif, points à revoir (formules, solutions manquantes), aperçu complet.
 *
 * Un contenu nouveau est gardé en brouillon dans ce navigateur au fil de l'écriture (repris au retour).
 * Sert aussi à modifier un contenu (ouvert directement sur « Écrire »).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle, ArrowLeft, ArrowRight, Check, ChevronDown, Eye, FileJson, GraduationCap, Loader2, Search, X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api/apiClient';
import { getClassLevels, getSubjects } from '@/lib/api';
import {
  chaptersFor, saveContent, theoremsFor, type ChapterOption, type TheoremOption, type WizardContentType,
} from '@/lib/api/contentWriteApi';
import type { ExerciseBlock, FlexibleExerciseStructure } from '@/components/content/editor/FlexibleExerciseEditor';
import type { FlexibleLessonStructure, SectionBlock } from '@/components/content/editor/FlexibleLessonEditor';
import { QuestionsEditor, newQuestion, newSection } from '@/components/content/wizard/QuestionsEditor';
import { LessonSectionsEditor, newLessonSection } from '@/components/content/wizard/LessonSectionsEditor';
import ExerciseRenderer from '@/components/content/viewer/ExerciseRenderer';
import { LessonReader } from '@/components/content/viewer/LessonReader';
import { ReadingStyles } from '@/components/content/viewer/ReadingStyles';
import { SchoolPicker, type SchoolValue } from '@/components/common/SchoolPicker';
import { JsonImportModal } from '@/components/common/JsonImportModal';
import { checkStructureMath } from '@/lib/mathCheck';
import type { ClassLevelModel, SubjectModel } from '@/types';

type Difficulty = 'easy' | 'medium' | 'hard';

const TYPES: { key: WizardContentType; label: string; hint: string; base: string }[] = [
  { key: 'exercise', label: 'Exercice', hint: 'Quelques questions sur un chapitre.', base: '/exercises' },
  { key: 'exam', label: 'Devoir ou examen', hint: 'Un sujet en plusieurs exercices, avec durée et barème.', base: '/exams' },
  { key: 'lesson', label: 'Leçon', hint: 'Un cours en parties : définitions, théorèmes, méthodes.', base: '/lessons' },
];
const DIFFICULTIES: { key: Difficulty; label: string }[] = [
  { key: 'easy', label: 'Facile' }, { key: 'medium', label: 'Moyen' }, { key: 'hard', label: 'Difficile' },
];
const DURATIONS = [60, 90, 120, 180, 240];
const STEPS = ['Le contenu', 'Écrire', 'Vérifier et publier'];

interface Draft {
  type: WizardContentType;
  title: string;
  difficulty?: Difficulty;
  levelIds: number[];
  subjectId: number | null;
  chapterIds: number[];
  theoremIds: number[];
  school: SchoolValue;
  durationMinutes: number | null;
  isNationalExam: boolean;
  nationalYear: number | null;
  blocks: ExerciseBlock[];
  sections: SectionBlock[];
}

const starter = (type: WizardContentType): Draft => ({
  type, title: '', difficulty: undefined, levelIds: [], subjectId: null, chapterIds: [], theoremIds: [],
  school: { id: null, name: '' }, durationMinutes: type === 'exam' ? 120 : null, isNationalExam: false, nationalYear: null,
  blocks: type === 'exam' ? [newSection(1), newQuestion()] : [newQuestion()],
  sections: [newLessonSection()],
});

const text = (html?: string) => (html || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
const fmtDuration = (m: number) => (m % 60 ? `${Math.floor(m / 60)} h ${m % 60}` : `${m / 60} h`);

/** Structure enregistrée : sans les indications ni solutions laissées vides. */
function buildStructure(d: Draft): FlexibleExerciseStructure | FlexibleLessonStructure {
  if (d.type === 'lesson') return { version: '1.0', sections: d.sections };
  const clean = <T extends { hint?: { html?: string }; solution?: { html?: string } }>(x: T): T => {
    const out = { ...x };
    if (!text(out.hint?.html)) delete out.hint;
    if (!text(out.solution?.html)) delete out.solution;
    return out;
  };
  return {
    version: '2.1',
    blocks: d.blocks.map((b) => (b.type === 'question'
      ? { ...clean(b), subQuestions: (b.subQuestions || []).map(clean) }
      : b)),
  } as FlexibleExerciseStructure;
}

// Un seul brouillon de contenu nouveau par compte (son type en fait partie).
const draftKey = (userId: string | number) => `fidni:brouillon-contenu:${userId}`;

export const ContentWizard: React.FC<{ contentType?: WizardContentType }> = ({ contentType = 'exercise' }) => {
  const { id } = useParams<{ id: string }>();
  const editing = !!id;
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();

  const [step, setStep] = useState(editing ? 1 : 0);
  const [d, setD] = useState<Draft>(() => starter(contentType));
  const patch = (p: Partial<Draft>) => setD((prev) => ({ ...prev, ...p }));
  const [loading, setLoading] = useState(editing);
  const [restored, setRestored] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tried, setTried] = useState(false); // « Suivant » cliqué : les champs manquants s'affichent
  const [showJson, setShowJson] = useState(false);
  const [showPreview, setShowPreview] = useState(false); // téléphone : aperçu à la demande

  const [levels, setLevels] = useState<ClassLevelModel[]>([]);
  const [subjects, setSubjects] = useState<SubjectModel[]>([]);
  const [chapters, setChapters] = useState<ChapterOption[]>([]);
  const [chapterQuery, setChapterQuery] = useState('');
  const [theorems, setTheorems] = useState<TheoremOption[]>([]);
  const [moreOpen, setMoreOpen] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  const typeDef = TYPES.find((t) => t.key === d.type)!;

  // ── Données de classement
  useEffect(() => {
    getClassLevels().then(setLevels).catch(() => {});
    getSubjects().then(setSubjects).catch(() => {});
  }, []);
  // Matière : celle du chapitre choisi ; sinon Mathématiques (le cas du site) ; un choix seulement s'il y en a plusieurs.
  const defaultSubjectId = useMemo(() => {
    const maths = subjects.find((s) => /math/i.test(s.name)) ?? subjects[0];
    return maths ? Number(maths.id) : null;
  }, [subjects]);
  const subjectId = d.subjectId ?? defaultSubjectId;
  useEffect(() => {
    chaptersFor(d.levelIds, subjects.length > 1 ? subjectId : null).then(setChapters).catch(() => setChapters([]));
  }, [d.levelIds.join(','), subjectId, subjects.length]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    theoremsFor(d.levelIds, subjectId, d.chapterIds).then(setTheorems).catch(() => setTheorems([]));
  }, [d.chapterIds.join(','), subjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Modifier : le contenu existant
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { data: c } = await api.get(`/contents/${id}/`);
        const st = c.json_content || c.structure || {};
        const t: WizardContentType = c.type === 'exam' ? 'exam' : c.type === 'lesson' ? 'lesson' : 'exercise';
        setD({
          ...starter(t),
          title: c.title || '',
          difficulty: c.difficulty || undefined,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          levelIds: (c.class_levels || []).map((l: any) => Number(l.id)),
          subjectId: c.subject?.id ? Number(c.subject.id) : null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          chapterIds: (c.chapters || []).map((x: any) => Number(x.id)),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          theoremIds: (c.theorems || []).map((x: any) => Number(x.id)),
          school: c.school ? { id: c.school.id, name: c.school.name, city: c.school.city } : { id: null, name: '' },
          durationMinutes: c.duration_minutes ?? null,
          isNationalExam: !!c.is_national_exam,
          nationalYear: c.national_year ?? null,
          blocks: Array.isArray(st.blocks) && st.blocks.length ? st.blocks : starter(t).blocks,
          sections: Array.isArray(st.sections) && st.sections.length ? st.sections : starter(t).sections,
        });
        if (c.school) setMoreOpen(true);
      } catch {
        setError('Ce contenu n’a pas pu être chargé.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // ── Nouveau contenu : brouillon gardé dans ce navigateur
  useEffect(() => {
    if (editing || !user) return;
    try {
      const raw = localStorage.getItem(draftKey(user.id));
      if (raw) {
        const saved = JSON.parse(raw) as Draft;
        if (saved && TYPES.some((t) => t.key === saved.type)) { setD({ ...starter(saved.type), ...saved }); setRestored(true); }
      }
    } catch { /* brouillon illisible : on repart de zéro */ }
  }, [user?.id, contentType, editing]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (editing || !user) return;
    const t = window.setTimeout(() => {
      try { localStorage.setItem(draftKey(user.id), JSON.stringify(d)); } catch { /* stockage plein ou bloqué */ }
    }, 600);
    return () => window.clearTimeout(t);
  }, [d, editing, user]);
  const dropDraft = () => {
    if (!user) return;
    try { localStorage.removeItem(draftKey(user.id)); } catch { /* rien */ }
  };

  // ── Validation par étape
  const structure = useMemo(() => buildStructure(d), [d]);
  const step1Missing = [
    d.title.trim().length < 3 && 'un titre',
    !d.levelIds.length && 'un niveau',
    !d.chapterIds.length && 'un chapitre',
    d.type !== 'lesson' && !d.difficulty && 'la difficulté',
  ].filter(Boolean) as string[];
  const questions = d.blocks.filter((b) => b.type === 'question');
  const step2Missing = d.type === 'lesson'
    ? (d.sections.some((s) => text(s.content?.html) || (s.subSections || []).some((ss) => text(ss.content?.html))) ? [] : ['le texte d’au moins une partie'])
    : (questions.some((q) => text(q.content?.html) || (q.subQuestions || []).some((s) => text(s.content?.html))) ? [] : ['l’énoncé d’au moins une question']);
  const mathErrors = useMemo(() => checkStructureMath(structure), [structure]);
  // Questions « feuilles » (la question, ou ses sous-questions) : solution et barème sont là.
  type Leaf = { solution?: { html?: string }; points?: number };
  const leaves: Leaf[] = questions.flatMap((q): Leaf[] => (q.subQuestions?.length ? q.subQuestions : [q]));
  const withoutSolution = leaves.filter((x) => !text(x.solution?.html)).length;
  const totalPoints = leaves.reduce((s, x) => s + (Number(x.points) || 0), 0);

  const go = (n: number) => {
    if (n > step && step === 0 && step1Missing.length) { setTried(true); return; }
    if (n > step && step === 1 && step2Missing.length) { setTried(true); return; }
    setTried(false);
    setStep(n);
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const publish = async () => {
    if (step1Missing.length || step2Missing.length || mathErrors.length) return;
    setSaving(true); setError(null);
    const chosen = chapters.filter((c) => d.chapterIds.includes(c.id));
    try {
      const res = await saveContent({
        type: d.type, title: d.title, structure, difficulty: d.difficulty,
        subjectId: subjectId ?? chosen[0]?.subject?.id ?? null,
        levelIds: d.levelIds, chapterIds: d.chapterIds,
        subfieldIds: [...new Set(chosen.map((c) => c.subfield?.id).filter((x): x is number => !!x))],
        theoremIds: d.theoremIds.filter((t) => theorems.some((x) => x.id === t)),
        schoolId: d.school.id, durationMinutes: d.durationMinutes, isNationalExam: d.isNationalExam, nationalYear: d.nationalYear,
      }, id);
      if (!editing) dropDraft();
      navigate(`${typeDef.base}/${res.id ?? id}`);
    } catch (e) {
      const data = (e as { response?: { data?: Record<string, unknown> } })?.response?.data;
      const first = data && Object.entries(data)[0];
      setError(first ? `${first[0] === 'detail' ? '' : `${first[0]} : `}${Array.isArray(first[1]) ? first[1][0] : String(first[1])}`
        : 'L’enregistrement a échoué. Réessaie.');
    } finally {
      setSaving(false);
    }
  };

  // ── Garde-fous
  if (authLoading || loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-ink-faint" /></div>;
  }
  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="mb-4 text-ink-soft">Connecte-toi pour ajouter un contenu.</p>
        <Link to="/login" className="fd-btn-primary">Se connecter</Link>
      </div>
    );
  }

  const preview = (
    <div className="fd-read rounded-2xl border border-line bg-white px-4 py-5 sm:px-8 sm:py-7" data-tour="creer-apercu">
      <ReadingStyles />
      <p className="text-[11px] font-bold uppercase tracking-[.1em] text-ink-faint">Aperçu</p>
      <h2 className="fd-display mt-1 text-[22px] leading-tight text-ink">{d.title || <span className="text-ink-faint">Sans titre</span>}</h2>
      <div className="mt-5">
        {d.type === 'lesson'
          ? <div className="fd-lesson"><LessonReader structure={structure as FlexibleLessonStructure} /></div>
          : <ExerciseRenderer structure={structure as FlexibleExerciseStructure} variant="reading" interactive={false} compact={false} showAllSolutions />}
      </div>
    </div>
  );

  const chosenLevels = levels.filter((l) => d.levelIds.includes(Number(l.id)));
  const chosenChapters = chapters.filter((c) => d.chapterIds.includes(c.id));
  const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const groups = Object.entries(
    chapters.filter((c) => !chapterQuery || fold(c.name).includes(fold(chapterQuery)))
      .reduce<Record<string, ChapterOption[]>>((acc, c) => { (acc[c.subfield?.name || 'Autres'] ||= []).push(c); return acc; }, {}),
  );
  const missingClass = (cond: boolean) => (tried && cond ? 'ring-2 ring-[#e3b7b1]' : '');

  return (
    <div className="min-h-screen bg-paper pb-6" ref={topRef}>
      <div className="mx-auto w-full max-w-[1180px] px-4 pt-4 sm:pt-6 md:px-8">
        {/* En-tête : retour, titre, étapes */}
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate(typeDef.base))}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[13px] text-ink-soft hover:bg-[#f2f1ee] hover:text-ink">
            <ArrowLeft className="h-4 w-4" /> Retour
          </button>
          <h1 className="fd-display text-[24px] leading-tight text-ink">
            {editing ? `Modifier ${d.type === 'lesson' ? 'la leçon' : d.type === 'exam' ? 'le devoir' : 'l’exercice'}` : 'Ajouter un contenu'}
          </h1>
        </div>
        <ol className="mt-4 flex flex-wrap gap-2" aria-label="Étapes">
          {STEPS.map((label, i) => (
            <li key={label}>
              <button type="button" onClick={() => go(i)} aria-current={step === i ? 'step' : undefined}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  step === i ? 'border-ink bg-ink text-white' : i < step ? 'border-brand-line bg-brand-soft text-brand-hover' : 'border-line bg-white text-ink-faint hover:text-ink'}`}>
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11.5px] font-bold ${step === i ? 'bg-white text-ink' : i < step ? 'bg-brand text-white' : 'bg-[#f2f1ee] text-ink-faint'}`}>
                  {i < step ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                {label}
              </button>
            </li>
          ))}
        </ol>

        {restored && !editing && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-white px-4 py-2.5 text-[13px] text-ink-soft">
            Ton brouillon a été repris là où tu l’avais laissé.
            <button type="button" className="font-semibold text-ink underline-offset-2 hover:underline"
              onClick={() => { dropDraft(); setD(starter(contentType)); setRestored(false); setStep(0); }}>
              Recommencer à zéro
            </button>
          </div>
        )}
        {error && <p role="alert" className="mt-4 rounded-xl border border-[#f0d4cf] bg-[#fbf1ef] px-4 py-3 text-[13px] text-[#9c3b2e]">{error}</p>}

        {/* ─────────────── Étape 1 : le contenu */}
        {step === 0 && (
          <div className="mt-6 max-w-[760px] space-y-6">
            {!editing && (
              <section aria-labelledby="w-type">
                <h2 id="w-type" className="mb-2 text-[14px] font-semibold text-ink">Que veux-tu ajouter ?</h2>
                <div className="grid gap-2 sm:grid-cols-3">
                  {TYPES.map((t) => (
                    <button key={t.key} type="button" aria-pressed={d.type === t.key}
                      onClick={() => { if (t.key !== d.type) setD((p) => ({ ...starter(t.key), title: p.title, levelIds: p.levelIds, chapterIds: p.chapterIds, school: p.school })); }}
                      className={`rounded-2xl border p-3.5 text-left transition-colors ${d.type === t.key ? 'border-ink bg-white ring-1 ring-ink' : 'border-line bg-white hover:border-ink/40'}`}>
                      <span className="block text-[14.5px] font-semibold text-ink">{t.label}</span>
                      <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-faint">{t.hint}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section>
              <label htmlFor="w-title" className="mb-1.5 block text-[14px] font-semibold text-ink">Titre</label>
              <input id="w-title" data-tour="creer-titre" value={d.title} onChange={(e) => patch({ title: e.target.value })} maxLength={200}
                placeholder={d.type === 'lesson' ? 'Ex. Dérivation — cours' : d.type === 'exam' ? 'Ex. Devoir surveillé n° 1 — limites et continuité' : 'Ex. Suite homographique et limite'}
                className={`h-12 w-full rounded-xl border border-line bg-white px-4 text-[16px] text-ink focus:border-brand focus:outline-none ${missingClass(d.title.trim().length < 3)}`} />
              <p className="mt-1 text-[12px] text-ink-faint">Dis de quoi il s’agit, plutôt que « Exercice 3 ».</p>
            </section>

            <section data-tour="creer-classement" className="space-y-5">
              <div>
                <h2 className="mb-2 flex items-center gap-1.5 text-[14px] font-semibold text-ink"><GraduationCap className="h-4 w-4" /> Niveau</h2>
                <div className={`flex flex-wrap gap-2 rounded-xl ${missingClass(!d.levelIds.length)}`}>
                  {levels.map((l) => {
                    const on = d.levelIds.includes(Number(l.id));
                    return (
                      <button key={l.id} type="button" aria-pressed={on}
                        onClick={() => patch({ levelIds: on ? d.levelIds.filter((x) => x !== Number(l.id)) : [...d.levelIds, Number(l.id)] })}
                        className={`min-h-10 rounded-full border px-3.5 text-[13.5px] font-medium transition-colors ${on ? 'border-brand bg-brand text-white' : 'border-line bg-white text-ink-soft hover:border-ink/40 hover:text-ink'}`}>
                        {on && <Check className="-ml-0.5 mr-1 inline h-3.5 w-3.5" />}{l.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {subjects.length > 1 && (
                <div>
                  <label htmlFor="w-subject" className="mb-1.5 block text-[14px] font-semibold text-ink">Matière</label>
                  <select id="w-subject" value={subjectId ?? ''} onChange={(e) => patch({ subjectId: Number(e.target.value) || null, chapterIds: [] })}
                    className="h-11 rounded-xl border border-line bg-white px-3 text-[14px] text-ink focus:border-brand focus:outline-none">
                    {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <h2 className="mb-2 text-[14px] font-semibold text-ink">Chapitre</h2>
                {!d.levelIds.length ? (
                  <p className="rounded-xl border border-dashed border-line px-4 py-3 text-[13px] text-ink-faint">Choisis d’abord un niveau.</p>
                ) : (
                  <div className={`rounded-2xl border border-line bg-white ${missingClass(!d.chapterIds.length)}`}>
                    {chosenChapters.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 border-b border-line p-2.5">
                        {chosenChapters.map((c) => (
                          <button key={c.id} type="button" onClick={() => patch({ chapterIds: d.chapterIds.filter((x) => x !== c.id) })}
                            className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-[12.5px] font-medium text-brand-hover hover:bg-brand-line">
                            {c.name} <X className="h-3 w-3" aria-label="Retirer" />
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="relative border-b border-line">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                      <input value={chapterQuery} onChange={(e) => setChapterQuery(e.target.value)} placeholder="Chercher un chapitre…"
                        aria-label="Chercher un chapitre" className="h-11 w-full rounded-t-2xl bg-transparent pl-9 pr-3 text-[14px] focus:outline-none" />
                    </div>
                    <div className="max-h-64 overflow-y-auto p-2">
                      {groups.length === 0 && <p className="px-2 py-3 text-[13px] text-ink-faint">Aucun chapitre trouvé.</p>}
                      {groups.map(([group, list]) => (
                        <div key={group} className="mb-1">
                          {groups.length > 1 && <p className="px-2 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[.08em] text-ink-faint">{group}</p>}
                          {list.map((c) => {
                            const on = d.chapterIds.includes(c.id);
                            return (
                              <button key={c.id} type="button" aria-pressed={on}
                                onClick={() => patch({ chapterIds: on ? d.chapterIds.filter((x) => x !== c.id) : [...d.chapterIds, c.id] })}
                                className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[13.5px] ${on ? 'bg-brand-soft text-brand-hover' : 'text-ink-soft hover:bg-paper hover:text-ink'}`}>
                                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${on ? 'border-brand bg-brand' : 'border-[#cfcdc8] bg-white'}`}>
                                  {on && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                                </span>
                                {c.name}
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {d.type !== 'lesson' && (
                <div>
                  <h2 className="mb-2 text-[14px] font-semibold text-ink">Difficulté</h2>
                  <div className={`flex flex-wrap gap-2 rounded-xl ${missingClass(!d.difficulty)}`}>
                    {DIFFICULTIES.map((x) => (
                      <button key={x.key} type="button" aria-pressed={d.difficulty === x.key} onClick={() => patch({ difficulty: x.key })}
                        className={`min-h-10 rounded-full border px-4 text-[13.5px] font-medium ${d.difficulty === x.key ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-soft hover:border-ink/40 hover:text-ink'}`}>
                        {x.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 text-[12px] text-ink-faint">Pour un élève du niveau qui découvre le chapitre.</p>
                </div>
              )}

              {d.type === 'exam' && (
                <div className="flex flex-wrap items-end gap-5">
                  <div>
                    <h2 className="mb-2 text-[14px] font-semibold text-ink">Durée</h2>
                    <div className="flex flex-wrap gap-2">
                      {DURATIONS.map((m) => (
                        <button key={m} type="button" aria-pressed={d.durationMinutes === m} onClick={() => patch({ durationMinutes: m })}
                          className={`min-h-10 rounded-full border px-3.5 text-[13.5px] font-medium ${d.durationMinutes === m ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-soft hover:text-ink'}`}>
                          {fmtDuration(m)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="inline-flex min-h-10 items-center gap-2 text-[13.5px] text-ink-soft">
                    <input type="checkbox" checked={d.isNationalExam} onChange={(e) => patch({ isNationalExam: e.target.checked, nationalYear: e.target.checked ? d.nationalYear ?? new Date().getFullYear() : null })}
                      className="h-4 w-4 accent-[#1a7a4a]" />
                    Examen national
                    {d.isNationalExam && (
                      <input type="number" min={1990} max={2100} value={d.nationalYear ?? ''} aria-label="Année de la session"
                        onChange={(e) => patch({ nationalYear: Number(e.target.value) || null })}
                        className="ml-1 h-9 w-24 rounded-lg border border-line bg-white px-2 text-[13.5px] focus:border-brand focus:outline-none" />
                    )}
                  </label>
                </div>
              )}
            </section>

            {/* Plus d'options : établissement d'origine, théorèmes */}
            <section className="rounded-2xl border border-line bg-white">
              <button type="button" onClick={() => setMoreOpen(!moreOpen)} aria-expanded={moreOpen}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-[14px] font-semibold text-ink">
                <span>Plus d’options <span className="font-normal text-ink-faint">— établissement d’origine, théorèmes</span></span>
                <ChevronDown className={`h-4 w-4 text-ink-faint transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
              </button>
              {moreOpen && (
                <div className="space-y-5 border-t border-line px-4 py-4">
                  <div>
                    <label className="mb-1.5 block text-[13.5px] font-semibold text-ink">Établissement d’origine <span className="font-normal text-ink-faint">(facultatif)</span></label>
                    <SchoolPicker value={d.school} onChange={(school) => patch({ school })} />
                    <p className="mt-1 text-[12px] text-ink-faint">
                      {d.school.name && d.school.id === null
                        ? 'Choisis l’établissement dans la liste pour qu’il soit enregistré.'
                        : 'Le lycée où ce sujet a été donné ; il s’affiche sur la page du contenu.'}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1.5 text-[13.5px] font-semibold text-ink">Théorèmes utilisés <span className="font-normal text-ink-faint">(facultatif)</span></p>
                    {!d.chapterIds.length ? <p className="text-[12.5px] text-ink-faint">Choisis d’abord un chapitre.</p>
                      : !theorems.length ? <p className="text-[12.5px] text-ink-faint">Aucun théorème répertorié pour ce chapitre.</p>
                        : (
                          <div className="flex flex-wrap gap-1.5">
                            {theorems.map((t) => {
                              const on = d.theoremIds.includes(t.id);
                              return (
                                <button key={t.id} type="button" aria-pressed={on}
                                  onClick={() => patch({ theoremIds: on ? d.theoremIds.filter((x) => x !== t.id) : [...d.theoremIds, t.id] })}
                                  className={`rounded-full border px-3 py-1 text-[12.5px] ${on ? 'border-gold-line bg-gold-soft text-gold-strong' : 'border-line bg-white text-ink-soft hover:text-ink'}`}>
                                  {t.name}
                                </button>
                              );
                            })}
                          </div>
                        )}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        {/* ─────────────── Étape 2 : écrire */}
        {step === 1 && (
          <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="min-w-0" data-tour="creer-blocs">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[13px] text-ink-faint">Les formules s’écrivent entre <code className="rounded bg-[#f2f1ee] px-1">$…$</code> ; la barre « Encarts » ajoute définitions et théorèmes.</p>
                <button type="button" onClick={() => setShowJson(true)} data-tour="creer-importer"
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12.5px] font-medium text-ink-faint hover:bg-[#f2f1ee] hover:text-ink">
                  <FileJson className="h-3.5 w-3.5" /> Importer un fichier
                </button>
              </div>
              {d.type === 'lesson'
                ? <LessonSectionsEditor sections={d.sections} onChange={(sections) => patch({ sections })} />
                : <QuestionsEditor blocks={d.blocks} onChange={(blocks) => patch({ blocks })} isExam={d.type === 'exam'} />}
              {tried && step2Missing.length > 0 && <p className="mt-3 text-[13px] text-[#9c3b2e]">Écris {step2Missing.join(' et ')}.</p>}
              <button type="button" onClick={() => setShowPreview(!showPreview)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] font-medium text-ink-soft hover:bg-[#f2f1ee] lg:hidden">
                <Eye className="h-4 w-4" /> {showPreview ? 'Masquer l’aperçu' : 'Voir l’aperçu'}
              </button>
              {showPreview && <div className="mt-3 lg:hidden">{preview}</div>}
            </div>
            <div className="sticky top-20 hidden max-h-[calc(100vh-7rem)] overflow-y-auto lg:block">{preview}</div>
          </div>
        )}

        {/* ─────────────── Étape 3 : vérifier et publier */}
        {step === 2 && (
          <div className="mt-6 grid items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="space-y-4 lg:sticky lg:top-20">
              <section className="fd-card p-4">
                <h2 className="text-[14px] font-semibold text-ink">Récapitulatif</h2>
                <dl className="mt-2 space-y-1.5 text-[13px]">
                  <Row label="Type" value={typeDef.label} />
                  <Row label="Niveau" value={chosenLevels.map((l) => l.name).join(', ')} />
                  <Row label="Chapitre" value={chosenChapters.map((c) => c.name).join(', ')} />
                  {d.type !== 'lesson' && <Row label="Difficulté" value={DIFFICULTIES.find((x) => x.key === d.difficulty)?.label ?? '—'} />}
                  {d.type === 'exam' && d.durationMinutes ? <Row label="Durée" value={fmtDuration(d.durationMinutes)} /> : null}
                  {d.type === 'exam' && totalPoints > 0 && <Row label="Barème" value={`${String(totalPoints).replace('.', ',')} points`} />}
                  {d.school.id && <Row label="Établissement" value={`${d.school.name}${d.school.city ? `, ${d.school.city}` : ''}`} />}
                </dl>
                <button type="button" onClick={() => go(0)} className="mt-3 text-[12.5px] font-medium text-ink-soft underline-offset-2 hover:text-ink hover:underline">Modifier ces informations</button>
              </section>
              <section className="fd-card p-4">
                <h2 className="text-[14px] font-semibold text-ink">À vérifier</h2>
                <ul className="mt-2 space-y-2 text-[13px]">
                  {mathErrors.length > 0 ? mathErrors.slice(0, 6).map((m, i) => (
                    <li key={i} className="flex gap-2 text-[#9c3b2e]"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> Formule à corriger — {m.where}</li>
                  )) : <li className="flex gap-2 text-brand-hover"><Check className="mt-0.5 h-4 w-4 shrink-0" /> Toutes les formules s’affichent.</li>}
                  {d.type !== 'lesson' && (withoutSolution > 0
                    ? <li className="flex gap-2 text-gold-strong"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {withoutSolution} question{withoutSolution > 1 ? 's' : ''} sans solution (possible, mais les élèves s’en servent beaucoup).</li>
                    : <li className="flex gap-2 text-brand-hover"><Check className="mt-0.5 h-4 w-4 shrink-0" /> Chaque question a sa solution.</li>)}
                  {d.type === 'exam' && totalPoints > 0 && Math.abs(totalPoints - 20) > 1e-9 && (
                    <li className="flex gap-2 text-gold-strong"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> Barème total : {String(totalPoints).replace('.', ',')} points (et non 20).</li>
                  )}
                </ul>
              </section>
              <button type="button" onClick={publish} disabled={saving || mathErrors.length > 0 || step1Missing.length > 0 || step2Missing.length > 0}
                data-tour="creer-enregistrer" className="fd-btn-primary min-h-12 w-full justify-center text-[15px] disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {editing ? 'Enregistrer les modifications' : 'Publier'}
              </button>
              {(step1Missing.length > 0 || step2Missing.length > 0) && (
                <p className="text-[12.5px] text-[#9c3b2e]">Il manque {[...step1Missing, ...step2Missing].join(', ')}.</p>
              )}
            </aside>
            <div className="min-w-0">{preview}</div>
          </div>
        )}
      </div>

      {/* Barre du bas : précédent / suivant (collée en bas de l'écran, dans la colonne de la page) */}
      {step < 2 && (
        <div className="sticky bottom-[calc(var(--fd-tabbar-h,0px)+12px)] z-30 mx-auto mt-8 max-w-[1180px] px-4 md:px-8">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white/95 px-4 py-3 shadow-[0_-6px_20px_rgba(20,18,16,.06)] backdrop-blur">
            <span className="min-w-0 truncate text-[12.5px] text-[#9c3b2e]">
              {tried && (step === 0 ? step1Missing : step2Missing).length > 0 ? `Il manque ${(step === 0 ? step1Missing : step2Missing).join(', ')}.` : ''}
            </span>
            <span className="flex shrink-0 gap-2">
              {step > 0 && <button type="button" onClick={() => go(step - 1)} className="min-h-11 rounded-xl border border-line bg-white px-4 text-[14px] font-medium text-ink-soft hover:text-ink">Précédent</button>}
              <button type="button" onClick={() => go(step + 1)} className="fd-btn-primary min-h-11 px-5 text-[14px]">
                {step === 0 ? 'Écrire' : 'Vérifier'} <ArrowRight className="h-4 w-4" />
              </button>
            </span>
          </div>
        </div>
      )}

      <JsonImportModal isOpen={showJson} onClose={() => setShowJson(false)} contentType={d.type}
        onImport={(data) => {
          if (!data) return;
          const st = data.structure || {};
          patch({
            title: d.title || data.title || '',
            difficulty: d.difficulty || (['easy', 'medium', 'hard'].includes(data.difficulty) ? data.difficulty : undefined),
            ...(d.type === 'lesson'
              ? (Array.isArray(st.sections) && st.sections.length ? { sections: st.sections } : {})
              : (Array.isArray(st.blocks) && st.blocks.length ? { blocks: st.blocks } : {})),
          });
        }} />
    </div>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex gap-2"><dt className="w-24 shrink-0 text-ink-faint">{label}</dt><dd className="min-w-0 text-ink">{value || '—'}</dd></div>
);

export default ContentWizard;
