import React, { useState, useEffect } from 'react';
import {
  Users, UserPlus, X, Check, Clock, Trash2, Search, Loader2, AlertCircle
} from 'lucide-react';
import {
  getTeacherStudents,
  sendTeacherInvitation,
  deleteTeacherInvitation,
} from '@/lib/api';

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

const Avatar: React.FC<{ src: string | null; name: string; size?: string }> = ({ src, name, size = 'w-10 h-10' }) => (
  <div className={`${size} rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0`}>
    {src
      ? <img src={src} alt={name} className="w-full h-full object-cover" />
      : <span className="text-white font-semibold text-sm">{name[0]?.toUpperCase()}</span>
    }
  </div>
);

const StatusBadge: React.FC<{ status: Invitation['status'] }> = ({ status }) => {
  const map = {
    pending:  { label: 'En attente', cls: 'bg-amber-100 text-amber-700' },
    accepted: { label: 'Acceptée',   cls: 'bg-emerald-100 text-emerald-700' },
    declined: { label: 'Refusée',    cls: 'bg-red-100 text-red-700' },
  };
  const { label, cls } = map[status];
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
};

const TeacherStudentsPanel: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [identifier, setIdentifier] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await getTeacherStudents();
      setStudents(data.students);
      setInvitations(data.invitations);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;
    setSending(true);
    setSendError(null);
    setSendSuccess(null);
    try {
      await sendTeacherInvitation(identifier.trim());
      setSendSuccess(`Invitation envoyée à "${identifier.trim()}"`);
      setIdentifier('');
      load();
    } catch (err: any) {
      setSendError(err.response?.data?.error || 'Erreur lors de l\'envoi');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteTeacherInvitation(id);
      load();
    } catch {
      // silent
    }
  };

  const pendingInvitations = invitations.filter(i => i.status === 'pending');
  const pastInvitations   = invitations.filter(i => i.status !== 'pending');

  return (
    <div className="space-y-8 max-w-2xl">

      {/* Invite form */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-1 flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-blue-600" />
          Inviter un élève
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          Saisissez le nom d'utilisateur de l'élève. Il recevra une invitation à rejoindre votre classe.
        </p>

        <form onSubmit={handleSend} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={identifier}
              onChange={e => { setIdentifier(e.target.value); setSendError(null); setSendSuccess(null); }}
              placeholder="Nom d'utilisateur de l'élève"
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={sending || !identifier.trim()}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Inviter
          </button>
        </form>

        {sendError && (
          <div className="mt-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {sendError}
          </div>
        )}
        {sendSuccess && (
          <div className="mt-3 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            <Check className="w-4 h-4 flex-shrink-0" />
            {sendSuccess}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          {/* Current students */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              Mes élèves
              <span className="ml-auto text-xs font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                {students.length}
              </span>
            </h2>

            {students.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Aucun élève pour l'instant. Invitez-en un ci-dessus.</p>
            ) : (
              <div className="space-y-3">
                {students.map(s => (
                  <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                    <Avatar src={s.avatar} name={s.username} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{s.username}</p>
                      {s.class_level && <p className="text-xs text-slate-500">{s.class_level}</p>}
                    </div>
                    <button
                      onClick={() => {
                        const inv = invitations.find(i => i.student_username === s.username && i.status === 'accepted');
                        if (inv) handleDelete(inv.id);
                      }}
                      className="p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-50"
                      title="Retirer cet élève"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending invitations */}
          {pendingInvitations.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                Invitations en attente
                <span className="ml-auto text-xs font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                  {pendingInvitations.length}
                </span>
              </h2>
              <div className="space-y-3">
                {pendingInvitations.map(inv => (
                  <div key={inv.id} className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                    <Avatar src={inv.student_avatar} name={inv.student_username} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{inv.student_username}</p>
                      {inv.student_class_level && <p className="text-xs text-slate-500">{inv.student_class_level}</p>}
                    </div>
                    <StatusBadge status="pending" />
                    <button
                      onClick={() => handleDelete(inv.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Annuler l'invitation"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Past invitations (declined) */}
          {pastInvitations.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-400" />
                Historique des invitations
              </h2>
              <div className="space-y-3">
                {pastInvitations.map(inv => (
                  <div key={inv.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <Avatar src={inv.student_avatar} name={inv.student_username} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{inv.student_username}</p>
                      {inv.student_class_level && <p className="text-xs text-slate-500">{inv.student_class_level}</p>}
                    </div>
                    <StatusBadge status={inv.status} />
                    <button
                      onClick={() => handleDelete(inv.id)}
                      className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TeacherStudentsPanel;
