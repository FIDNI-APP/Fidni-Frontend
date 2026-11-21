import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/components/auth/AuthController';
import { api } from '@/lib/api/apiClient';

export default function ConnexionAtelier() {
  const { user, isLoading } = useAuth();
  const { openModal, setInitialTab } = useAuthModal();
  const [params] = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const port = Number(params.get('port'));
  const etat = params.get('etat') ?? '';
  const empreinte = params.get('empreinte') ?? '';
  const valid = Number.isInteger(port) && port >= 1024 && port <= 65535 &&
    /^[a-f0-9]{64}$/.test(empreinte) && /^[a-f0-9]{32}$/.test(etat);

  async function autoriser() {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/atelier/autoriser/', { empreinte });
      const local = new URL('/retour', 'http://127.0.0.1:' + port);
      local.hash = new URLSearchParams({ etat, autorisation: data.autorisation }).toString();
      window.location.assign(local.href);
    } catch {
      setBusy(false);
      setError('Connexion impossible pour le moment. Réessaie depuis l’atelier.');
    }
  }

  const action = 'mt-5 rounded-xl bg-ink px-5 py-3 font-semibold text-white disabled:opacity-50';
  return <main className="mx-auto my-16 max-w-lg px-5">
    <h1 className="fd-display text-3xl font-semibold text-ink">Connecter mon atelier à Fidni</h1>
    {isLoading ? <p role="status">Chargement du compte…</p> : !valid ?
      <p className="mt-4">Ouvre l’application Atelier Fidni sur ton PC et clique sur « Connecter Fidni ».</p>
      : !user ? <><p className="mt-4">Connecte-toi avec le compte qui te donne accès à Pilotage.</p>
        <button className={action} onClick={() => { setInitialTab('login'); openModal('atelier'); }}>Me connecter à Fidni</button></>
      : !user.is_superuser ? <p className="mt-4">Ce compte n’a pas accès à Pilotage. Utilise le compte qui te sert à valider les brouillons.</p>
      : <><p className="mt-4">L’atelier de ce PC pourra vérifier tes fiches et les déposer dans « À valider ». Tu décideras de leur publication sur Fidni.</p>
        <button className={action} disabled={busy} onClick={autoriser}>{busy ? 'Connexion en cours…' : 'Connecter cet ordinateur'}</button>
        {error && <p role="alert" className="mt-3 text-red-700">{error}</p>}</>}
  </main>;
}
