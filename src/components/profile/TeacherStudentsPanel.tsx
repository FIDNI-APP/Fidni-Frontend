// Onglet « Mes élèves » du profil enseignant (refonte du 11/10/2026) : inviter un élève par son pseudo,
// la liste de ses élèves, les invitations en attente et l'historique. Tutoiement, couleurs de la palette,
// bouton « Retirer » toujours visible (avant : seulement au survol, inaccessible au doigt).
import React, { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, RotateCcw, Search, Trash2, UserPlus, Users, X } from 'lucide-react';
import { CardsSkeleton, EmptyState, Section } from '@/components/space/Page';
import { deleteTeacherInvitation, getTeacherStudents, sendTeacherInvitation } from '@/lib/api';

interface Student {
  id: number;
  username: string;
  avatar: string | null;
  class_level: string | null;
}

interface Invitation {
  id: number;
  student_username: string;
  student_avatar: string | null;
  student_class_level: string | null;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}

const Avatar: React.FC<{ src: string | null; name: string }> = ({ src, name }) => {
  const [broken, setBroken] = useState(false);
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink text-[14px] font-semibold text-white">
      {src && !broken
        ? <img src={src} alt="" onError={() => setBroken(true)} className="h-full w-full object-cover" />
        : <span aria-hidden>{name[0]?.toUpperCase()}</span>}
    </span>
  );
};

const STATUS: Record<Invitation['status'], { label: string; cls: string }> = {
  pending: { label: 'En attente', cls: 'bg-gold-soft text-gold-strong' },
  accepted: { label: 'Acceptée', cls: 'bg-brand-soft text-brand-hover' },
  declined: { label: 'Refusée', cls: 'bg-[#f2f1ee] text-ink-faint' },
};

