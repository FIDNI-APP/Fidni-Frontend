// Feuille d'exercices au format A4, façon sujet de maths, à exporter en PDF.
// Ce n'est pas une impression de la page du site : la mise en page est propre au papier
// (en-tête Fidni, exercices numérotés, barème, corrigé optionnel, pied de page paginé).
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Download, Loader2, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getRevisionList } from '@/lib/api';
import { exerciseAPI } from '@/lib/api/contentApiFactory';
import { renderContentHtml } from '@/components/editor/TipTapRenderer';
import { getDifficultyLabel } from '@/lib/utils/difficultyHelpers';
import type { Difficulty } from '@/types';
import { TourHelpButton } from '@/components/tour/TourProvider';

type SolutionsMode = 'none' | 'end' | 'inline';

interface RichText { html?: string }
interface SubQuestion { id: string; content?: RichText; points?: number; solution?: RichText }
interface Block {
  id: string;
  type: 'context' | 'question' | 'section' | string;
  content?: RichText;
  points?: number;
  solution?: RichText;
  subQuestions?: SubQuestion[];
}

interface PaperItem {
  key: string;
  kind: 'exercise' | 'exam' | 'lesson';
  title: string;
  blocks: Block[];
  subject?: string;
  level?: string;
  difficulty?: string;
  nationalYear?: number;
  durationMinutes?: number;
}

interface PaperData {
  title: string;
  description?: string;
  kindLabel: string;
  items: PaperItem[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toItem = (c: any, key: string): PaperItem => ({
  key,
  kind: c.type === 'exam' ? 'exam' : c.type === 'lesson' ? 'lesson' : 'exercise',
  title: c.title || 'Sans titre',
  blocks: Array.isArray(c.structure?.blocks) ? c.structure.blocks : [],
  subject: typeof c.subject === 'string' ? c.subject : c.subject?.name,
  level: c.class_levels?.[0] ? (typeof c.class_levels[0] === 'string' ? c.class_levels[0] : c.class_levels[0].name) : undefined,
  difficulty: c.difficulty,
  nationalYear: c.is_national_exam ? c.national_year : undefined,
  durationMinutes: c.duration_minutes || undefined,
});

/** « 0,5 pt », « 2 pts » : notation française des barèmes. */
const formatPoints = (n: number) => `${String(n).replace('.', ',')} pt${n > 1 ? 's' : ''}`;

const blockPoints = (b: Block) =>
  b.subQuestions?.length ? b.subQuestions.reduce((s, sq) => s + (Number(sq.points) || 0), 0) : Number(b.points) || 0;

const itemPoints = (item: PaperItem) =>
  item.blocks.filter((b) => b.type === 'question').reduce((s, b) => s + blockPoints(b), 0);

const hasSolutions = (item: PaperItem) =>
  item.blocks.some((b) => b.solution?.html || b.subQuestions?.some((sq) => sq.solution?.html));

const formatDuration = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} h${m ? ` ${String(m).padStart(2, '0')}` : ''}` : `${m} min`;
};

const uniq = (values: (string | undefined)[]) => [...new Set(values.filter(Boolean))] as string[];

/** Chaîne CSS sûre (pied de page généré par @page). */
const cssString = (s: string) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ')}"`;

const Rich: React.FC<{ content?: RichText; className?: string }> = ({ content, className }) => {
  const html = useMemo(() => renderContentHtml(content?.html || ''), [content?.html]);
  if (!html) return null;
  // Déjà filtré par sanitizeHtml dans renderContentHtml.
  return <div className={`fp-rich ${className || ''}`} dangerouslySetInnerHTML={{ __html: html }} />;
};

const Solution: React.FC<{ content?: RichText }> = ({ content }) =>
  content?.html ? (
    <div className="fp-sol">
      <span className="fp-sol-label">Solution</span>
      <Rich content={content} />
    </div>
  ) : null;

const letter = (i: number) => String.fromCharCode(97 + (i % 26));

const ExerciseBody: React.FC<{ item: PaperItem; inlineSolutions: boolean }> = ({ item, inlineSolutions }) => {
  let q = 0;
  return (
    <>
      {item.blocks.map((b) => {
        if (b.type === 'context') return <Rich key={b.id} content={b.content} className="fp-context" />;
        if (b.type === 'section') {
          q = 0; // chaque partie d'un examen renumérote ses questions
          return (
            <div key={b.id} className="fp-part">
              <Rich content={b.content} />
              <span className="fp-pts">{Number(b.points) > 0 ? `(${formatPoints(Number(b.points))})` : ''}</span>
            </div>
          );
        }
        q += 1;
        const subs = b.subQuestions || [];
        return (
          <div key={b.id} className="fp-q-group">
            <div className="fp-q">
              <span className="fp-num">{q}.</span>
              <Rich content={b.content} />
              <span className="fp-pts">{!subs.length && Number(b.points) > 0 ? `(${formatPoints(Number(b.points))})` : ''}</span>
            </div>
            {!subs.length && inlineSolutions && <Solution content={b.solution} />}
            {subs.map((sq, i) => (
              <React.Fragment key={sq.id}>
                <div className="fp-q fp-sq">
                  <span className="fp-num">{letter(i)})</span>
                  <Rich content={sq.content} />
                  <span className="fp-pts">{Number(sq.points) > 0 ? `(${formatPoints(Number(sq.points))})` : ''}</span>
                </div>
                {inlineSolutions && <div className="fp-sq-sol"><Solution content={sq.solution} /></div>}
              </React.Fragment>
            ))}
          </div>
        );
      })}
    </>
  );
};

