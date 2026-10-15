// Annoncer un DS (ou le modifier) : type, matière, date, chapitres au programme (08/10/2026).
// Le niveau vient du profil ; sans niveau, l'élève le choisit d'abord. Modifier : le niveau du DS (13/10/2026 : il
// était deviné par ses chapitres, et « Suites numériques », en 1ère comme en 2ème Bac, ouvrait la 1ère Bac).
import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, ArrowRight, Check, Loader2, RotateCcw, Trash2, X } from 'lucide-react';
import { t } from '@/i18n';
import { useAuth } from '@/contexts/AuthContext';
import { useTaxonomyState } from '@/components/revision/RevisionLabelPicker';
import { devoirsApi, type TestKind, type UpcomingTest } from '@/lib/api/devoirsApi';
import { kindLabel } from './ui';

const KINDS: TestKind[] = ['ds', 'controle', 'blanc'];

const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const inDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return isoDay(d); };
const QUICK_DATES = [{ label: 'Demain', days: 1 }, { label: 'Dans 3 jours', days: 3 }, { label: 'Dans une semaine', days: 7 }];

// Pastilles de choix : 40 px de haut au doigt, 36 px à la souris.
const chip = (on: boolean) =>
  `inline-flex min-h-10 max-w-full items-center gap-1 rounded-full border px-3.5 text-[13px] transition-colors sm:min-h-9 ${
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
  const { levels, failed: taxonomyFailed, retry: retryTaxonomy } = useTaxonomyState();
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
    setLevelId(test?.class_level?.id ?? profileLevelId(user));
  }, [open, test, user]);

  const level = levels.find((l) => l.id === levelId) ?? null;
  const subjects = useMemo(() => (level?.subjects ?? []).filter((s) => s.chapters.length), [level]);
  // Une seule matière (ou celle du DS modifié) : choisie d'office.
  useEffect(() => {
    if (!open || subjectId || subjects.length !== 1) return;
    setSubjectId(subjects[0].id);
  }, [open, subjects, subjectId]);
  // DS sans niveau enregistré : le niveau qui a TOUS ses chapitres, celui du profil d'abord (un chapitre seul ne
  // suffit pas : plusieurs existent dans deux niveaux).
  useEffect(() => {
    if (!open || !test || test.class_level || !levels.length) return;
    const hasAll = (l: (typeof levels)[number]) =>
      test.chapters.every((x) => l.subjects.some((s) => s.chapters.some((c) => c.id === x.id)));
    const own = levels.find((l) => l.id === profileLevelId(user));
    if (own && hasAll(own)) return;
    const found = levels.find(hasAll);
    if (found) setLevelId(found.id);
  }, [open, test, levels, user]);

  const subject = subjects.find((s) => s.id === subjectId) ?? null;
  const chapters = subject?.chapters ?? [];
  const toggle = (id: number) => setChapterIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const today = isoDay(new Date());
  const ready = !!date && chapterIds.length > 0;
  // Changer les chapitres d'un DS dont le DS blanc est commencé ou fait : le serveur en tire un nouveau (dit avant).
  const chaptersChanged = !!test && (chapterIds.length !== test.chapters.length || chapterIds.some((id) => !test.chapters.some((c) => c.id === id)));
  const mockState = test?.mock_done_at ? 'fait' : test?.mock_started_at ? 'commencé' : null;

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
      setError(Array.isArray(first) ? String(first[0]) : typeof first === 'string' ? first : t('Le DS n’a pas pu être enregistré. Réessaie.'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!test || !window.confirm(t('Supprimer ce DS et sa préparation ? Tes exercices et résultats restent sur Fidni.'))) return;
    setSaving(true);
    try {
      await devoirsApi.remove(test.id);
      onDeleted?.(test.id);
    } catch {
      setError(t('Le DS n’a pas pu être supprimé.'));
    } finally {
      setSaving(false);
    }
  };

  const label = 'mb-2 block text-sm font-medium text-ink-soft';

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
            className="relative w-full max-w-xl rounded-2xl border border-line bg-white p-5 shadow-[0_20px_50px_rgba(20,18,16,.22)] sm:p-6"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="test-form-title"
          >
            <button type="button" onClick={close} aria-label={t('Fermer')}
              className="absolute end-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-xl text-ink-faint transition-colors hover:bg-[#f2f1ee] hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
              <X className="h-5 w-5" />
            </button>
            <h2 id="test-form-title" className="fd-display pe-10 text-[22px] leading-tight text-ink">{editing ? t('Modifier mon DS') : t('Mon prochain DS')}</h2>
            <p className="mt-1 pe-6 text-[13.5px] text-ink-soft">
              {editing ? t('La préparation se recalcule avec tes changements.') : t('Dis-nous la date et les chapitres : Fidni te prépare une révision ciblée.')}
            </p>

            <div className="mt-5 flex flex-col gap-5">
              <div>
                <span className={label}>{t('Type')}</span>
                <div role="group" aria-label={t('Type de devoir')} className="inline-flex max-w-full gap-1 rounded-2xl border border-line bg-white p-1">
                  {KINDS.map((k) => (
                    <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}
                      className={`inline-flex min-h-10 items-center rounded-xl px-3.5 text-[13.5px] font-semibold transition-colors sm:min-h-9 ${
                        kind === k ? 'bg-ink text-white' : 'text-ink-faint hover:bg-[#f7f6f3] hover:text-ink'}`}>
                      {kindLabel(k)}
                    </button>
                  ))}
                </div>
              </div>

              {taxonomyFailed && !levels.length && (
                <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-[#f0d5d1] bg-[#fbecea] px-3 py-2.5">
                  <p className="flex-1 text-[13px] text-[#a23b34]">{t('Les chapitres n’ont pas pu se charger. Vérifie ta connexion.')}</p>
                  <button type="button" onClick={retryTaxonomy} className="fd-btn-ghost min-h-9"><RotateCcw className="h-4 w-4" /> {t('Réessayer')}</button>
                </div>
              )}

              {levels.length > 0 && !level && (
                <div>
                  <span className={label}>{t('Ton niveau')}</span>
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
                  <span className={label}>{t('Matière')}</span>
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
                <label htmlFor="test-date" className={label}>{t('Date')}</label>
                <div className="flex flex-wrap items-center gap-2">
                  <input id="test-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required
                    className="h-11 rounded-xl border border-line bg-white px-3 text-[14px] text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25 sm:h-10" />
                  {QUICK_DATES.map((q) => {
                    const value = inDays(q.days);
                    return (
                      <button key={q.days} type="button" className={chip(date === value)} aria-pressed={date === value} onClick={() => setDate(value)}>
                        {t(q.label)}
                      </button>
                    );
                  })}
                </div>
                {date && date < today && (
                  <p className="mt-1.5 text-[12.5px] text-ink-faint">{t('Ce DS est déjà passé : tu pourras y noter ta note.')}</p>
                )}
              </div>

              {subject && (
                <div>
                  <span className={label}>
                    {t('Chapitres au programme')}
                    {chapterIds.length > 0 && <span className="ms-1.5 font-semibold text-brand-hover">· {chapterIds.length > 1 ? t('{n} choisis', { n: chapterIds.length }) : t('{n} choisi', { n: chapterIds.length })}</span>}
                  </span>
                  {/* Téléphone : toute la liste (la fenêtre défile) ; une liste qui défilait dans la fenêtre cachait des choix. */}
                  <div className="-m-1 flex flex-wrap gap-1.5 p-1 sm:max-h-[232px] sm:overflow-y-auto">
                    {chapters.map((c) => {
                      const on = chapterIds.includes(c.id);
                      return (
                        <button key={c.id} type="button" className={chip(on)} aria-pressed={on} onClick={() => toggle(c.id)}>
                          {on && <Check className="h-3.5 w-3.5 shrink-0" />}<span className="truncate">{c.name}</span>
                        </button>
                      );
                    })}
                  </div>
                  {chaptersChanged && mockState && (
                    <p className="mt-2 text-[12.5px] text-gold-strong">{mockState === 'fait' ? t('Ton DS blanc fait sera remplacé par un nouveau sujet sur ces chapitres.') : t('Ton DS blanc commencé sera remplacé par un nouveau sujet sur ces chapitres.')}</p>
                  )}
                </div>
              )}
              {level && !subject && subjects.length > 1 && (
                <p className="text-[13px] text-ink-faint">{t('Choisis la matière pour voir ses chapitres.')}</p>
              )}
            </div>

            {error && (
              <p role="alert" className="mt-4 flex items-center gap-2 rounded-xl border border-[#f0d5d1] bg-[#fbecea] px-3 py-2.5 text-[13px] text-[#a23b34]">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </p>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2.5 border-t border-line pt-4 sm:flex-row sm:items-center">
              {editing && (
                <button type="button" onClick={remove} disabled={saving}
                  className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold text-[#a23b34] hover:bg-[#fbecea] disabled:opacity-50">
                  <Trash2 className="h-4 w-4" /> {t('Supprimer ce DS')}
                </button>
              )}
              <div className="grid grid-cols-[auto_1fr] gap-2.5 sm:ms-auto sm:flex sm:items-center">
                <button type="button" className="fd-btn-ghost min-h-11 justify-center px-5 sm:min-h-10" onClick={close}>{t('Annuler')}</button>
                <button type="submit" className="fd-btn-primary min-h-11 justify-center disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-10" disabled={!ready || saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                  {editing ? t('Enregistrer') : t('Préparer mon DS')}
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
