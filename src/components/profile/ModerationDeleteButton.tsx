// Modération (admins) : supprime un compte ET tout son contenu, pour un contenu inapproprié.
// Une suppression demandée par l'utilisateur, elle, garde ses contributions sous « Compte supprimé ».
import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) { setOpen(false); setConfirm(''); setError(null); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirm !== username || busy) return;
    setBusy(true);
    setError(null);
    try {
      await moderationDeleteAccount(username, confirm);
      close();
      navigate('/');
    } catch (err) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'La suppression a échoué.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title="Réservé aux administrateurs"
        className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-[10px] border border-[#f0d5d1] bg-[#fbecea] px-3.5 text-[13px] font-semibold text-[#a23b34] transition-colors hover:border-[#a23b34]">
        <ShieldAlert className="h-4 w-4" /> Supprimer (modération)
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/40 p-4 [align-items:safe_center]" onClick={() => !busy && close()}>
          <form role="dialog" aria-modal="true" aria-labelledby="moderation-titre" onSubmit={submit} onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-line bg-white p-5 shadow-xl sm:p-6">
            <h2 id="moderation-titre" className="fd-display text-[20px] leading-tight text-ink">Supprimer « {username} » et son contenu ?</h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-faint">
              Modération : le compte <b className="font-semibold text-ink-soft">et tout ce qu’il a publié</b> (exercices, leçons, examens,
              commentaires, solutions, fichiers) seront définitivement effacés. À réserver au contenu inapproprié.
            </p>
            <div className="mt-4 rounded-xl border border-[#f0d5d1] bg-[#fbecea] p-3.5">
              <label htmlFor="moderation-confirm" className="mb-1.5 block text-[13px] text-[#a23b34]">
                Recopie <b className="font-semibold">{username}</b> pour confirmer :
              </label>
              <input id="moderation-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoFocus autoComplete="off"
                className="h-11 w-full rounded-xl border border-line bg-white px-3.5 text-[14px] text-ink focus:border-[#a23b34] focus:outline-none focus:ring-2 focus:ring-[#a23b34]/25" />
              {error && <p role="alert" className="mt-2 text-[13px] font-medium text-[#a23b34]">{error}</p>}
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row">
              <button type="button" onClick={close} className="fd-btn-ghost min-h-11 flex-1 justify-center" disabled={busy}>Annuler</button>
              <button type="submit" disabled={confirm !== username || busy}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-[#a23b34] px-4 text-[13px] font-semibold text-white hover:bg-[#8a312b] disabled:cursor-not-allowed disabled:opacity-50">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Supprimer définitivement
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

export default ModerationDeleteButton;