/** Corrigé regroupé en fin de document, sur une nouvelle page. */
const AnswerKey: React.FC<{ items: PaperItem[] }> = ({ items }) => (
  <section className="fp-key">
    <h2 className="fp-key-title">Corrigé</h2>
    {items.map((item, idx) => {
      if (!hasSolutions(item)) return null;
      let q = 0;
      return (
        <div key={item.key} className="fp-key-ex">
          <h3 className="fp-key-ex-title">
            {item.kind === 'exam' ? 'Examen' : 'Exercice'} {idx + 1} <span>— {item.title}</span>
          </h3>
          {item.blocks.map((b) => {
            if (b.type === 'section') {
              q = 0;
              return <Rich key={b.id} content={b.content} className="fp-part" />;
            }
            if (b.type !== 'question') return null;
            q += 1;
            const n = q;
            const subs = b.subQuestions || [];
            if (!subs.length) {
              return b.solution?.html ? (
                <div key={b.id} className="fp-q"><span className="fp-num">{n}.</span><Rich content={b.solution} /><span /></div>
              ) : null;
            }
            return subs.map((sq, i) => (sq.solution?.html ? (
              <div key={sq.id} className="fp-q"><span className="fp-num">{n}.{letter(i)})</span><Rich content={sq.solution} /><span /></div>
            ) : null));
          })}
        </div>
      );
    })}
  </section>
);

/** Ce que l'enseignant (ou l'élève) peut changer sur la feuille. */
interface PaperCustom {
  title: string;
  school: string;
  teacher: string;
  className: string;
  schoolYear: string;
  instructions: string;
  studentLine: boolean;
  showDifficulty: boolean;
}

// Réglages repris d'une feuille à l'autre (propres à ce navigateur) : établissement, enseignant, options.
const PREFS_KEY = 'fidni:paper-prefs';
const REMEMBERED: (keyof PaperCustom)[] = ['school', 'teacher', 'studentLine', 'showDifficulty'];

const loadPrefs = (userKey: string): Partial<PaperCustom> => {
  try {
    const all = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
    return all && typeof all === 'object' && all[userKey] && typeof all[userKey] === 'object' ? all[userKey] : {};
  } catch {
    return {};
  }
};

const savePrefs = (userKey: string, prefs: Partial<PaperCustom>) => {
  try {
    const all = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') || {};
    all[userKey] = Object.fromEntries(Object.entries(prefs).filter(([k]) => REMEMBERED.includes(k as keyof PaperCustom)));
    localStorage.setItem(PREFS_KEY, JSON.stringify(all));
  } catch { /* stockage indisponible : les réglages valent pour cette page seulement */ }
};

