/**
 * Mes classes (/classrooms), refonte du 11/10/2026.
 *  - Élève sans classe : on lui dit d'où vient le code (« Ton prof te donne un code de classe ») et le
 *    champ est là, dans la page (avant : un bouton, puis une fenêtre ; personne n'avait rejoint en 30 j).
 *  - Élève avec classes : ses classes en cartes, et une tuile « Un autre code ? » pour en rejoindre une autre.
 *  - Prof : « Créer une classe », puis ses classes avec l'effectif et le code à copier pour l'envoyer aux élèves.
 */
import React, { useCallback, useEffect, useId, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, Check, Copy, GraduationCap, KeyRound, Loader2, LogIn, LogOut, Plus, RotateCcw, Trash2, Users, X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { SEO } from '@/components/layout/SEO';
import { Page, PageHeader, Section, EmptyState, CardsSkeleton } from '@/components/space/Page';
import {
  listClassrooms,
  createClassroom,
  deleteClassroom,
  joinClassroom,
  leaveClassroom,
  classroomError,
  type Classroom,
} from '@/lib/api/classroomApi';
import { t } from '@/i18n';

const plural = (n: number, one: string, many: string) => (n > 1 ? many : one);

export function ClassroomsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const isTeacher = user?.profile?.user_type === 'teacher';
  const userId = user?.id;

  const [classrooms, setClassrooms] = useState<Classroom[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setFailed(false);
      setClassrooms(await listClassrooms());
    } catch (e) {
      console.error(e);
      setClassrooms((c) => c ?? []);
      setFailed(true);
    }
  }, []);

  useEffect(() => { if (userId) refresh(); }, [userId, refresh]);

  // Direct dans la classe : l'élève y arrive sur ses TD.
  const joined = (c: Classroom) => { setShowJoin(false); navigate(`/classrooms/${c.id}`); };

  const remove = async (c: Classroom) => {
    if (!window.confirm(t('Supprimer la classe « {name} » ? Ses TD et la liste de ses élèves seront perdus.', { name: c.name }))) return;
    setBusyId(c.id);
    try { await deleteClassroom(c.id); setError(''); await refresh(); }
    catch (e) { setError(classroomError(e, t('Impossible de supprimer la classe.'))); }
    finally { setBusyId(null); }
  };

  const leave = async (c: Classroom) => {
    if (!window.confirm(t('Quitter la classe « {name} » ?', { name: c.name }))) return;
    setBusyId(c.id);
    try { await leaveClassroom(c.id); setError(''); await refresh(); }
    catch (e) { setError(classroomError(e, t('Impossible de quitter la classe.'))); }
    finally { setBusyId(null); }
  };

  const header = (actions?: React.ReactNode) => (
    <PageHeader
      eyebrow={t('Classes')}
      title={t('Mes classes')}
      subtitle={isTeacher
        ? t('Crée une classe, donne son code à tes élèves et suis leur travail.')
        : t('Rejoins la classe de ton prof avec son code : tu y retrouves les TD qu’il te donne.')}
      actions={actions}
    />
  );

  if (!user) {
    return (
      <Page>
        <SEO title={t('Mes classes - Fidni')} description={t('Rejoindre la classe de son prof avec un code.')} noindex />
        {authLoading ? <CardsSkeleton n={2} /> : (
          <>
            {header()}
            <EmptyState icon={GraduationCap} title={t('Connecte-toi pour voir tes classes')}
              text={t('Ton prof te donne un code de classe : une fois connecté, tu l’entres ici pour rejoindre sa classe.')}
              action={<Link to="/login" className="fd-btn-primary min-h-11"><LogIn className="h-4 w-4" /> {t('Me connecter')}</Link>} />
          </>
        )}
      </Page>
    );
  }

  const owned = (classrooms ?? []).filter((c) => c.is_owner);
  const member = (classrooms ?? []).filter((c) => !c.is_owner);
  const none = classrooms !== null && classrooms.length === 0;

  const teacherActions = (
    <div className="flex flex-wrap items-center gap-2" data-tour="classes-actions">
      <button type="button" className="fd-btn-primary min-h-10" onClick={() => setShowCreate(true)}>
        <Plus className="h-4 w-4" /> {t('Créer une classe')}
      </button>
      <button type="button" className="fd-btn-ghost min-h-10" onClick={() => setShowJoin(true)}>
        <KeyRound className="h-4 w-4" /> {t('J’ai un code')}
      </button>
    </div>
  );

  return (
    <Page>
      <SEO title={t('Mes classes - Fidni')} description={t('Mes classes : rejoindre la classe de son prof, ou créer la sienne.')} />
      {header(isTeacher && classrooms !== null && (!none || failed) ? teacherActions : undefined)}

      {(failed || error) && (
        <div role="alert" className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-[#f0d5d1] bg-[#fbecea] px-4 py-3">
          <p className="flex-1 text-[13.5px] font-medium text-[#a23b34]">
            {error || t('Tes classes n’ont pas pu se charger. Vérifie ta connexion.')}
          </p>
          {failed ? (
            <button type="button" onClick={refresh} className="fd-btn-ghost min-h-9"><RotateCcw className="h-4 w-4" /> {t('Réessayer')}</button>
          ) : (
            <button type="button" onClick={() => setError('')} aria-label={t('Fermer le message')}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#a23b34] hover:bg-white/60">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {classrooms === null ? (
        <CardsSkeleton n={3} className="sm:grid-cols-2 lg:grid-cols-3" />
      ) : none && !failed ? (
        isTeacher ? (
          <EmptyState icon={GraduationCap} title={t('Crée ta première classe')}
            text={t('Une classe regroupe tes élèves : tu leur donnes des TD et tu suis leur travail. Ils la rejoignent avec un code que tu leur envoies.')}
            action={(
              <div className="flex flex-wrap items-center justify-center gap-2" data-tour="classes-actions">
                <button type="button" className="fd-btn-primary min-h-11" onClick={() => setShowCreate(true)}>
                  <Plus className="h-4 w-4" /> {t('Créer une classe')}
                </button>
                <button type="button" className="fd-btn-ghost min-h-11" onClick={() => setShowJoin(true)}>
                  <KeyRound className="h-4 w-4" /> {t('J’ai un code')}
                </button>
              </div>
            )} />
        ) : (
          <EmptyState icon={KeyRound} title={t('Ton prof te donne un code de classe')}
            text={t('Entre-le ici pour rejoindre sa classe : tu y retrouveras les TD qu’il te donne et ton avancement.')}
            action={(
              <div className="flex w-full max-w-sm flex-col items-center gap-4" data-tour="classes-actions">
                <JoinForm onJoined={joined} />
                <Link to="/reviser" className="inline-flex min-h-10 items-center gap-1 text-[13px] font-medium text-ink-faint hover:text-ink">
                  {t('Pas encore de code ? Révise seul en attendant')} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )} />
        )
      ) : isTeacher ? (
        <div className="flex flex-col gap-10">
          {owned.length > 0 && (
            <Section id="classes-gerees" title={t('Classes que je gère')} count={owned.length}
              hint={t('Envoie le code d’une classe à tes élèves : ils l’entrent dans « Mes classes » pour la rejoindre.')}>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-tour="classes-liste">
                {owned.map((c) => <OwnedCard key={c.id} classroom={c} busy={busyId === c.id} onDelete={() => remove(c)} />)}
              </ul>
            </Section>
          )}
          {member.length > 0 && (
            <Section id="classes-suivies" title={t('Classes que je suis')} count={member.length}>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-tour={owned.length ? undefined : 'classes-liste'}>
                {member.map((c) => <MemberCard key={c.id} classroom={c} busy={busyId === c.id} onLeave={() => leave(c)} />)}
              </ul>
            </Section>
          )}
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-tour="classes-liste">
          {member.map((c) => <MemberCard key={c.id} classroom={c} busy={busyId === c.id} onLeave={() => leave(c)} />)}
          <li className="flex flex-col justify-center gap-3 rounded-2xl border border-dashed border-[#d8d4cc] p-4 sm:p-5" data-tour="classes-actions">
            <p className="text-[13.5px] font-semibold text-ink-soft">{t('Un autre code ?')}</p>
            <JoinForm onJoined={joined} compact />
          </li>
        </ul>
      )}

      {showCreate && (
        <CreateClassroomModal
          onClose={() => setShowCreate(false)}
          onCreated={async (c) => {
            setShowCreate(false);
            await refresh();
            navigate(`/classrooms/${c.id}`);
          }}
        />
      )}

      {showJoin && (
        <ModalShell title={t('Rejoindre une classe')} onClose={() => setShowJoin(false)}>
          <p className="mb-4 text-[13px] leading-relaxed text-ink-faint">{t('Entre le code que t’a donné le prof de la classe.')}</p>
          <JoinForm onJoined={joined} autoFocus />
        </ModalShell>
      )}
    </Page>
  );
}

/* ───────── Formulaire « Rejoindre » (dans la page, ou dans la fenêtre du prof) ───────── */

function JoinForm({ onJoined, compact = false, autoFocus = false }: {
  onJoined: (c: Classroom) => void;
  /** Tuile « Un autre code ? » : champ et bouton toujours sur une ligne. */
  compact?: boolean;
  autoFocus?: boolean;
}) {
  const id = useId();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || busy) return;
    try {
      setBusy(true); setErr('');
      const c = await joinClassroom(code.trim());
      onJoined(c);
    } catch (e) {
      setErr(classroomError(e, t('Ce code ne correspond à aucune classe. Vérifie-le avec ton prof.')));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="w-full" noValidate>
      <div className={`flex gap-2 ${compact ? '' : 'flex-col sm:flex-row'}`}>
        <label htmlFor={`${id}-code`} className="sr-only">{t('Code de la classe')}</label>
        <input
          id={`${id}-code`}
          value={code}
          onChange={(e) => { setCode(e.target.value.toUpperCase().replace(/\s+/g, '')); if (err) setErr(''); }}
          maxLength={12}
          autoFocus={autoFocus}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder={compact ? t('Le code') : t('Code de la classe')}
          aria-invalid={!!err}
          aria-describedby={err ? `${id}-err` : undefined}
          className={`min-h-11 w-full min-w-0 flex-1 rounded-xl border bg-white px-4 font-mono text-[16px] font-bold uppercase tracking-[.14em] text-ink placeholder:font-sans placeholder:text-[14px] placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-ink-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 ${
            err ? 'border-[#e3b7b1]' : 'border-line focus:border-ink-faint'} ${compact ? '' : 'text-center sm:text-start'}`}
        />
        <button type="submit" disabled={busy || !code.trim()} className="fd-btn-primary min-h-11 shrink-0 justify-center disabled:cursor-not-allowed disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
          {t('Rejoindre')}
        </button>
      </div>
      {err && <p id={`${id}-err`} role="alert" className="mt-2 text-start text-[12.5px] font-medium text-[#a23b34]">{err}</p>}
    </form>
  );
}

/* ───────── Cartes ───────── */

/** Code de la classe et bouton « Copier » (le prof l'envoie à ses élèves). */
function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch (e) { console.error(e); }
  };
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[.08em] text-ink-faint">{t('Code')}</span>
      <span className="fd-nums truncate font-mono text-[15px] font-bold tracking-[.12em] text-ink">{code}</span>
      <button type="button" onClick={copy} aria-label={copied ? t('Code copié') : t('Copier le code {code}', { code })}
        className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-[12.5px] font-semibold text-brand-hover transition-colors hover:bg-brand-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        <span aria-live="polite">{copied ? t('Copié') : t('Copier')}</span>
      </button>
    </span>
  );
}

