/**
 * Mes documents (/documents, 12/10/2026) : les documents de l'éditeur « façon Word » du membre
 * (devoirs rédigés, fiches de cours, brouillons d'exercices…). Nouveau, importer un Word, ouvrir, dupliquer, supprimer.
 * Réservé aux enseignants (déclarés) et à l'équipe pour l'instant (12/10/2026 ; serveur : IsTeacherOrAdmin).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Copy, FileDown, FilePlus2, FileText, Loader2, RotateCcw, Search, Sigma, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { isTeacherOrAdmin } from '@/lib/features';
import { useOpenSignup } from '@/components/auth/SignupPrompt';
import { CardsSkeleton, EmptyState, Page, PageHeader } from '@/components/space/Page';
import { documentsAPI, type DocumentSummary } from '@/lib/api/documentsApi';
import { useDocxImport } from './useDocxImport';
import { Excerpt } from './Excerpt';

const when = (iso: string) => {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days < 1 && new Date().getDate() === d.getDate()) return `aujourd’hui à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  if (days < 2) return 'hier';
  if (days < 7) return `il y a ${days} jours`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
};

export const MesDocuments: React.FC = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const teacherTools = isTeacherOrAdmin(user);
  const openSignup = useOpenSignup('documents');
  const navigate = useNavigate();
  const [docs, setDocs] = useState<DocumentSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);

  const load = () => {
    setFailed(false);
    documentsAPI.list().then(setDocs).catch(() => setFailed(true));
  };
  useEffect(() => { if (isAuthenticated && teacherTools) load(); }, [isAuthenticated, teacherTools]);

  const shown = useMemo(() => {
    const f = q.trim().toLowerCase();
    return (docs ?? []).filter((d) => !f || d.title.toLowerCase().includes(f) || d.excerpt.toLowerCase().includes(f));
  }, [docs, q]);

  const create = async () => {
    setCreating(true);
    try {
      const doc = await documentsAPI.create({ title: 'Document sans titre', html: '' });
      navigate(`/documents/${doc.id}`);
    } catch (e) {
      const msg = (e as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      toast.error(msg || 'Le document n’a pas pu être créé. Réessaie.');
      setCreating(false);
    }
  };
  const duplicate = async (d: DocumentSummary) => {
    try {
      const copy = await documentsAPI.duplicate(d.id);
      setDocs((list) => [{ ...d, id: copy.id, title: copy.title, updated_at: copy.updated_at, created_at: copy.created_at }, ...(list ?? [])]);
      toast.success('Document dupliqué');
    } catch { toast.error('La copie n’a pas pu être créée.'); }
  };
  const remove = async (d: DocumentSummary) => {
    if (!window.confirm(`Supprimer « ${d.title} » ? Cette action est définitive.`)) return;
    try {
      await documentsAPI.remove(d.id);
      setDocs((list) => (list ?? []).filter((x) => x.id !== d.id));
      toast.success('Document supprimé');
    } catch { toast.error('Le document n’a pas pu être supprimé.'); }
  };

  const docx = useDocxImport();
  const header = (
    <PageHeader eyebrow="Outils prof" title="Mes documents"
      subtitle="Rédige tes fiches, tes devoirs et tes exercices comme dans Word, avec des équations faciles à écrire : Alt+= puis tape ta formule."
      actions={isAuthenticated && teacherTools ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={docx.open} disabled={docx.busy} className="fd-btn-ghost min-h-10"
            title="Un document Word (.docx) devient un document FIDNI : équations Word et MathType comprises">
            {docx.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} Importer un Word
          </button>
          <button type="button" onClick={create} disabled={creating} className="fd-btn-primary min-h-10">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />} Nouveau document
          </button>
          {docx.input}
        </div>
      ) : undefined} />
  );

  if (!isAuthenticated) {
    if (authLoading) return <Page>{header}<CardsSkeleton n={3} className="sm:grid-cols-3" /></Page>;
    return (
      <Page>
        {header}
        <EmptyState icon={Sigma} title="Un éditeur de documents avec équations"
          text="Crée un compte gratuit pour rédiger et enregistrer tes documents, puis les imprimer ou les garder en PDF."
          action={<button type="button" onClick={() => openSignup('signup')} className="fd-btn-primary min-h-10">Créer un compte</button>}
          secondary={<button type="button" onClick={() => openSignup('login')} className="fd-btn-ghost min-h-10">Se connecter</button>} />
      </Page>
    );
  }

  // Élève : l'éditeur est réservé aux enseignants pour l'instant.
  if (!teacherTools) {
    return (
      <Page>
        {header}
        <EmptyState icon={Sigma} tone="ink" title="Réservé aux enseignants pour l’instant"
          text="L’éditeur de documents avec équations est ouvert aux professeurs. Il le sera bientôt pour tout le monde."
          action={<Link to="/" className="fd-btn-primary min-h-10">Retour à l’accueil</Link>} />
      </Page>
    );
  }

  return (
    <Page width="wide">
      {header}
      {failed && (
        <div role="alert" className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-[#f0d5d1] bg-[#fbecea] px-4 py-3">
          <p className="flex-1 text-[13.5px] font-medium text-[#a23b34]">Tes documents n’ont pas pu se charger. Vérifie ta connexion.</p>
          <button type="button" onClick={load} className="fd-btn-ghost min-h-10"><RotateCcw className="h-4 w-4" /> Réessayer</button>
        </div>
      )}
      {docs === null && !failed && <CardsSkeleton n={3} className="sm:grid-cols-3" />}
      {docs && docs.length === 0 && (
        <EmptyState icon={FileText} title="Aucun document pour l’instant"
          text="Ton premier document s’ouvre sur une page blanche, prête pour du texte, des tableaux et des équations."
          action={<button type="button" onClick={create} disabled={creating} className="fd-btn-primary min-h-10"><FilePlus2 className="h-4 w-4" /> Nouveau document</button>} />
      )}
      {docs && docs.length > 0 && (
        <>
          <label className="mb-5 flex max-w-md items-center gap-2 rounded-xl border border-line bg-white px-3 focus-within:border-brand">
            <Search className="h-4 w-4 text-ink-faint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un document" aria-label="Rechercher un document"
              className="min-h-10 flex-1 bg-transparent text-[14px] outline-none" />
          </label>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <li>
              <button type="button" onClick={create} disabled={creating}
                className="flex h-full min-h-[190px] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line bg-white/60 text-ink-faint transition-colors hover:border-brand hover:text-brand-hover">
                <FilePlus2 className="h-7 w-7" />
                <span className="text-[14px] font-semibold">Nouveau document</span>
              </button>
            </li>
            {shown.map((d) => (
              <li key={d.id} className="group relative">
                <Link to={`/documents/${d.id}`} className="flex h-full min-h-[190px] flex-col rounded-2xl border border-line bg-white p-4 transition-shadow hover:shadow-[0_10px_30px_-14px_rgba(20,18,16,.28)]">
                  <div className="mb-3 h-20 overflow-hidden rounded-lg border border-[#efece6] bg-[#fbfaf8] px-3 py-2 text-[10.5px] leading-snug text-ink-faint">
                    {d.excerpt ? <Excerpt text={d.excerpt} /> : <span className="italic">Document vide</span>}
                  </div>
                  <h2 className="line-clamp-2 text-[15px] font-semibold text-ink">{d.title}</h2>
                  <p className="mt-auto pt-2 text-[12.5px] text-ink-faint">Modifié {when(d.updated_at)}</p>
                </Link>
                <div className="absolute right-3 top-3 flex gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                  <button type="button" onClick={() => duplicate(d)} title="Dupliquer" aria-label={`Dupliquer ${d.title}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white text-ink-soft hover:text-ink"><Copy className="h-4 w-4" /></button>
                  <button type="button" onClick={() => remove(d)} title="Supprimer" aria-label={`Supprimer ${d.title}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white text-[#a23b34] hover:bg-[#fbecea]"><Trash2 className="h-4 w-4" /></button>
                </div>
              </li>
            ))}
          </ul>
          {!shown.length && <p className="mt-6 text-center text-[13.5px] text-ink-faint">Aucun document ne correspond à « {q} ».</p>}
        </>
      )}
    </Page>
  );
};

export default MesDocuments;