/** Année scolaire en cours : elle commence en septembre. */
const currentSchoolYear = () => {
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
};

interface PaperExportProps {
  source: 'revision-list' | 'content';
}

export const PaperExport: React.FC<PaperExportProps> = ({ source }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<PaperData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const { user } = useAuth();
  const userKey = user ? String(user.id) : 'guest';
  const [showCustomize, setShowCustomize] = useState(false);
  const [overrides, setOverrides] = useState<Partial<PaperCustom>>(() => loadPrefs(userKey));
  useEffect(() => { setOverrides(loadPrefs(userKey)); }, [userKey]);
  const mode = (['none', 'end', 'inline'].includes(searchParams.get('solutions') || '')
    ? searchParams.get('solutions') : 'none') as SolutionsMode;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        if (source === 'revision-list') {
          const list = await getRevisionList(Number(id));
          const items = (list.items || [])
            .filter((it) => it.content_object)
            .map((it) => toItem(it.content_object, String(it.id)));
          if (!cancelled) setData({ title: list.name, description: list.description, kindLabel: 'Série de révision', items });
        } else {
          const c = await exerciseAPI.getById(id);
          const item = toItem(c, String(id));
          const kindLabel = item.kind === 'exam'
            ? (item.nationalYear ? `Examen national ${item.nationalYear}` : 'Examen')
            : 'Exercice';
          if (!cancelled) setData({ title: item.title, kindLabel, items: [item] });
        }
      } catch {
        if (!cancelled) setError('Impossible de charger ce contenu.');
      }
    })();
    return () => { cancelled = true; };
  }, [id, source]);

  // Valeurs par défaut tirées du compte : établissement, nom de l'enseignant, classe.
  const defaults = useMemo<PaperCustom | null>(() => {
    if (!data) return null;
    const profile = user?.profile;
    const levels = uniq(data.items.map((i) => i.level));
    const fullName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim();
    return {
      title: data.title,
      school: profile?.school
        ? `${profile.school.name}${profile.school.city ? `, ${profile.school.city}` : ''}`
        : profile?.school_name || '',
      // « M. Alaoui » / « Mme Alaoui » : civilité d'après le sexe du compte enseignant.
      teacher: profile?.user_type === 'teacher' && fullName
        ? `${profile.gender === 'F' ? 'Mme ' : profile.gender === 'M' ? 'M. ' : ''}${fullName}`
        : '',
      className: levels.length === 1 ? levels[0] : profile?.class_level_name || '',
      schoolYear: currentSchoolYear(),
      instructions: '',
      studentLine: true,
      showDifficulty: true,
    };
  }, [data, user]);
  const custom: PaperCustom | null = defaults ? { ...defaults, ...overrides } : null;

  const setCustom = (patch: Partial<PaperCustom>) => {
    setOverrides((prev) => {
      const next = { ...prev, ...patch };
      savePrefs(userKey, next);
      return next;
    });
  };
  const resetCustom = () => { setOverrides({}); savePrefs(userKey, {}); };

  // Le titre de l'onglet devient le nom proposé pour le fichier PDF.
  const paperTitle = custom?.title.trim() || data?.title || '';
  useEffect(() => {
    if (!paperTitle) return;
    const previous = document.title;
    document.title = `${paperTitle} — Fidni`;
    return () => { document.title = previous; };
  }, [paperTitle]);

  const setMode = (m: SolutionsMode) => {
    const next = new URLSearchParams(searchParams);
    if (m === 'none') next.delete('solutions'); else next.set('solutions', m);
    setSearchParams(next, { replace: true });
  };

  const handleDownload = async () => {
    setPreparing(true);
    try {
      // Polices et images chargées avant de générer, sinon le PDF peut sortir incomplet.
      await document.fonts?.ready;
      await Promise.all([...document.querySelectorAll<HTMLImageElement>('.fp-sheet img')]
        .map((img) => (img.complete ? Promise.resolve() : img.decode().catch(() => undefined))));
    } finally {
      setPreparing(false);
    }
    window.print();
  };

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(source === 'revision-list' ? '/revision-lists' : '/');
  };

  if (error) {
    return (
      <div className="fp-desk fp-center">
        <p style={{ color: '#6b6862', marginBottom: 16 }}>{error}</p>
        <button className="fd-btn-primary" onClick={goBack}>Retour</button>
        <style>{styles('')}</style>
      </div>
    );
  }
  if (!data || !custom) {
    return (
      <div className="fp-desk fp-center">
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: '#6b6862' }} />
        <style>{styles('')}</style>
      </div>
    );
  }

  const { items } = data;
  const totalPoints = items.reduce((s, it) => s + itemPoints(it), 0);
  const duration = items.reduce((s, it) => s + (it.durationMinutes || 0), 0);
  const subjects = uniq(items.map((i) => i.subject));
  const levels = uniq(items.map((i) => i.level));
  const anySolution = items.some(hasSolutions);
  const effectiveMode: SolutionsMode = anySolution ? mode : 'none';
  const today = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  const facts = [
    `${items.length} ${items.length > 1 ? 'exercices' : 'exercice'}`,
    totalPoints > 0 ? `${String(totalPoints).replace('.', ',')} points` : null,
    duration > 0 ? `Durée : ${formatDuration(duration)}` : null,
    today,
  ].filter(Boolean);

  return (
    <div className="fp-desk">
      {/* Barre d'outils (écran seulement) */}
      <div className="fp-toolbar">
        <div className="fp-toolbar-inner">
          <button className="fp-back" onClick={goBack}>
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
          <div className="fp-toolbar-title">Aperçu du PDF</div>
          <div className="fp-toolbar-actions">
            <button className={`fp-back ${showCustomize ? 'is-on' : ''}`} onClick={() => setShowCustomize((v) => !v)} data-tour="pdf-personnaliser"
              aria-expanded={showCustomize}>
              <SlidersHorizontal className="w-4 h-4" /> Personnaliser
            </button>
            {anySolution && (
              <div className="fp-seg" role="group" aria-label="Solutions" data-tour="pdf-corrige">
                {([['none', 'Sans corrigé'], ['end', 'Corrigé à la fin'], ['inline', 'Sous chaque question']] as const).map(([m, label]) => (
                  <button key={m} className={effectiveMode === m ? 'is-active' : ''} onClick={() => setMode(m)}>{label}</button>
                ))}
              </div>
            )}
            <TourHelpButton style={{ width: 34, height: 34 }} />
            <button className="fd-btn-primary" onClick={handleDownload} disabled={preparing} data-tour="pdf-telecharger">
              {preparing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Télécharger le PDF
            </button>
          </div>
        </div>
        <p className="fp-hint">Choisis « Enregistrer au format PDF » comme destination dans la fenêtre qui s’ouvre.</p>
      </div>

      {showCustomize && (
        <section className="fp-panel" aria-label="Personnaliser la feuille">
          <div className="fp-panel-grid">
            <label className="fp-field fp-wide">
              <span>Titre</span>
              <input value={custom.title} onChange={(e) => setCustom({ title: e.target.value })} />
            </label>
            <label className="fp-field">
              <span>Établissement</span>
              <input value={custom.school} placeholder="Ex. : Lycée Moulay Youssef, Rabat"
                onChange={(e) => setCustom({ school: e.target.value })} />
            </label>
            <label className="fp-field">
              <span>Enseignant(e)</span>
              <input value={custom.teacher} placeholder="Ex. : M. Alaoui"
                onChange={(e) => setCustom({ teacher: e.target.value })} />
            </label>
            <label className="fp-field">
              <span>Classe</span>
              <input value={custom.className} placeholder="Ex. : 2ème Bac SM 3"
                onChange={(e) => setCustom({ className: e.target.value })} />
            </label>
            <label className="fp-field">
              <span>Année scolaire</span>
              <input value={custom.schoolYear} onChange={(e) => setCustom({ schoolYear: e.target.value })} />
            </label>
            <label className="fp-field fp-wide">
              <span>Consignes <em>(facultatif)</em></span>
              <textarea rows={2} value={custom.instructions}
                placeholder="Ex. : La calculatrice est autorisée. Rédigez avec soin."
                onChange={(e) => setCustom({ instructions: e.target.value })} />
            </label>
          </div>
          <div className="fp-panel-foot">
            <label className="fp-check">
              <input type="checkbox" checked={custom.studentLine} onChange={(e) => setCustom({ studentLine: e.target.checked })} />
              Cases « Nom et prénom » pour l’élève
            </label>
            <label className="fp-check">
              <input type="checkbox" checked={custom.showDifficulty} onChange={(e) => setCustom({ showDifficulty: e.target.checked })} />
              Afficher la difficulté
            </label>
            <button className="fp-reset" onClick={resetCustom}>
              <RotateCcw className="w-3.5 h-3.5" /> Réinitialiser
            </button>
          </div>
          <p className="fp-panel-note">Établissement, enseignant et options sont retenus pour tes prochaines feuilles.</p>
        </section>
      )}

      {/* La feuille */}
      <article className="fp-sheet">
        <header className="fp-top">
          <div className="fp-brand">
            <img src="/android-chrome-192x192.png" alt="" />
            <div>
              <strong>Fidni</strong>
              <small>fidni.fr</small>
            </div>
          </div>
          <div className="fp-top-right">
            <strong>{data.kindLabel}</strong>
            {(subjects.length === 1 || (levels.length === 1 && !custom.className)) && (
              <small>{[subjects.length === 1 ? subjects[0] : null, levels.length === 1 && !custom.className ? levels[0] : null].filter(Boolean).join(' · ')}</small>
            )}
          </div>
        </header>

        {(custom.school || custom.teacher || custom.schoolYear || custom.className) && (
          <div className="fp-info">
            <div>
              {custom.school && <p><b>Établissement :</b> {custom.school}</p>}
              {custom.teacher && <p><b>Professeur :</b> {custom.teacher}</p>}
            </div>
            <div className="fp-info-right">
              {custom.schoolYear && <p><b>Année scolaire :</b> {custom.schoolYear}</p>}
              {custom.className && <p><b>Classe :</b> {custom.className}</p>}
            </div>
          </div>
        )}

        <h1 className="fp-title">{paperTitle}</h1>
        {data.description && <p className="fp-desc">{data.description}</p>}
        <p className="fp-facts">{facts.join('  ·  ')}</p>
        {custom.instructions.trim() && (
          <div className="fp-instructions"><b>Consignes.</b> {custom.instructions.trim()}</div>
        )}
        {custom.studentLine && (
          <div className="fp-student">
            <span>Nom et prénom : <i /></span>
            <span>{custom.className ? 'N° :' : 'Classe :'} <i /></span>
          </div>
        )}

        {items.length === 0 && <p className="fp-empty">Cette liste ne contient encore aucun exercice.</p>}

        {items.map((item, idx) => {
          const pts = itemPoints(item);
          const meta = [
            item.nationalYear ? `Examen national ${item.nationalYear}` : null,
            items.length > 1 && subjects.length > 1 ? item.subject : null,
            custom.showDifficulty && item.difficulty ? getDifficultyLabel(item.difficulty as Difficulty) : null,
          ].filter(Boolean);
          return (
            <section key={item.key} className="fp-ex">
              <header className="fp-ex-head">
                <span className="fp-ex-label">{item.kind === 'exam' ? 'Examen' : 'Exercice'} {idx + 1}</span>
                <span className="fp-ex-title">{item.title}</span>
                {pts > 0 && <span className="fp-ex-pts">{formatPoints(pts)}</span>}
              </header>
              {meta.length > 0 && <p className="fp-ex-meta">{meta.join(' · ')}</p>}
              {item.blocks.length ? (
                <ExerciseBody item={item} inlineSolutions={effectiveMode === 'inline'} />
              ) : (
                <p className="fp-empty">Énoncé indisponible.</p>
              )}
            </section>
          );
        })}

        {effectiveMode === 'end' && <AnswerKey items={items} />}
      </article>

      <style>{styles(paperTitle)}</style>
    </div>
  );
};

