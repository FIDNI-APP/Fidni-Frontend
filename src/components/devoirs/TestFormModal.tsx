// Annoncer un DS (ou le modifier) : type, matière, date, chapitres au programme (08/10/2026).
// Le niveau vient du profil ; sans niveau, l'élève le choisit d'abord.
import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, ArrowRight, Check, Loader2, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTaxonomy } from '@/components/revision/RevisionLabelPicker';
import { devoirsApi, KIND_LABEL, type TestKind, type UpcomingTest } from '@/lib/api/devoirsApi';

const KINDS: TestKind[] = ['ds', 'controle', 'blanc'];

const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const inDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return isoDay(d); };
const QUICK_DATES = [{ label: 'Demain', days: 1 }, { label: 'Dans 3 jours', days: 3 }, { label: 'Dans une semaine', days: 7 }];

const chip = (on: boolean) =>
  `inline-flex max-w-full items-center gap-1 rounded-full border px-3 py-1.5 text-[13px] transition-colors ${
    on ? 'border-brand bg-brand-soft font-semibold text-brand-hover' : 'border-line bg-white text-ink-soft hover:border-ink-faint hover:text-ink'}`;

function profileLevelId(user: unknown): number | null {
  const level = (user as { profile?: { class_level?: unknown } } | null)?.profile?.class_level;
  if (level && typeof level === 'object' && 'id' in (level as object)) return Number((level as { id: unknown }).id) || null;
  return level != null && !Number.isNaN(Number(level)) ? Number(level) : null;
}

