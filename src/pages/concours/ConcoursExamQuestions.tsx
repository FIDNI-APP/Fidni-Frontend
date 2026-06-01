/**
 * Dedicated page for editing the QCM questions of a concours exam.
 *
 * Lives at /concours/admin/exams/:id/questions
 * Uses CompactTipTapEditor *directly* with no modal/portal wrapper, so the
 * editor focus behaves like in the regular exercise editor.
 */
import { useCallback, useEffect, useRef, useState, memo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Plus, ChevronUp, ChevronDown, Trash2, X,
  Loader2, Save as SaveIcon, Upload, Copy, Check as CheckIcon,
} from 'lucide-react';
import {
  getConcoursExam, getConcoursStructure, setConcoursStructure,
  type ConcoursExam, type ConcoursStructure, type ConcoursQuestion,
} from '@/lib/api/concoursApi';
import { useAuth } from '@/contexts/AuthContext';
import { SEO } from '@/components/layout/SEO';
import CompactTipTapEditor from '@/components/editor/CompactTipTapEditor';
import { TaxonomyPicker, type TaxonomySelection } from './TaxonomyPicker';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1.5px solid #e4e2f5',
  borderRadius: 10,
  fontSize: 13,
  fontFamily: 'DM Sans',
  color: '#1e1b4b',
  background: '#f9f8ff',
  outline: 'none',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
      <span style={{ fontSize: 11, color: '#7068a8', fontWeight: 600 }}>{label}</span>
      {children}
    </label>
  );
}

/**
 * Memoised wrapper around CompactTipTapEditor.
 *
 * The parent component re-renders on every keystroke because we update
 * `structure` in state. Without memoisation, the editor would receive a new
 * `onChange` function on every render, which (combined with TipTap v3's
 * sensitivity to option-identity changes) caused the keystroke focus loss.
 *
 * Two stabilisers:
 *   1) `useCallback` based on a *ref* of the latest setter — the onChange
 *      identity stays stable while still reading the freshest setter.
 *   2) `React.memo` — re-renders only when `content` or `placeholder` change.
 *
 * The `key` prop on the editor still forces a fresh editor instance when the
 * caller switches to a different question (otherwise tiptap would keep
 * editing the wrong question's HTML).
 */
interface EditorFieldProps {
  editorKey: string;
  content: string;
  placeholder?: string;
  minHeight?: string;
  onChange: (html: string) => void;
}
const EditorField = memo(function EditorField({
  editorKey, content, placeholder, minHeight, onChange,
}: EditorFieldProps) {
  // Latest onChange in a ref so the callback we pass to TipTap never changes.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const stableOnChange = useCallback((html: string) => {
    onChangeRef.current(html);
  }, []);

  return (
    <CompactTipTapEditor
      key={editorKey}
      content={content}
      onChange={stableOnChange}
      placeholder={placeholder}
      minHeight={minHeight}
    />
  );
}, (prev, next) =>
  prev.editorKey === next.editorKey &&
  prev.content === next.content &&
  prev.placeholder === next.placeholder &&
  prev.minHeight === next.minHeight,
);

/**
 * Memoised options editor — re-renders only when the active question or its
 * options actually change, not on every parent state change (taxonomy fetches,
 * etc.). Each option's editor is wrapped in EditorField, which is itself
 * memoised, so per-option editors stay stable while you type.
 */