/** Styles de la feuille : écran (aperçu posé sur un bureau) et impression (A4 paginé). */
const styles = (title: string) => `
  /* La police des maths (KaTeX_Main) dessine mal °, « », № : ces seuls caractères viennent d'une serif classique. */
  @font-face { font-family: 'FidniPaperGlyphs'; src: local('Times New Roman'), local('Georgia'), local('Noto Serif'),
    local('DejaVu Serif'); unicode-range: U+00AB, U+00B0, U+00BB, U+2116, U+20AC; }
  .fp-desk { min-height: 100vh; background: #e9e7e3; padding: 0 16px 48px; }
  .fp-center { display: flex; flex-direction: column; align-items: center; justify-content: center; }

  .fp-toolbar { position: sticky; top: 0; z-index: 10; margin: 0 -16px 28px; padding: 12px 16px 10px;
    background: rgba(250, 249, 247, .96); border-bottom: 1px solid #e7e3dc; backdrop-filter: blur(6px); }
  .fp-toolbar-inner { max-width: 1040px; margin: 0 auto; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .fp-toolbar-title { font-weight: 700; font-size: 14px; color: #1a1a1a; }
  .fp-toolbar-actions { margin-left: auto; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  .fp-back { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: #6b6862;
    padding: 7px 10px; border-radius: 10px; border: 1px solid #e7e3dc; background: #fff; }
  .fp-back:hover { color: #1a1a1a; }
  .fp-seg { display: inline-flex; background: #f2f1ee; border-radius: 10px; padding: 3px; }
  .fp-seg button { font-size: 12.5px; padding: 6px 10px; border-radius: 8px; color: #6b6862; }
  .fp-seg button.is-active { background: #fff; color: #1a1a1a; font-weight: 600; box-shadow: 0 1px 2px rgba(0,0,0,.06); }
  .fp-hint { max-width: 1040px; margin: 6px auto 0; font-size: 12px; color: #9a958c; }
  .fp-back.is-on { border-color: #1a7a4a; color: #15633c; }

  .fp-panel { box-sizing: border-box; width: 210mm; max-width: 100%; margin: -12px auto 20px; padding: 16px 18px;
    background: #fff; border: 1px solid #e7e3dc; border-radius: 14px; font-family: 'DM Sans', system-ui, sans-serif; }
  .fp-panel-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 14px; }
  @media (max-width: 640px) { .fp-panel-grid { grid-template-columns: 1fr; } }
  .fp-field { display: flex; flex-direction: column; gap: 5px; font-size: 12.5px; font-weight: 600; color: #33302b; }
  .fp-field em { font-style: normal; font-weight: 400; color: #9a958c; }
  .fp-field input, .fp-field textarea { font: inherit; font-weight: 400; font-size: 13.5px; color: #1a1a1a;
    padding: 8px 11px; border: 1px solid #e7e3dc; border-radius: 10px; background: #faf9f7; resize: vertical; }
  .fp-field input:focus, .fp-field textarea:focus { outline: none; border-color: #1a7a4a; background: #fff;
    box-shadow: 0 0 0 3px rgba(26,122,74,.12); }
  .fp-wide { grid-column: 1 / -1; }
  .fp-panel-foot { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 18px; margin-top: 12px; }
  .fp-check { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; color: #33302b; cursor: pointer; }
  .fp-check input { accent-color: #1a7a4a; width: 15px; height: 15px; }
  .fp-reset { margin-left: auto; display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; color: #6b6862; }
  .fp-reset:hover { color: #1a1a1a; }
  .fp-panel-note { margin: 10px 0 0; font-size: 11.5px; color: #9a958c; }

  .fp-sheet { box-sizing: border-box; width: 210mm; max-width: 100%; min-height: 297mm; margin: 0 auto;
    padding: 16mm 17mm 18mm; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.08), 0 8px 24px rgba(0,0,0,.06);
    color: #1a1a1a; font-family: 'FidniPaperGlyphs', 'KaTeX_Main', 'Latin Modern Roman', 'Times New Roman', serif;
    font-size: 11pt; line-height: 1.5; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  @media (max-width: 820px) { .fp-sheet { padding: 20px 18px; min-height: 0; } }

  .fp-top { display: flex; justify-content: space-between; align-items: center; gap: 12px;
    padding-bottom: 8pt; border-bottom: 1.2pt solid #1a1a1a; font-family: 'DM Sans', system-ui, sans-serif; }
  .fp-brand { display: flex; align-items: center; gap: 8px; }
  .fp-brand img { width: 26px; height: 26px; border-radius: 6px; }
  .fp-brand strong { display: block; font-size: 12pt; line-height: 1.1; }
  .fp-brand small, .fp-top-right small { display: block; font-size: 8.5pt; color: #6b6862; }
  .fp-top-right { text-align: right; font-size: 10pt; line-height: 1.3; }
  .fp-top-right strong { color: #1a7a4a; font-weight: 700; }

  .fp-info { display: flex; justify-content: space-between; gap: 16pt; padding: 6pt 0 0;
    font-family: 'DM Sans', system-ui, sans-serif; font-size: 9.5pt; line-height: 1.45; color: #1a1a1a; }
  .fp-info p { margin: 0; }
  .fp-info b { font-weight: 600; color: #6b6862; }
  .fp-info-right { text-align: right; }
  .fp-instructions { margin: -4pt 0 10pt; padding: 5pt 9pt; border: 0.6pt solid #cfcdc8; border-radius: 3pt;
    font-size: 10pt; font-style: italic; }
  .fp-instructions b { font-style: normal; }
  .fp-title { text-align: center; font-size: 17pt; font-weight: 700; line-height: 1.25; margin: 14pt 0 3pt; }
  .fp-desc { text-align: center; font-style: italic; color: #33302b; margin: 0 0 3pt; }
  .fp-facts { text-align: center; font-family: 'DM Sans', system-ui, sans-serif; font-size: 8.5pt;
    color: #6b6862; margin: 0 0 12pt; white-space: pre-wrap; }
  .fp-student { display: flex; gap: 18pt; font-size: 10pt; padding: 6pt 0 10pt; border-bottom: 0.6pt solid #cfcdc8;
    margin-bottom: 4pt; }
  .fp-student span { display: flex; align-items: baseline; gap: 4pt; white-space: nowrap; }
  .fp-student span:first-child { flex: 1; }
  .fp-student i { flex: 1; min-width: 60pt; border-bottom: 0.8pt dotted #9a958c; transform: translateY(-2pt); }

  .fp-ex { margin-top: 14pt; }
  .fp-ex-head { display: flex; align-items: baseline; gap: 8pt; padding-bottom: 3pt; margin-bottom: 6pt;
    border-bottom: 0.6pt solid #cfcdc8; break-after: avoid; page-break-after: avoid; }
  .fp-ex-label { font-family: 'DM Sans', system-ui, sans-serif; font-size: 9.5pt; font-weight: 700;
    letter-spacing: .06em; text-transform: uppercase; color: #fff; background: #1a7a4a;
    padding: 1.5pt 6pt; border-radius: 3pt; white-space: nowrap; }
  .fp-ex-title { font-weight: 700; font-size: 11.5pt; flex: 1; }
  .fp-ex-pts { font-family: 'DM Sans', system-ui, sans-serif; font-size: 9pt; color: #33302b; white-space: nowrap; }
  .fp-ex-meta { font-family: 'DM Sans', system-ui, sans-serif; font-size: 8.5pt; color: #6b6862;
    margin: -3pt 0 6pt; break-after: avoid; }

  .fp-context { margin-bottom: 6pt; }
  .fp-part { display: flex; justify-content: space-between; align-items: baseline; gap: 8pt; font-weight: 700; margin: 10pt 0 4pt; break-after: avoid; }
  .fp-part p { margin: 0; }
  .fp-q-group { margin-bottom: 5pt; }
  .fp-q { display: grid; grid-template-columns: 7mm minmax(0, 1fr) auto; column-gap: 2mm; align-items: baseline;
    break-inside: avoid; page-break-inside: avoid; margin-bottom: 2pt; }
  .fp-sq { margin-left: 7mm; grid-template-columns: 6mm minmax(0, 1fr) auto; }
  .fp-num { font-weight: 700; }
  .fp-pts { font-family: 'DM Sans', system-ui, sans-serif; font-size: 8.5pt; color: #6b6862; white-space: nowrap; }
  .fp-sq-sol { margin-left: 15mm; }

  .fp-sol { margin: 3pt 0 6pt 9mm; padding: 4pt 8pt; border-left: 2pt solid #1a7a4a; background: #f3f8f5;
    break-inside: avoid; font-size: 10pt; }
  .fp-sq-sol .fp-sol { margin-left: 0; }
  .fp-sol-label { display: block; font-family: 'DM Sans', system-ui, sans-serif; font-size: 7.5pt; font-weight: 700;
    letter-spacing: .08em; text-transform: uppercase; color: #15633c; margin-bottom: 1pt; }

  .fp-key { break-before: page; page-break-before: always; }
  .fp-key-title { text-align: center; font-size: 15pt; font-weight: 700; padding-bottom: 6pt; margin: 0 0 8pt;
    border-bottom: 1.2pt solid #1a1a1a; }
  .fp-key-ex { margin-bottom: 10pt; }
  .fp-key-ex-title { font-family: 'DM Sans', system-ui, sans-serif; font-size: 10pt; font-weight: 700; color: #1a7a4a;
    margin: 8pt 0 4pt; break-after: avoid; }
  .fp-key-ex-title span { color: #33302b; font-weight: 500; }
  .fp-key .fp-q { grid-template-columns: 10mm minmax(0, 1fr) 0; }

  .fp-empty { color: #6b6862; font-style: italic; margin: 12pt 0; }

  /* Contenu riche (HTML des exercices) */
  .fp-rich p { margin: 0 0 3pt; }
  .fp-rich p:last-child { margin-bottom: 0; }
  .fp-rich ul { list-style: disc; padding-left: 16pt; margin: 2pt 0 4pt; }
  .fp-rich ol { list-style: decimal; padding-left: 16pt; margin: 2pt 0 4pt; }
  .fp-rich h1, .fp-rich h2 { font-size: 11.5pt; font-weight: 700; margin: 4pt 0; }
  .fp-rich img { display: block; max-width: 100%; max-height: 85mm; margin: 6pt auto; }
  .fp-rich .math-display { display: block; text-align: center; margin: 5pt 0; overflow-x: auto; overflow-y: hidden; }
  .fp-rich .math-inline { display: inline; }
  .fp-rich .katex { font-size: 1.08em; }
  .fp-rich .math-error { color: #b42318; font-family: monospace; font-size: .9em; }
  .fp-rich [data-callout-type] { border-left: 2pt solid #9a958c; padding: 3pt 8pt; margin: 5pt 0; background: #faf9f7; }
  .fp-rich table { border-collapse: collapse; margin: 4pt auto; }
  .fp-rich td, .fp-rich th { border: 0.6pt solid #9a958c; padding: 2pt 6pt; }

  @page {
    size: A4;
    margin: 15mm 16mm 17mm;
    /* Marges déclarées : Chrome n'y ajoute plus sa date, son titre ni l'adresse de la page. */
    @top-left { content: ""; }
    @top-right { content: ""; }
    @bottom-left { content: ${cssString(title ? `Fidni · ${title}` : 'Fidni')}; font-family: 'DM Sans', sans-serif;
      font-size: 8pt; color: #9a958c; }
    @bottom-right { content: counter(page) " / " counter(pages); font-family: 'DM Sans', sans-serif;
      font-size: 8pt; color: #9a958c; }
  }
  @media print {
    /* Tout ce qui entoure la feuille (fond du site, conteneurs) devient blanc. */
    html, body, #root, #root div:not(.fp-sheet):not(.fp-sheet *) { background: #fff !important; min-height: 0 !important; }
    .fp-toolbar, .fp-panel { display: none !important; }
    .fp-desk { background: none; padding: 0; min-height: 0; }
    .fp-sheet { width: auto; min-height: 0; padding: 0; margin: 0; box-shadow: none; }
    .fp-rich .math-display { overflow: visible; }
  }
`;

export default PaperExport;