const StatusBadge: React.FC<{ status: Invitation['status'] }> = ({ status }) => (
  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${STATUS[status].cls}`}>{STATUS[status].label}</span>
);

/** Une personne : photo, pseudo, niveau, puis l'état et l'action. */
const PersonRow: React.FC<{
  name: string; avatar: string | null; level: string | null; status?: Invitation['status'];
  action: { label: string; icon: 'remove' | 'cancel'; onClick: () => void; busy: boolean };
}> = ({ name, avatar, level, status, action }) => (
  <li className="flex min-h-14 items-center gap-3 px-4 py-2.5 sm:px-5">
    <Avatar src={avatar} name={name} />
    <span className="min-w-0 flex-1">
      <span className="block truncate text-[14px] font-semibold text-ink">{name}</span>
      {level && <span className="block truncate text-[12.5px] text-ink-faint">{level}</span>}
    </span>
    {status && <StatusBadge status={status} />}
    <button type="button" onClick={action.onClick} disabled={action.busy} aria-label={`${action.label} : ${name}`} title={action.label}
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink-faint transition-colors hover:bg-[#fbecea] hover:text-[#a23b34] disabled:opacity-50">
      {action.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : action.icon === 'cancel' ? <X className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
    </button>
  </li>
);

const TeacherStudentsPanel: React.FC = () => {
  const [students, setStudents] = useState<Student[] | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [failed, setFailed] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const data = await getTeacherStudents();
      setStudents(data.students ?? []);
      setInvitations(data.invitations ?? []);
    } catch {
      setFailed(true);
      setStudents((s) => s ?? []);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const who = identifier.trim();
    if (!who) return;
    setSending(true);
    setSendError(null);
    setSendSuccess(null);
    try {
      await sendTeacherInvitation(who);
      setSendSuccess(`Invitation envoyée à « ${who} ».`);
      setIdentifier('');
      load();
    } catch (err) {
      setSendError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'L’invitation n’a pas pu partir. Réessaie.');
    } finally {
      setSending(false);
    }
  };

  const remove = async (id: number, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(id);
    setActionError(null);
    try {
      await deleteTeacherInvitation(id);
      await load();
    } catch {
      setActionError('L’opération a échoué. Réessaie.');
    } finally {
      setBusy(null);
    }
  };

  const pending = invitations.filter((i) => i.status === 'pending');
  const past = invitations.filter((i) => i.status !== 'pending');

  return (
    <div className="flex max-w-2xl flex-col gap-10">
      <Section id="inviter" title="Inviter un élève" hint="Saisis le pseudo de l’élève : il recevra une invitation à te rejoindre.">
        <form onSubmit={handleSend} className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-4 sm:flex-row sm:p-5">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Pseudo de l’élève</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
            <input type="text" value={identifier} autoComplete="off" placeholder="Pseudo de l’élève"
              onChange={(e) => { setIdentifier(e.target.value); setSendError(null); setSendSuccess(null); }}
              className="h-11 w-full rounded-xl border border-line bg-white pl-9 pr-3 text-[14px] text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30" />
          </label>
          <button type="submit" disabled={sending || !identifier.trim()} className="fd-btn-primary min-h-11 justify-center disabled:cursor-not-allowed disabled:opacity-50">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Inviter
          </button>
        </form>
        {sendError && (
          <p role="alert" className="mt-3 rounded-xl border border-[#f0d5d1] bg-[#fbecea] px-3.5 py-2.5 text-[13px] text-[#a23b34]">{sendError}</p>
        )}
        {sendSuccess && (
          <p role="status" className="mt-3 flex items-center gap-2 rounded-xl border border-brand-line bg-brand-soft px-3.5 py-2.5 text-[13px] text-ink">
            <Check className="h-4 w-4 shrink-0 text-brand-hover" aria-hidden /> {sendSuccess}
          </p>
        )}
      </Section>

      {failed && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-[#f0d5d1] bg-[#fbecea] px-4 py-3">
          <p className="flex-1 text-[13.5px] font-medium text-[#a23b34]">La liste de tes élèves n’a pas pu se charger. Vérifie ta connexion.</p>
          <button type="button" onClick={load} className="fd-btn-ghost min-h-10"><RotateCcw className="h-4 w-4" /> Réessayer</button>
        </div>
      )}
      {actionError && (
        <p role="alert" className="rounded-xl border border-[#f0d5d1] bg-[#fbecea] px-4 py-3 text-[13.5px] font-medium text-[#a23b34]">{actionError}</p>
      )}

      <Section id="eleves" title="Mes élèves" count={students?.length}>
        {students === null ? <CardsSkeleton n={2} /> : students.length === 0 ? (
          <EmptyState compact icon={Users} tone="ink" title="Pas encore d’élève"
            text="Invite un élève avec son pseudo : dès qu’il accepte, il apparaît ici." />
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
            {students.map((s) => {
              const inv = invitations.find((i) => i.student_username === s.username && i.status === 'accepted');
              return (
                <PersonRow key={s.id} name={s.username} avatar={s.avatar} level={s.class_level}
                  action={{
                    label: 'Retirer cet élève', icon: 'remove', busy: !!inv && busy === inv.id,
                    onClick: () => { if (inv) remove(inv.id, `Retirer « ${s.username} » de tes élèves ?`); },
                  }} />
              );
            })}
          </ul>
        )}
      </Section>

      {pending.length > 0 && (
        <Section id="en-attente" title="Invitations en attente" count={pending.length}>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
            {pending.map((inv) => (
              <PersonRow key={inv.id} name={inv.student_username} avatar={inv.student_avatar} level={inv.student_class_level} status="pending"
                action={{ label: 'Annuler l’invitation', icon: 'cancel', busy: busy === inv.id, onClick: () => remove(inv.id) }} />
            ))}
          </ul>
        </Section>
      )}

      {past.length > 0 && (
        <Section id="historique" title="Historique des invitations">
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
            {past.map((inv) => (
              <PersonRow key={inv.id} name={inv.student_username} avatar={inv.student_avatar} level={inv.student_class_level} status={inv.status}
                action={{
                  label: 'Supprimer de l’historique', icon: 'remove', busy: busy === inv.id,
                  // Une invitation acceptée supprimée retire aussi l'élève : on le dit avant.
                  onClick: () => remove(inv.id, inv.status === 'accepted' ? `Cela retire aussi « ${inv.student_username} » de tes élèves. Continuer ?` : undefined),
                }} />
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
};

export default TeacherStudentsPanel;