interface OptionsEditorProps {
  activeIdx: number;
  options: { key: string; text: string }[];
  setOptionText: (oi: number, html: string) => void;
  updateQuestion: (idx: number, patch: Partial<ConcoursQuestion>) => void;
}
const OptionsEditor = memo(function OptionsEditor({
  activeIdx, options, setOptionText, updateQuestion,
}: OptionsEditorProps) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#7068a8', fontWeight: 600, marginBottom: 4 }}>Options</div>
      {options.map((opt, oi) => (
        <div key={`${activeIdx}-${oi}`} className="flex items-start gap-2 mb-3">
          <input
            value={opt.key}
            maxLength={3}
            onChange={(e) => {
              const newOpts = options.map((o, i) =>
                i === oi ? { ...o, key: e.target.value.toUpperCase() } : o,
              );
              updateQuestion(activeIdx, { options: newOpts });
            }}
            style={{ ...inputStyle, width: 50, textAlign: 'center', fontFamily: 'DM Mono', fontWeight: 700, marginTop: 4 }}
          />
          <div className="flex-1 min-w-0">
            <EditorField
              editorKey={`option-${activeIdx}-${oi}`}
              content={opt.text}
              onChange={(html) => setOptionText(oi, html)}
              placeholder={`Option ${opt.key}…`}
              minHeight="48px"
            />
          </div>
          <button
            onClick={() => {
              const newOpts = options.filter((_, i) => i !== oi);
              updateQuestion(activeIdx, { options: newOpts });
            }}
            className="fd-btn-ghost"
            style={{ padding: 6, color: '#b91c1c', marginTop: 4 }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}, (prev, next) =>
  prev.activeIdx === next.activeIdx &&
  prev.options === next.options &&
  prev.setOptionText === next.setOptionText &&
  prev.updateQuestion === next.updateQuestion,
);

export default function ConcoursExamQuestionsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [exam, setExam] = useState<ConcoursExam | null>(null);
  const [structure, setStructure] = useState<ConcoursStructure>({ version: '1.0', questions: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [err, setErr] = useState('');
  const [savedFlash, setSavedFlash] = useState(false);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        const [e, s] = await Promise.all([
          getConcoursExam(id),
          getConcoursStructure(id),
        ]);
        setExam(e);
        setStructure(s && s.questions ? s : { version: '1.0', questions: [] });
      } catch (ex) {
        console.error(ex);
        setErr('Impossible de charger l\'examen.');
      } finally { setLoading(false); }
    })();
  }, [id]);

  // ──────────────────────────────────────────────────────────────────────
  // ALL HOOKS GO BEFORE ANY EARLY RETURN — Rules of Hooks.
  // ──────────────────────────────────────────────────────────────────────

  // Stable updater — closure-only over setStructure (which is itself stable).
  const updateQuestion = useCallback((idx: number, patch: Partial<ConcoursQuestion>) => {
    setStructure(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => i === idx ? { ...q, ...patch } : q),
    }));
  }, []);

  // Stable per-field setters bound to the active question.
  // They're memoised on `activeIdx` so re-renders for OTHER reasons (state
  // updates from TaxonomyPicker fetches, etc.) don't change their identity.
  const setStatement = useCallback((html: string) => {
    updateQuestion(activeIdx, { statement: html });
  }, [activeIdx, updateQuestion]);

  const setExplanation = useCallback((html: string) => {
    updateQuestion(activeIdx, { explanation: html });
  }, [activeIdx, updateQuestion]);

  const setOptionText = useCallback((oi: number, html: string) => {
    setStructure(prev => {
      const q = prev.questions[activeIdx];
      if (!q) return prev;
      const newOpts = q.options.map((o, i) => i === oi ? { ...o, text: html } : o);
      return {
        ...prev,
        questions: prev.questions.map((qq, i) =>
          i === activeIdx ? { ...qq, options: newOpts } : qq,
        ),
      };
    });
  }, [activeIdx]);

  // ──────────────────────────────────────────────────────────────────────
  // After this line, early returns are safe — no more hooks below.
  // ──────────────────────────────────────────────────────────────────────

  if (!user?.is_superuser) {
    return (
      <div style={{ minHeight: '100vh', background: '#f0effe' }} className="flex items-center justify-center">
        <div className="fd-card p-8 text-center max-w-md">
          <p style={{ color: '#7068a8' }}>Accès réservé aux administrateurs.</p>
          <Link to="/concours" className="fd-btn-primary mt-4 inline-flex">Retour</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f0effe' }} className="flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: '#4f46e5' }} />
      </div>
    );
  }

  if (!exam) {
    return (
      <div style={{ minHeight: '100vh', background: '#f0effe' }} className="flex items-center justify-center">
        <div className="fd-card p-8 text-center max-w-md">
          <p style={{ color: '#7068a8' }}>{err || 'Examen introuvable.'}</p>
          <Link to="/concours/admin" className="fd-btn-primary mt-4 inline-flex">Retour</Link>
        </div>
      </div>
    );
  }

  const addQuestion = () => {
    setStructure(prev => ({
      ...prev,
      questions: [...prev.questions, {
        id: `q${prev.questions.length + 1}`,
        statement: '',
        options: [
          { key: 'A', text: '' },
          { key: 'B', text: '' },
          { key: 'C', text: '' },
          { key: 'D', text: '' },
        ],
        correct_key: 'A',
        explanation: '',
        points: 1,
      }],
    }));
    setActiveIdx(structure.questions.length);
  };

  const removeQuestion = (idx: number) => {
    if (!window.confirm('Supprimer cette question ?')) return;
    setStructure(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== idx),
    }));
    setActiveIdx(Math.max(0, activeIdx - 1));
  };

  const moveQuestion = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= structure.questions.length) return;
    setStructure(prev => {
      const next = [...prev.questions];
      [next[idx], next[target]] = [next[target], next[idx]];
      return { ...prev, questions: next };
    });
    setActiveIdx(target);
  };

  const save = async () => {
    if (!id) return;
    try {
      setSaving(true); setErr('');
      await setConcoursStructure(id, structure);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1800);
    } catch (e: any) {
      setErr(e?.response?.data?.detail || 'Erreur lors de l\'enregistrement.');
    } finally { setSaving(false); }
  };

  const active = structure.questions[activeIdx];
  const taxonomy: TaxonomySelection = active ? {
    subjectId:  active.subject_id ?? null,
    subfieldId: active.subfield_id ?? null,
    chapterId:  active.chapter_id ?? null,
    tipId:      active.tip_id ?? null,
  } : { subjectId: null, subfieldId: null, chapterId: null, tipId: null };

  return (
    <div style={{ minHeight: '100vh', background: '#f0effe' }}>
      <SEO title={`Questions — ${exam.title} - Fidni`} description="Édition des questions" />

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <button onClick={() => navigate('/concours/admin')} className="fd-btn-ghost mb-3"
                style={{ padding: '5px 10px', fontSize: 12 }}>
          <ArrowLeft className="w-3 h-3" /> Admin concours
        </button>

        {/* Header */}
        <div className="fd-card p-5 mb-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <span style={{
              background: '#eef2ff', color: '#4338ca',
              padding: '3px 10px', borderRadius: 99,
              fontSize: 10, fontWeight: 700, letterSpacing: '.04em',
            }}>
              {exam.concours_type_display.toUpperCase()} · {exam.year}
            </span>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e1b4b', letterSpacing: '-0.02em', marginTop: 8 }}>
              {exam.title}
            </h1>
            <p style={{ fontSize: 12, color: '#7068a8', marginTop: 4 }}>
              {structure.questions.length} question{structure.questions.length > 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {savedFlash && (
              <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>✓ Enregistré</span>
            )}
            <button className="fd-btn-ghost" onClick={() => setShowImport(true)}>
              <Upload className="w-4 h-4" /> Importer JSON
            </button>
            <button className="fd-btn-primary" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <SaveIcon className="w-4 h-4" />}
              Enregistrer
            </button>
          </div>
        </div>

        {showImport && (
          <ImportJsonModal
            onClose={() => setShowImport(false)}
            currentCount={structure.questions.length}
            onApply={(parsed, mode) => {
              setStructure(prev => ({
                ...prev,
                questions: mode === 'replace'
                  ? parsed.questions
                  : [...prev.questions, ...parsed.questions],
              }));
              setShowImport(false);
              setActiveIdx(0);
            }}
          />
        )}

        <div className="grid gap-4" style={{ gridTemplateColumns: '200px 1fr' }}>
          {/* Sidebar */}
          <div className="fd-card p-3 flex flex-col gap-1" style={{ height: 'fit-content', position: 'sticky', top: 20 }}>
            {structure.questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIdx(i)}
                style={{
                  padding: '8px 12px', borderRadius: 8,
                  background: i === activeIdx ? '#eef2ff' : '#f9f8ff',
                  border: `1px solid ${i === activeIdx ? '#a5b4fc' : '#ede9fe'}`,
                  color: i === activeIdx ? '#4338ca' : '#4b4880',
                  fontSize: 13, fontWeight: i === activeIdx ? 700 : 500,
                  textAlign: 'left', cursor: 'pointer',
                }}
              >
                Question {i + 1}
              </button>
            ))}
            <button onClick={addQuestion} className="fd-btn-ghost" style={{ marginTop: 6, justifyContent: 'center' }}>
              <Plus className="w-3.5 h-3.5" /> Ajouter
            </button>
          </div>

          {/* Editor */}
          <div className="fd-card p-5">
            {!active ? (
              <p style={{ color: '#9391b8', fontSize: 13, padding: 24, textAlign: 'center' }}>
                Aucune question. Clique sur "Ajouter" pour créer la première.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 12, color: '#9391b8', fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase' }}>
                    Question {activeIdx + 1} / {structure.questions.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => moveQuestion(activeIdx, -1)} className="fd-btn-ghost" style={{ padding: 5 }} disabled={activeIdx === 0}>
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => moveQuestion(activeIdx, 1)} className="fd-btn-ghost" style={{ padding: 5 }} disabled={activeIdx === structure.questions.length - 1}>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => removeQuestion(activeIdx)} className="fd-btn-ghost" style={{ padding: 5, color: '#b91c1c' }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <Field label="Énoncé">
                  <EditorField
                    editorKey={`statement-${activeIdx}`}
                    content={active.statement}
                    onChange={setStatement}
                    placeholder="Énoncé de la question…"
                    minHeight="120px"
                  />
                </Field>

                <OptionsEditor
                  activeIdx={activeIdx}
                  options={active.options}
                  setOptionText={setOptionText}
                  updateQuestion={updateQuestion}
                />

                {active.options.length > 0 && (
                  <button
                    onClick={() => updateQuestion(activeIdx, {
                      options: [...active.options, { key: String.fromCharCode(65 + active.options.length), text: '' }],
                    })}
                    className="fd-btn-ghost"
                    style={{ fontSize: 11, alignSelf: 'flex-start' }}
                  >
                    <Plus className="w-3 h-3" /> Ajouter une option
                  </button>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Bonne réponse">
                    <select
                      value={active.correct_key || ''}
                      onChange={(e) => updateQuestion(activeIdx, { correct_key: e.target.value })}
                      style={inputStyle}
                    >
                      {active.options.map(o => <option key={o.key} value={o.key}>{o.key}</option>)}
                    </select>
                  </Field>
                  <Field label="Points">
                    <input
                      type="number"
                      value={active.points ?? 1}
                      onChange={(e) => updateQuestion(activeIdx, { points: Number(e.target.value) })}
                      style={inputStyle}
                    />
                  </Field>
                </div>

                <Field label="Explication">
                  <EditorField
                    editorKey={`explanation-${activeIdx}`}
                    content={active.explanation || ''}
                    onChange={setExplanation}
                    placeholder="Pourquoi cette réponse est correcte…"
                    minHeight="100px"
                  />
                </Field>

                {/* Cascading taxonomy: Subject → Subfield → Chapter → Tip */}
                <TaxonomyPicker
                  value={taxonomy}
                  onChange={(v) => updateQuestion(activeIdx, {
                    subject_id:  v.subjectId,
                    subfield_id: v.subfieldId,
                    chapter_id:  v.chapterId,
                    tip_id:      v.tipId,
                  })}
                  concoursType={exam.concours_type}
                />

                {err && <p style={{ fontSize: 12, color: '#b91c1c', marginTop: 8 }}>{err}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Import-from-JSON modal + LLM prompt template
 * ─────────────────────────────────────────────────────────────────── */

/**
 * Prompt the user can paste into ChatGPT / Claude / etc. to get a JSON
 * payload they can paste back into the importer.
 */
const LLM_PROMPT_TEMPLATE = `Tu es un expert en concours marocains (ENSA, ENSAM, Médecine).

Je veux que tu produises un fichier JSON contenant des questions de QCM \
prêtes à être importées dans une plateforme. Tu dois respecter EXACTEMENT \
le schéma ci-dessous, sans rien y ajouter, et répondre UNIQUEMENT par \
le JSON (sans texte avant/après, sans bloc markdown).

Schéma attendu :

{
  "version": "1.0",
  "questions": [
    {
      "id": "q1",
      "statement": "<HTML court — peut contenir du LaTeX entre $...$ ou $$...$$ pour les formules>",
      "options": [
        { "key": "A", "text": "<HTML>" },
        { "key": "B", "text": "<HTML>" },
        { "key": "C", "text": "<HTML>" },
        { "key": "D", "text": "<HTML>" }
      ],
      "correct_key": "B",
      "explanation": "<HTML — explication détaillée pourquoi cette réponse est correcte. Pas seulement 'B est la réponse'.>",
      "points": 1
    }
  ]
}

RÈGLES STRICTES :
1. La racine doit être un objet avec exactement deux clés : "version" et "questions".
2. "version" doit être la chaîne "1.0".
3. "questions" doit être un tableau non vide.
4. Pour chaque question :
   - "id" : chaîne unique dans le tableau (ex. "q1", "q2", ...).
   - "statement" : HTML court (utilise <p>, <strong>, <em>, etc.). Les formules \
     mathématiques DOIVENT être écrites en LaTeX entre $...$ (inline) ou \
     $$...$$ (display).
   - "options" : tableau de 2 à 6 éléments. Chaque élément est un objet \
     {"key": <lettre majuscule unique>, "text": <HTML>}. Les clés sont en général \
     "A", "B", "C", "D" mais peuvent être autres si pertinent.
   - "correct_key" : une des clés présentes dans "options".
   - "explanation" : doit VRAIMENT expliquer la démarche/justification, pas \
     seulement répéter la bonne réponse. Inclure les calculs ou théorèmes utilisés.
   - "points" : entier positif (1 par défaut).
5. N'ajoute AUCUN champ qui n'est pas dans le schéma.

⚠️ ÉCHAPPEMENT LATEX — TRÈS IMPORTANT ⚠️
   Les commandes LaTeX commencent par un backslash (\\\\). En JSON, le backslash \
   doit OBLIGATOIREMENT être doublé. Donc TOUTE commande LaTeX doit s'écrire \
   avec DEUX backslashes dans la chaîne JSON.

   ✅ CORRECT (ce que tu dois écrire) :
       "statement": "Calculer $I = \\\\int_0^1 x^2\\\\,dx$"
       "text": "$\\\\frac{1}{2}$"
       "explanation": "$\\\\sin(\\\\pi) = 0$, donc $\\\\lim_{x\\\\to\\\\infty}$"

   ❌ INCORRECT (ne fais JAMAIS ça — JSON.parse échoue) :
       "statement": "Calculer $I = \\int_0^1 x^2\\,dx$"
       "text": "$\\frac{1}{2}$"

   Règle pratique : chaque "\\" que tu écrirais en LaTeX → écris-le "\\\\" dans le JSON.

6. Tous les guillemets " à l'intérieur des chaînes doivent être échappés en \\\\".
7. Pas d'apostrophes typographiques (' ' " "). Utilise les caractères ASCII \
   simples ( ' et " ) ou des entités HTML.
8. Vérifie ton JSON avant de répondre : il doit être parsable par JSON.parse \
   tel quel, sans modification.
9. Réponds uniquement par le JSON valide.

Maintenant, génère un JSON contenant N questions sur le sujet suivant :
[REMPLACE PAR TON SUJET — ex. "10 questions de calcul intégral niveau ENSA 2023"]`;

interface ImportJsonModalProps {
  onClose: () => void;
  currentCount: number;
  onApply: (parsed: ConcoursStructure, mode: 'replace' | 'append') => void;
}

function ImportJsonModal({ onClose, currentCount, onApply }: ImportJsonModalProps) {
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [parsed, setParsed] = useState<ConcoursStructure | null>(null);
  const [mode, setMode] = useState<'replace' | 'append'>('append');
  const [promptCopied, setPromptCopied] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  /**
   * Repair common LLM mistakes before JSON.parse:
   *  - Lone `\` not followed by a valid JSON escape char (most common: LaTeX
   *    commands like `\int`, `\frac`, `\sin` etc. that the model forgot to
   *    double-escape) → replace with `\\`.
   *  - Curly quotes (’ ‘ “ ”) inside string content → replace with ASCII.
   *  - Strip leading/trailing markdown code fences (```json ... ```).
   */
  const repairJson = (raw: string): { repaired: string; fixed: boolean } => {
    let s = raw.trim();
    // Strip markdown fences
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

    // Replace curly quotes with straight quotes (only inside strings is hard
    // to detect cheaply, so we apply globally — JSON keys/structure don't use
    // curly quotes anyway).
    s = s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');

    // Fix lone backslashes that are NOT a valid JSON escape.
    // Valid JSON escapes after `\`: `"`, `\\`, `/`, `b`, `f`, `n`, `r`, `t`, `u`.
    // Anything else (including `\i`, `\f`... wait `\f` is valid; check `\i`,
    // `\s`, `\c`, `\p`, `\m`, `\l`, `\a`, etc.) → double the backslash.
    let fixed = false;
    s = s.replace(/\\(?!["\\/bfnrtu])/g, () => {
      fixed = true;
      return '\\\\';
    });

    return { repaired: s, fixed };
  };

  const validate = (raw: string) => {
    setErr(''); setWarnings([]); setParsed(null);
    if (!raw.trim()) return;

    let data: any;
    let usedRepair = false;

    try {
      data = JSON.parse(raw);
    } catch (firstErr: any) {
      // Try auto-repair
      const { repaired, fixed } = repairJson(raw);
      if (fixed || repaired !== raw.trim()) {
        try {
          data = JSON.parse(repaired);
          usedRepair = true;
        } catch (secondErr: any) {
          setErr(`JSON invalide : ${firstErr?.message || 'erreur de parsing'}. Auto-réparation tentée mais ${secondErr?.message || 'toujours invalide'}.`);
          return;
        }
      } else {
        setErr(`JSON invalide : ${firstErr?.message || 'erreur de parsing'}`);
        return;
      }
    }

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      setErr('La racine doit être un objet { "version": "1.0", "questions": [...] }.');
      return;
    }

    const w: string[] = [];
    if (usedRepair) {
      w.push('Auto-réparation appliquée : les backslashes LaTeX non échappés ont été doublés. Vérifie le rendu après import.');
    }
    if (!data.version) w.push('Champ "version" absent — "1.0" sera utilisé.');
    if (!Array.isArray(data.questions)) {
      setErr('Le champ "questions" doit être un tableau.');
      return;
    }
    if (data.questions.length === 0) {
      setErr('Le tableau "questions" est vide.');
      return;
    }

    const cleanQuestions: ConcoursQuestion[] = [];
    for (let i = 0; i < data.questions.length; i++) {
      const q = data.questions[i];
      const path = `questions[${i}]`;
      if (!q || typeof q !== 'object') {
        setErr(`${path} doit être un objet.`); return;
      }
      const id = typeof q.id === 'string' && q.id ? q.id : `q${i + 1}`;
      const statement = typeof q.statement === 'string' ? q.statement : '';
      if (!statement) w.push(`${path} : "statement" vide.`);

      if (!Array.isArray(q.options) || q.options.length < 2) {
        setErr(`${path}.options doit être un tableau d'au moins 2 éléments.`);
        return;
      }
      const options: { key: string; text: string }[] = [];
      const seenKeys = new Set<string>();
      for (let j = 0; j < q.options.length; j++) {
        const o = q.options[j];
        if (!o || typeof o !== 'object') {
          setErr(`${path}.options[${j}] doit être un objet.`); return;
        }
        const key = typeof o.key === 'string' ? o.key.trim() : '';
        if (!key) { setErr(`${path}.options[${j}].key est vide.`); return; }
        if (seenKeys.has(key)) {
          setErr(`${path} : la clé "${key}" est dupliquée.`); return;
        }
        seenKeys.add(key);
        const tx = typeof o.text === 'string' ? o.text : '';
        if (!tx) w.push(`${path}.options[${j}] (key=${key}) : "text" vide.`);
        options.push({ key, text: tx });
      }

      const correctKey = typeof q.correct_key === 'string' ? q.correct_key : '';
      if (!correctKey || !seenKeys.has(correctKey)) {
        setErr(`${path}.correct_key "${correctKey}" doit correspondre à l'une des clés des options.`);
        return;
      }

      const explanation = typeof q.explanation === 'string' ? q.explanation : '';
      if (!explanation) w.push(`${path} : "explanation" vide — l'élève n'aura pas de justification.`);

      const points = typeof q.points === 'number' && q.points > 0 ? q.points : 1;

      cleanQuestions.push({
        id, statement, options,
        correct_key: correctKey,
        explanation,
        points,
        // Keep optional metadata if present.
        subject_id:  typeof q.subject_id  === 'number' ? q.subject_id  : null,
        subfield_id: typeof q.subfield_id === 'number' ? q.subfield_id : null,
        chapter_id:  typeof q.chapter_id  === 'number' ? q.chapter_id  : null,
        tip_id:      typeof q.tip_id      === 'number' ? q.tip_id      : null,
      });
    }

    setWarnings(w);
    setParsed({ version: data.version || '1.0', questions: cleanQuestions });
  };

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(LLM_PROMPT_TEMPLATE);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 1800);
    } catch (e) { console.error(e); }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(30,27,75,.45)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="fd-card"
        style={{
          width: '100%', maxWidth: 760, maxHeight: '92vh', overflowY: 'auto',
          padding: 22,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1e1b4b' }}>
            Importer un JSON
          </h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#7068a8' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <p style={{ fontSize: 13, color: '#7068a8', marginBottom: 12, lineHeight: 1.6 }}>
          Colle un JSON respectant le schéma ci-dessous. Tu peux aussi
          <button
            type="button"
            onClick={() => setShowPrompt(s => !s)}
            style={{
              background: 'none', border: 'none', color: '#4338ca',
              cursor: 'pointer', textDecoration: 'underline',
              padding: 0, margin: '0 4px', fontSize: 13, fontWeight: 600,
            }}
          >
            {showPrompt ? 'masquer le prompt LLM' : 'afficher le prompt LLM'}
          </button>
          à donner à ChatGPT/Claude pour générer ce JSON automatiquement.
        </p>

        {showPrompt && (
          <div
            style={{
              background: '#f9f8ff', border: '1.5px solid #ede9fe',
              borderRadius: 10, padding: 12, marginBottom: 12,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span style={{ fontSize: 11, color: '#7068a8', fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase' }}>
                Prompt à coller dans le LLM
              </span>
              <button
                type="button"
                onClick={copyPrompt}
                className="fd-btn-ghost"
                style={{ padding: '4px 10px', fontSize: 11 }}
              >
                {promptCopied ? <CheckIcon className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {promptCopied ? 'Copié' : 'Copier'}
              </button>
            </div>
            <textarea
              readOnly
              value={LLM_PROMPT_TEMPLATE}
              style={{
                width: '100%', minHeight: 220,
                padding: '10px 12px', borderRadius: 8,
                border: '1px solid #e4e2f5', background: '#fff',
                fontFamily: 'DM Mono', fontSize: 11, color: '#4b4880',
                outline: 'none', resize: 'vertical', whiteSpace: 'pre-wrap',
              }}
            />
          </div>
        )}

        <textarea
          value={text}
          onChange={(e) => { setText(e.target.value); validate(e.target.value); }}
          placeholder='{"version": "1.0", "questions": [...]}'
          style={{
            width: '100%', minHeight: 240,
            padding: '12px 14px', borderRadius: 10,
            border: '1.5px solid #e4e2f5', background: '#f9f8ff',
            fontFamily: 'DM Mono', fontSize: 12, color: '#1e1b4b',
            outline: 'none', resize: 'vertical',
          }}
        />

        {err && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca',
            color: '#b91c1c', padding: '10px 12px', borderRadius: 10,
            fontSize: 12, marginTop: 10,
          }}>
            ✗ {err}
          </div>
        )}

        {warnings.length > 0 && (
          <div style={{
            background: '#fffbeb', border: '1px solid #fde68a',
            color: '#a16207', padding: '10px 12px', borderRadius: 10,
            fontSize: 12, marginTop: 10,
          }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Avertissements :</div>
            <ul style={{ paddingLeft: 18, lineHeight: 1.6 }}>
              {warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}

        {parsed && !err && (
          <div style={{
            background: '#ecfdf5', border: '1px solid #bbf7d0',
            color: '#15803d', padding: '10px 12px', borderRadius: 10,
            fontSize: 12, marginTop: 10,
          }}>
            ✓ JSON valide — <strong>{parsed.questions.length}</strong> question{parsed.questions.length > 1 ? 's' : ''} prête{parsed.questions.length > 1 ? 's' : ''} à importer.
          </div>
        )}

        {parsed && (
          <div style={{ marginTop: 14 }}>
            <span style={{ fontSize: 11, color: '#7068a8', fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', marginRight: 10 }}>
              Mode :
            </span>
            <div className="inline-flex" style={{
              background: '#f5f4ff', border: '1px solid #ede9fe',
              borderRadius: 99, padding: 3,
            }}>
              <button
                type="button"
                onClick={() => setMode('append')}
                style={{
                  padding: '5px 12px', borderRadius: 99, border: 'none', cursor: 'pointer',
                  background: mode === 'append' ? '#4f46e5' : 'transparent',
                  color: mode === 'append' ? '#fff' : '#7068a8',
                  fontSize: 11, fontWeight: 600,
                }}
              >
                Ajouter ({currentCount} → {currentCount + parsed.questions.length})
              </button>
              <button
                type="button"
                onClick={() => setMode('replace')}
                style={{
                  padding: '5px 12px', borderRadius: 99, border: 'none', cursor: 'pointer',
                  background: mode === 'replace' ? '#dc2626' : 'transparent',
                  color: mode === 'replace' ? '#fff' : '#7068a8',
                  fontSize: 11, fontWeight: 600,
                }}
              >
                Remplacer ({currentCount} → {parsed.questions.length})
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <button className="fd-btn-ghost" onClick={onClose}>Annuler</button>
          <button
            className="fd-btn-primary"
            onClick={() => parsed && onApply(parsed, mode)}
            disabled={!parsed || !!err}
          >
            <Upload className="w-4 h-4" />
            Importer
          </button>
        </div>

        <p style={{ fontSize: 11, color: '#9391b8', marginTop: 10, fontStyle: 'italic' }}>
          Note : l'import met à jour l'éditeur localement. N'oublie pas de cliquer sur <strong>Enregistrer</strong> pour sauvegarder côté serveur.
        </p>
      </div>
    </div>
  );
}