const cardCls = 'rounded-2xl border border-line bg-white transition-[border-color,box-shadow] hover:border-[#cfc9bf] hover:shadow-[0_6px_16px_rgba(20,18,16,.06)]';
const linkFocus = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40';

/** Classe du prof : effectif en avant, code à copier, suppression discrète. */
function OwnedCard({ classroom: c, busy, onDelete }: { classroom: Classroom; busy: boolean; onDelete: () => void }) {
  const n = c.student_count;
  const subjects = c.subjects.length;
  return (
    <li className={`flex flex-col overflow-hidden ${cardCls}`}>
      <Link to={`/classrooms/${c.id}`} className={`group block flex-1 p-4 sm:p-5 ${linkFocus}`}>
        <span className="block truncate text-[16px] font-semibold text-ink">{c.name}</span>
        {c.class_level_name && <span className="mt-0.5 block text-[12.5px] text-ink-faint">{c.class_level_name}</span>}
        <span className="mt-4 flex items-baseline gap-1.5 text-[13px] text-ink-faint">
          <b className="fd-nums text-[26px] font-bold leading-none text-ink">{n}</b>
          {plural(n, t('élève'), t('élèves'))}
          {subjects > 0 && <> · {subjects} {plural(subjects, t('matière'), t('matières'))}</>}
        </span>
        {n === 0 ? (
          <span className="mt-2.5 inline-flex rounded-full bg-gold-soft px-2.5 py-1 text-[12px] font-medium text-gold-strong">
            {t('Envoie le code pour qu’ils te rejoignent')}
          </span>
        ) : (
          <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-brand-hover group-hover:underline">
            {t('Voir la classe')} <ArrowRight className="h-3.5 w-3.5" />
          </span>
        )}
      </Link>
      <div className="flex items-center gap-2 border-t border-dashed border-line px-4 py-1.5 sm:px-5">
        <CopyCode code={c.join_code} />
        <button type="button" onClick={onDelete} disabled={busy} aria-label={t('Supprimer la classe {name}', { name: c.name })} title={t('Supprimer la classe')}
          className="ms-auto inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink-faint transition-colors hover:bg-[#fbecea] hover:text-[#a23b34]">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </button>
      </div>
    </li>
  );
}

