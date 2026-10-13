/**
 * Un document ouvert dans l'éditeur « façon Word » (/documents/:id, 12/10/2026), plein écran comme une
 * application : barre de titre (retour, nom modifiable, état d'enregistrement), ruban, feuille A4.
 * Enregistrement automatique 1 s après la dernière frappe ; en quittant la page, ce qui reste part tout
 * de suite (et le navigateur prévient si l'envoi est encore en cours).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Check, ChevronLeft, CloudOff, Loader2, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import WordEditor, { type Entete } from '@/components/editor/word/WordEditor';
import { documentsAPI, type DocumentFull, type Marges, type Orientation } from '@/lib/api/documentsApi';
import { PublishDialog } from './PublishDialog';
import { useDocxImport } from './useDocxImport';
import { canCreateContent, isTeacherOrAdmin } from '@/lib/features';

type SaveState = 'saved' | 'dirty' | 'saving' | 'error';
const DELAY = 1000;

export const DocumentEditor: React.FC = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  // « Publier sur FIDNI » : création de contenu, l'équipe seulement pour l'instant (12/10/2026).
  const canPublish = canCreateContent(user);
  // « Mes documents » : enseignants et équipe ; sinon retour à la page qui l'explique.
  const allowed = isTeacherOrAdmin(user);
  const [doc, setDoc] = useState<DocumentFull | null>(null);
  const [loadError, setLoadError] = useState<'introuvable' | 'reseau' | null>(null);
  const [title, setTitle] = useState('');
  const [save, setSave] = useState<SaveState>('saved');
  const titleRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  // Dernier état du document (pour « Publier sur FIDNI ») ; ce qui part à l'enregistrement le met à jour.
  const htmlRef = useRef('');
  const enteteRef = useRef<Record<string, unknown>>({});
  const [publishing, setPublishing] = useState(false);

  // Modifications pas encore envoyées, regroupées (le dernier état l'emporte).
  const pending = useRef<Partial<DocumentFull>>({});
  const timer = useRef<number | null>(null);
  const inflight = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !allowed)) navigate('/documents', { replace: true });
  }, [authLoading, isAuthenticated, allowed, navigate]);

  useEffect(() => {
    if (!isAuthenticated || !allowed || !id) return;
    let cancelled = false;
    setDoc(null);
    setLoadError(null);
    documentsAPI.get(id)
      .then((d) => {
        if (cancelled) return;
        setDoc(d); setTitle(d.title); document.title = `${d.title} · Fidni`;
        htmlRef.current = d.html; enteteRef.current = d.entete ?? {};
      })
      .catch((e) => { if (!cancelled) setLoadError(e?.response?.status === 404 ? 'introuvable' : 'reseau'); });
    return () => { cancelled = true; };
  }, [id, isAuthenticated, allowed]);

  // Document qui vient d'être importé de Word : ce qui n'a pas pu l'être est dit une fois.
  useEffect(() => {
    const st = location.state as { avertissements?: string[]; serieTerminee?: { published: unknown[]; skipped: number } } | null;
    const notes = st?.avertissements;
    const fin = st?.serieTerminee;
    if (!notes && !fin) return;
    notes?.forEach((n) => toast(n, { icon: '⚠️', duration: 12000 }));
    if (fin) {
      const n = fin.published.length;
      toast.success(`${n} exercice${n > 1 ? 's' : ''} publié${n > 1 ? 's' : ''} sur FIDNI${fin.skipped ? ` (${fin.skipped} passé${fin.skipped > 1 ? 's' : ''})` : ''}`, { duration: 8000 });
    }
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  const flush = useCallback(async () => {
    if (timer.current) { window.clearTimeout(timer.current); timer.current = null; }
    if (inflight.current) await inflight.current.catch(() => {});
    const data = pending.current;
    if (!Object.keys(data).length || !id) return;
    pending.current = {};
    setSave('saving');
    const p = documentsAPI.update(id, data)
      .then(() => setSave(Object.keys(pending.current).length ? 'dirty' : 'saved'))
      .catch((e) => {
        // On garde ce qui n'est pas parti pour le prochain essai.
        pending.current = { ...data, ...pending.current };
        setSave('error');
        const msg = e?.response?.data?.html?.[0] || e?.response?.data?.detail;
        if (msg) toast.error(String(msg));
        throw e;
      })
      .finally(() => { inflight.current = null; });
    inflight.current = p;
    await p.catch(() => {});
  }, [id]);

  const queue = useCallback((data: Partial<DocumentFull>) => {
    pending.current = { ...pending.current, ...data };
    setSave('dirty');
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { void flush(); }, DELAY);
  }, [flush]);

  // Quitter la page (lien, onglet fermé) : on envoie ce qui reste.
  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (!Object.keys(pending.current).length && !inflight.current) return;
      void flush();
      e.preventDefault();
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => { window.removeEventListener('beforeunload', beforeUnload); void flush(); };
  }, [flush]);

  // Ctrl+S : enregistrer tout de suite (et ne pas ouvrir « Enregistrer la page » du navigateur).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); void flush(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flush]);

  const onChange = useCallback((html: string) => { htmlRef.current = html; queue({ html }); }, [queue]);
  const onLayoutChange = useCallback((l: { orientation: Orientation; marges: Marges }) => queue(l), [queue]);
  const onEnteteChange = useCallback((entete: Entete) => { enteteRef.current = entete as Record<string, unknown>; queue({ entete } as Partial<DocumentFull>); }, [queue]);
  const docx = useDocxImport(flush);
  const exportDocx = async () => {
    await flush();
    const t = toast.loading('Conversion en Word…');
    try { await documentsAPI.downloadDocx(id, title); toast.success('Document Word téléchargé', { id: t }); } catch { toast.error('La conversion en Word a échoué.', { id: t }); }
  };

  const commitTitle = () => {
    const t = title.trim() || 'Document sans titre';
    setTitle(t);
    document.title = `${t} · Fidni`;
    if (t !== doc?.title) { setDoc((d) => (d ? { ...d, title: t } : d)); queue({ title: t }); }
  };

  const newDocument = async () => {
    await flush();
    try {
      const d = await documentsAPI.create({ title: 'Document sans titre', html: '' });
      navigate(`/documents/${d.id}`);
    } catch { toast.error('Le document n’a pas pu être créé.'); }
  };
  const duplicate = async () => {
    await flush();
    try {
      const d = await documentsAPI.duplicate(id);
      toast.success('Copie créée');
      navigate(`/documents/${d.id}`);
    } catch { toast.error('La copie n’a pas pu être créée.'); }
  };

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper px-4 text-center">
        <p className="text-[16px] font-semibold text-ink">{loadError === 'introuvable' ? 'Ce document n’existe pas (ou plus).' : 'Le document n’a pas pu se charger.'}</p>
        <div className="flex gap-2">
          {loadError === 'reseau' && <button type="button" onClick={() => window.location.reload()} className="fd-btn-primary min-h-10">Réessayer</button>}
          <Link to="/documents" className="fd-btn-ghost min-h-10">Mes documents</Link>
        </div>
      </div>
    );
  }
  if (!doc) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#e9e6e0]" role="status" aria-label="Ouverture du document">
        <Loader2 className="h-6 w-6 animate-spin text-brand" />
      </div>
    );
  }

  const status = {
    saved: { icon: <Check className="h-3.5 w-3.5" />, text: 'Enregistré' },
    dirty: { icon: <span className="h-1.5 w-1.5 rounded-full bg-white/80" />, text: 'Modifié' },
    saving: { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, text: 'Enregistrement…' },
    error: { icon: <CloudOff className="h-3.5 w-3.5" />, text: 'Non enregistré' },
  }[save];

  const titleBar = (
    <>
      <Link to="/documents" onClick={() => { void flush(); }} title="Mes documents"
        className="inline-flex h-8 items-center gap-1 rounded-lg pl-1 pr-2 text-[13px] font-semibold text-white/90 hover:bg-white/10">
        <ChevronLeft className="h-4 w-4" /> <span className="hidden sm:inline">Mes documents</span>
      </Link>
      <input ref={titleRef} value={title} onChange={(e) => setTitle(e.target.value.slice(0, 200))} onBlur={commitTitle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }}
        aria-label="Nom du document"
        className="min-w-0 max-w-[min(420px,50vw)] flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-center text-[14px] font-semibold text-white placeholder:text-white/60 hover:border-white/30 focus:border-white/60 focus:bg-white/10 focus:outline-none sm:flex-none sm:text-left" />
      {canPublish && (
        <button type="button" onClick={() => setPublishing(true)} title="Publier ce document comme exercice, devoir ou leçon"
          className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/15 px-2.5 text-[12.5px] font-semibold text-white hover:bg-white/25">
          <Send className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Publier sur FIDNI</span>
        </button>
      )}
      <span className={`${canPublish ? 'ml-3' : 'ml-auto'} inline-flex items-center gap-1.5 text-[12px] text-white/85`} role="status">
        {status.icon} {status.text}
        {save === 'error' && (
          <button type="button" onClick={() => { void flush(); }} className="ml-1 inline-flex items-center gap-1 rounded-md bg-white/15 px-2 py-0.5 font-semibold hover:bg-white/25">
            <AlertTriangle className="h-3 w-3" /> Réessayer
          </button>
        )}
      </span>
    </>
  );

  return (
    <div className="fixed inset-0 z-40">
      <WordEditor key={doc.id} initialContent={doc.html} onChange={onChange}
        orientation={doc.orientation} marges={doc.marges} onLayoutChange={onLayoutChange} titleBar={titleBar}
        entete={doc.entete ?? {}} onEnteteChange={onEnteteChange} documentTitle={title}
        file={{
          newDocument,
          duplicate,
          rename: () => titleRef.current?.select(),
          list: () => { void flush().then(() => navigate('/documents')); },
          importDocx: docx.open,
          exportDocx: () => { void exportDocx(); },
          publish: canPublish ? () => setPublishing(true) : undefined,
        }} />
      {docx.input}
      {publishing && canPublish && (
        <PublishDialog html={htmlRef.current} title={title} entete={enteteRef.current} onClose={() => setPublishing(false)} beforeLeave={flush} documentId={id} />
      )}
    </div>
  );
};

export default DocumentEditor;
