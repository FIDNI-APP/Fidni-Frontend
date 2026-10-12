/**
 * Un document ouvert dans l'éditeur « façon Word » (/documents/:id, 12/10/2026), plein écran comme une
 * application : barre de titre (retour, nom modifiable, état d'enregistrement), ruban, feuille A4.
 * Enregistrement automatique 1 s après la dernière frappe ; en quittant la page, ce qui reste part tout
 * de suite (et le navigateur prévient si l'envoi est encore en cours).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Check, ChevronLeft, CloudOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import WordEditor from '@/components/editor/word/WordEditor';
import { documentsAPI, type DocumentFull, type Marges, type Orientation } from '@/lib/api/documentsApi';

type SaveState = 'saved' | 'dirty' | 'saving' | 'error';
const DELAY = 1000;

export const DocumentEditor: React.FC = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [doc, setDoc] = useState<DocumentFull | null>(null);
  const [loadError, setLoadError] = useState<'introuvable' | 'reseau' | null>(null);
  const [title, setTitle] = useState('');
  const [save, setSave] = useState<SaveState>('saved');
  const titleRef = useRef<HTMLInputElement>(null);

  // Modifications pas encore envoyées, regroupées (le dernier état l'emporte).
  const pending = useRef<Partial<DocumentFull>>({});
  const timer = useRef<number | null>(null);
  const inflight = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate('/documents', { replace: true });
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated || !id) return;
    let cancelled = false;
    setDoc(null);
    setLoadError(null);
    documentsAPI.get(id)
      .then((d) => { if (!cancelled) { setDoc(d); setTitle(d.title); document.title = `${d.title} · Fidni`; } })
      .catch((e) => { if (!cancelled) setLoadError(e?.response?.status === 404 ? 'introuvable' : 'reseau'); });
    return () => { cancelled = true; };
  }, [id, isAuthenticated]);

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

  const onChange = useCallback((html: string) => queue({ html }), [queue]);
  const onLayoutChange = useCallback((l: { orientation: Orientation; marges: Marges }) => queue(l), [queue]);

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
      <span className="ml-auto inline-flex items-center gap-1.5 text-[12px] text-white/85" role="status">
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
        file={{
          newDocument,
          duplicate,
          rename: () => titleRef.current?.select(),
          list: () => { void flush().then(() => navigate('/documents')); },
        }} />
    </div>
  );
};

export default DocumentEditor;