/** Classe suivie (élève, ou prof inscrit chez un collègue) : le prof, l'effectif, « Voir mes TD ». */
function MemberCard({ classroom: c, busy, onLeave }: { classroom: Classroom; busy: boolean; onLeave: () => void }) {
  return (
    <li className={`relative ${cardCls}`}>
      <Link to={`/classrooms/${c.id}`} className={`group flex h-full flex-col rounded-2xl p-4 pe-14 sm:p-5 sm:pe-14 ${linkFocus}`}>
        <span className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f2f1ee] text-ink-soft" aria-hidden>
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[16px] font-semibold text-ink">{c.name}</span>
            {c.class_level_name && <span className="block text-[12.5px] text-ink-faint">{c.class_level_name}</span>}
          </span>
        </span>
        <span className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-faint">
          <span>{t('Prof :')} <b className="font-semibold text-ink-soft">{c.owner.username}</b></span>
          <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" aria-hidden /><span className="fd-nums">{c.student_count}</span> {plural(c.student_count, t('élève'), t('élèves'))}</span>
        </span>
        <span className="mt-auto inline-flex items-center gap-1 pt-4 text-[13px] font-semibold text-brand-hover group-hover:underline">
          {t('Voir mes TD')} <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </Link>
      <button type="button" onClick={onLeave} disabled={busy} aria-label={t('Quitter la classe {name}', { name: c.name })} title={t('Quitter la classe')}
        className="absolute end-2 top-2 inline-flex h-10 w-10 items-center justify-center rounded-xl text-ink-faint transition-colors hover:bg-[#fbecea] hover:text-[#a23b34]">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
      </button>
    </li>
  );
}

