// Modération (admins) : supprime un compte ET tout son contenu, pour un contenu inapproprié.
// Une suppression demandée par l'utilisateur, elle, garde ses contributions sous « Compte supprimé ».
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ShieldAlert } from 'lucide-react';
import { moderationDeleteAccount } from '@/lib/api/userApi';

export const ModerationDeleteButton: React.FC<{ username: string }> = ({ username }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => { setOpen(false); setConfirm(''); setError(null); };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await moderationDeleteAccount(username, confirm);
      close();
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'La suppression a échoué.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="fd-btn-ghost" style={{ flexShrink: 0, color: '#a23b34' }}
        title="Réservé aux administrateurs">
        <ShieldAlert className="w-3.5 h-3.5" /> Supprimer (modération)
      </button>

      {open && (
        <div className="fixed inset-0 overflow-y-auto [align-items:safe_center] z-[100] bg-black/50 flex items-center justify-center p-4" onClick={close}
          role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[#1a1a1a] mb-2">Supprimer « {username} » et son contenu ?</h3>
            <p className="text-sm text-[#6b6862] mb-4 leading-relaxed">
              Modération : le compte <strong>et tout ce qu’il a publié</strong> (exercices, leçons, examens,
              commentaires, solutions, fichiers) seront définitivement effacés. À réserver au contenu inapproprié.
            </p>
            <label className="block text-sm text-[#a23b34] mb-1.5">Recopie <strong>{username}</strong> pour confirmer :</label>
            <input value={confirm} onChange={(e) => setConfirm(e.target.value)} autoFocus
              className="w-full px-3 py-2 border border-[#f3c9c5] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c2564f]/30" />
            {error && <p className="text-sm text-[#a23b34] mt-2">{error}</p>}
            <div className="flex gap-3 mt-5">
              <button onClick={close} className="flex-1 fd-btn-ghost justify-center" disabled={busy}>Annuler</button>
              <button onClick={submit} disabled={confirm !== username || busy}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl disabled:opacity-50"
                style={{ background: '#a23b34' }}>
                {busy && <Loader2 className="w-4 h-4 animate-spin" />} Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ModerationDeleteButton;