export const TestFormModal: React.FC<{
  open: boolean;
  /** Modifier ce DS (sinon : nouveau). */
  test?: UpcomingTest | null;
  onClose: () => void;
  onSaved: (test: UpcomingTest) => void;
  onDeleted?: (id: number) => void;
}> = ({ open, test, onClose, onSaved, onDeleted }) => {
  const { user } = useAuth();
  const levels = useTaxonomy();
  const editing = !!test;
  const [levelId, setLevelId] = useState<number | null>(null);
  const [kind, setKind] = useState<TestKind>('ds');
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [date, setDate] = useState('');
  const [chapterIds, setChapterIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // À l'ouverture : les valeurs du DS modifié, sinon un formulaire vierge au niveau du profil.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setKind(test?.kind ?? 'ds');
    setSubjectId(test?.subject?.id ?? null);
    setDate(test?.date ?? '');
    setChapterIds(test?.chapters.map((c) => c.id) ?? []);
    setLevelId(profileLevelId(user));
  }, [open, test, user]);

  const level = levels.find((l) => l.id === levelId) ?? null;
  const subjects = useMemo(() => (level?.subjects ?? []).filter((s) => s.chapters.length), [level]);
  // Une seule matière (ou celle du DS modifié) : choisie d'office.
  useEffect(() => {
    if (!open || subjectId || subjects.length !== 1) return;
    setSubjectId(subjects[0].id);
  }, [open, subjects, subjectId]);
  // DS modifié dont le niveau n'est pas celui du profil : retrouver le niveau par sa matière.
  useEffect(() => {
    if (!open || !test?.subject || level?.subjects.some((s) => s.id === test.subject?.id)) return;
    const found = levels.find((l) => l.subjects.some((s) => s.id === test.subject?.id && s.chapters.some((c) => test.chapters.some((x) => x.id === c.id))));
    if (found) setLevelId(found.id);
  }, [open, test, levels, level]);

  const subject = subjects.find((s) => s.id === subjectId) ?? null;
  const chapters = subject?.chapters ?? [];
  const toggle = (id: number) => setChapterIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const today = isoDay(new Date());
  const ready = !!date && chapterIds.length > 0;

  const close = () => { if (!saving) onClose(); };
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const save = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!ready || saving) return;
    setSaving(true);
    setError(null);
    try {
      const payload = { kind, subject_id: subjectId, class_level_id: levelId, chapter_ids: chapterIds, date };
      const saved = editing && test ? await devoirsApi.update(test.id, payload) : await devoirsApi.create(payload);
      onSaved(saved);
    } catch (err) {
      const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      const first = data && Object.values(data)[0];
      setError(Array.isArray(first) ? String(first[0]) : typeof first === 'string' ? first : 'Le DS n’a pas pu être enregistré. Réessaie.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!test || !window.confirm('Supprimer ce DS et sa préparation ? Tes exercices et résultats restent sur Fidni.')) return;
    setSaving(true);
    try {
      await devoirsApi.remove(test.id);
      onDeleted?.(test.id);
    } catch {
      setError('Le DS n’a pas pu être supprimé.');
    } finally {
      setSaving(false);
    }
  };

  const label = 'mb-2 block text-[12px] font-bold uppercase tracking-[.07em] text-ink-faint';

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-[rgba(20,18,16,.4)] p-3 backdrop-blur-[2px] [align-items:safe_center] sm:p-4" onClick={close}>
          <motion.form
            onSubmit={save}
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.16 }}
            className="w-full max-w-xl rounded-2xl border border-line bg-white p-5 shadow-[0_20px_50px_rgba(20,18,16,.22)] sm:p-6"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="test-form-title"
          >
            <h2 id="test-form-title" className="fd-display text-[22px] text-ink">{editing ? 'Modifier mon DS' : 'Mon prochain DS'}</h2>
            <p className="mt-1 text-[13.5px] text-ink-soft">
              {editing ? 'La préparation se recalcule avec tes changements.' : 'Dis-nous la date et les chapitres : Fidni te prépare une révision ciblée.'}
            </p>

            <div className="mt-5 flex flex-col gap-5">
              <div>
                <span className={label}>Type</span>
                <div role="group" aria-label="Type de devoir" className="inline-flex rounded-xl bg-[#f2f1ee] p-1">
                  {KINDS.map((k) => (
                    <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}
                      className={`rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${kind === k ? 'bg-white text-ink shadow-sm' : 'text-ink-faint hover:text-ink'}`}>
                      {KIND_LABEL[k]}
                    </button>
                  ))}
                </div>
              </div>

              {levels.length > 0 && !level && (
                <div>
                  <span className={label}>Ton niveau</span>
                  <div className="flex flex-wrap gap-1.5">
                    {levels.map((l) => (
                      <button key={l.id} type="button" className={chip(l.id === levelId)} aria-pressed={l.id === levelId}
                        onClick={() => { setLevelId(l.id); setSubjectId(null); setChapterIds([]); }}>
                        {l.id === levelId && <Check className="h-3.5 w-3.5" />}{l.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {level && subjects.length > 1 && (
                <div>
                  <span className={label}>Matière</span>
                  <div className="flex flex-wrap gap-1.5">
                    {subjects.map((s) => (
                      <button key={s.id} type="button" className={chip(s.id === subjectId)} aria-pressed={s.id === subjectId}
                        onClick={() => { setSubjectId(s.id); setChapterIds([]); }}>
                        {s.id === subjectId && <Check className="h-3.5 w-3.5" />}{s.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="test-date" className={label}>Date</label>
                <div className="flex flex-wrap items-center gap-2">
                  <input id="test-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required
                    className="h-10 rounded-xl border border-line bg-white px-3 text-[14px] text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25" />
                  {QUICK_DATES.map((q) => {
                    const value = inDays(q.days);
                    return (
                      <button key={q.days} type="button" className={chip(date === value)} aria-pressed={date === value} onClick={() => setDate(value)}>
                        {q.label}
                      </button>
                    );
                  })}
                </div>
                {date && date < today && (
                  <p className="mt-1.5 text-[12.5px] text-ink-faint">Ce DS est déjà passé : tu pourras y noter ta note.</p>
                )}
              </div>

              {subject && (
                <div>
                  <span className={label}>
                    Chapitres au programme
                    {chapterIds.length > 0 && <span className="ml-1.5 normal-case tracking-normal text-brand-hover">· {chapterIds.length} choisi{chapterIds.length > 1 ? 's' : ''}</span>}
                  </span>
                  <div className="flex max-h-[220px] flex-wrap gap-1.5 overflow-y-auto pr-1">
                    {chapters.map((c) => {
                      const on = chapterIds.includes(c.id);
                      return (
                        <button key={c.id} type="button" className={chip(on)} aria-pressed={on} onClick={() => toggle(c.id)}>
                          {on && <Check className="h-3.5 w-3.5 shrink-0" />}<span className="truncate">{c.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {level && !subject && subjects.length > 1 && (
                <p className="text-[13px] text-ink-faint">Choisis la matière pour voir ses chapitres.</p>
              )}
            </div>

            {error && (
              <p role="alert" className="mt-4 flex items-center gap-2 rounded-xl border border-[#f0d4cf] bg-[#fbf1ef] px-3 py-2.5 text-[13px] text-[#9c3b2e]">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              {editing && (
                <button type="button" onClick={remove} disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-semibold text-[#a23b34] hover:bg-[#fbecea]">
                  <Trash2 className="h-4 w-4" /> Supprimer
                </button>
              )}
              <div className="ml-auto flex items-center gap-2.5">
                <button type="button" className="fd-btn-ghost" onClick={close}>Annuler</button>
                <button type="submit" className="fd-btn-primary disabled:cursor-not-allowed disabled:opacity-50" disabled={!ready || saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                  {editing ? 'Enregistrer' : 'Préparer mon DS'}
                </button>
              </div>
            </div>
          </motion.form>
        </div>
      )}
    </AnimatePresence>
  );
};

export default TestFormModal;