/* ───────── Fenêtres ───────── */

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div role="dialog" aria-modal="true" aria-label={title}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(20,18,16,.4)] p-4 backdrop-blur-[4px]"
      onClick={onClose}>
      <div className="fd-card animate-fade-up max-h-[88vh] w-full max-w-[480px] overflow-y-auto p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="fd-display text-[20px] leading-tight text-ink">{title}</h3>
          <button type="button" onClick={onClose} aria-label={t('Fermer')}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink-faint hover:bg-[#f2f1ee] hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const fieldCls = 'w-full rounded-xl border border-line bg-[#fcfbf9] px-3 py-2.5 text-[14px] text-ink outline-none transition-colors focus:border-ink-faint focus:bg-white';

function CreateClassroomModal({ onClose, onCreated }: { onClose: () => void; onCreated: (c: Classroom) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      setBusy(true); setErr('');
      const c = await createClassroom({ name: name.trim(), description: description.trim() });
      onCreated(c);
    } catch (e) {
      setErr(classroomError(e, t('Erreur lors de la création.')));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell title={t('Nouvelle classe')} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-semibold text-ink-soft">{t('Nom de la classe')}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus
            placeholder={t('Ex. 2ème Bac SM A')} className={`${fieldCls} min-h-11`} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-semibold text-ink-soft">{t('Description')} <span className="font-normal text-ink-faint">{t('(facultatif)')}</span></span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
            placeholder={t('Ex. Groupe de mathématiques, lycée Ibn Sina')} className={`${fieldCls} min-h-[76px] resize-y`} />
        </label>
        <p className="text-[12.5px] leading-relaxed text-ink-faint">{t('Un code est créé avec la classe : envoie-le à tes élèves pour qu’ils la rejoignent.')}</p>
        {err && <p role="alert" className="text-[12.5px] font-medium text-[#a23b34]">{err}</p>}
        <div className="mt-1 flex justify-end gap-2">
          <button type="button" className="fd-btn-ghost min-h-11" onClick={onClose}>{t('Annuler')}</button>
          <button type="submit" className="fd-btn-primary min-h-11 disabled:opacity-60" disabled={busy || !name.trim()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {t('Créer la classe')}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export default ClassroomsPage;
