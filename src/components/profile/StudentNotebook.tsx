/**
 * Liseuse d'un cahier de cours (/notebooks?nb=<id>[&chapitre=<id>]) : les chapitres à gauche (sur téléphone,
 * un sélecteur en haut qui ouvre une feuille), la leçon sur sa feuille à droite. Le chapitre ouvert est gardé
 * dans l'adresse ; sans chapitre, le premier qui a des leçons s'ouvre. La liste des cahiers vit dans
 * Mes enregistrements (/enregistrements?onglet=cahiers) : /notebooks seul y mène (App.tsx).
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { BookMarked, ChevronLeft, Printer, RotateCcw } from 'lucide-react';
import { api } from '@/lib/api/apiClient';
import { normalizeNotebookPayload } from '@/lib/api/notebookApi';
import { hubPath } from '@/lib/api/hubApi';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { EmptyState } from '@/components/space/Page';
import NotebookSections from '@/components/notebook/NotebookSections';
import SectionContent from '@/components/notebook/SectionContent';
import { plural, sameId, splitSections, summarize, type NbNotebook } from '@/components/notebook/notebookModel';

const BACK = '/enregistrements?onglet=cahiers';

const StudentNotebook: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const nbId = params.get('nb');
  const chapterParam = params.get('chapitre');
  const [notebook, setNotebook] = useState<NbNotebook | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'missing'>('loading');
  const { setCrumbs } = useBreadcrumb();

  // La liseuse remplit exactement ce que laisse le cadre du site : sous la barre du haut (et un éventuel
  // bandeau), au-dessus de la barre d'onglets du téléphone. Mesuré, car ce qui est au-dessus varie.
  const paneRef = useRef<HTMLDivElement>(null);
  const [paneHeight, setPaneHeight] = useState('calc(100dvh - 60px - var(--fd-tabbar-h, 0px))');
  useLayoutEffect(() => {
    const el = paneRef.current;
    if (!el) return;
    const measure = () => {
      const top = el.getBoundingClientRect().top + window.scrollY;
      setPaneHeight(`calc(100dvh - ${Math.round(top)}px - var(--fd-tabbar-h, 0px))`);
    };
    measure();
    window.addEventListener('resize', measure);
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    return () => { window.removeEventListener('resize', measure); observer.disconnect(); };
  }, [status]);

  const load = useCallback(async (quiet = false) => {
    if (!nbId) return;
    if (!quiet) setStatus('loading');
    try {
      const r = await api.get(`/notebooks/${nbId}/`);
      setNotebook(normalizeNotebookPayload(r.data as NbNotebook));
      setStatus('ready');
    } catch (e) {
      const code = (e as { response?: { status?: number } })?.response?.status;
      if (!quiet) setStatus(code === 404 ? 'missing' : 'error');
    }
  }, [nbId]);

  useEffect(() => { load(); }, [load]);

  // Fil d'Ariane : Mes enregistrements › <cahier>.
  useEffect(() => {
    if (!nbId) return;
    setCrumbs([{ label: 'Mes enregistrements', to: BACK }, { label: notebook?.title ?? 'Cahier' }], '/enregistrements');
  }, [nbId, notebook?.title, setCrumbs]);
  useEffect(() => () => setCrumbs(null), [setCrumbs]);

  if (!nbId) return <Navigate to={BACK} replace />;

  const { filled } = splitSections(notebook);
  const active = filled.find((s) => sameId(s.id, chapterParam)) ?? filled[0] ?? null;
  const selectChapter = (id: string | number) => {
    const next = new URLSearchParams(params);
    next.set('chapitre', String(id));
    setParams(next, { replace: true });
  };
  const stats = notebook ? summarize(notebook) : null;
  const levelSlug = notebook?.class_level?.slug;

  return (
    <div ref={paneRef} className="flex flex-col overflow-hidden border-t border-line bg-paper" style={{ height: paneHeight }}>
      {/* En-tête du cahier (ordinateur ; sur téléphone, la barre du haut montre déjà « ‹ Mes enregistrements » et le titre) */}
      {notebook && <h1 className="sr-only md:hidden">{notebook.title}</h1>}
      <header className="hidden shrink-0 items-center gap-3 border-b border-line bg-white py-2 pl-3 pr-4 md:flex">
        <Link to={BACK} aria-label="Retour à mes cahiers"
          className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center gap-1 rounded-xl px-1.5 text-[13px] font-medium text-ink-faint transition-colors hover:bg-[#f7f6f3] hover:text-ink sm:justify-start sm:pr-3">
          <ChevronLeft className="h-5 w-5" /> <span className="hidden sm:inline">Mes cahiers</span>
        </Link>
        <span className="hidden h-7 w-px bg-line sm:block" aria-hidden />
        <div className="min-w-0 flex-1">
          {notebook ? (
            <>
              <h1 className="fd-display truncate text-[18px] leading-tight text-ink sm:text-[21px]">{notebook.title}</h1>
              <p className="truncate text-[12px] text-ink-faint">
                {notebook.subject?.name} · {notebook.class_level?.name}
                {stats && <> · <span className="fd-nums">{stats.lessons === 0 ? 'vide' : plural(stats.lessons, 'leçon')}</span></>}
              </p>
            </>
          ) : status === 'loading' ? (
            <div className="animate-pulse" aria-hidden>
              <div className="h-5 w-48 max-w-full rounded bg-[#efece6]" />
              <div className="mt-1.5 h-3 w-32 rounded bg-[#f2f1ee]" />
            </div>
          ) : <h1 className="fd-display text-[18px] text-ink">Cahier</h1>}
        </div>
        {notebook && (
          <Link to={`/notebooks/${notebook.id}/pdf`} data-tour="cahier-imprimer" aria-label="Imprimer le cahier" title="Imprimer le cahier"
            className="fd-btn-ghost min-h-10 min-w-10 shrink-0 justify-center px-2.5 sm:px-3.5">
            <Printer className="h-4 w-4" /> <span className="hidden sm:inline">Imprimer</span>
          </Link>
        )}
      </header>

      {status === 'loading' ? (
        <div className="flex min-h-0 flex-1" role="status" aria-label="Chargement du cahier">
          <div className="hidden w-[264px] shrink-0 flex-col gap-2 border-r border-line bg-white p-4 md:flex">
            {[70, 55, 80, 45].map((w, i) => <div key={i} className="h-8 animate-pulse rounded-xl bg-[#f2f1ee]" style={{ width: `${w}%` }} />)}
          </div>
          <div className="flex flex-1 flex-col gap-3 bg-white p-6 pl-16">
            {['w-3/4 h-6', 'w-1/2', 'w-5/6', 'w-full h-24 mt-3', 'w-2/3'].map((c, i) => (
              <div key={i} className={`h-4 animate-pulse rounded bg-[#efece6] ${c}`} />
            ))}
          </div>
        </div>
      ) : status !== 'ready' || !notebook ? (
        <div className="flex flex-1 items-start justify-center overflow-y-auto p-4 sm:p-8">
          <div className="w-full max-w-lg">
            {status === 'missing' ? (
              <EmptyState icon={BookMarked} tone="ink" title="Ce cahier n’existe plus"
                text="Il a peut-être été supprimé. Tes autres cahiers t’attendent dans Mes enregistrements."
                action={<Link to={BACK} className="fd-btn-primary min-h-10">Voir mes cahiers</Link>} />
            ) : (
              <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-[#f0d5d1] bg-[#fbecea] px-4 py-3">
                <p className="flex-1 text-[13.5px] font-medium text-[#a23b34]">Ton cahier n’a pas pu se charger. Vérifie ta connexion.</p>
                <button type="button" onClick={() => load()} className="fd-btn-ghost min-h-10"><RotateCcw className="h-4 w-4" /> Réessayer</button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <div data-tour="cahier-sections" className="shrink-0 md:h-full">
            <NotebookSections notebook={notebook} activeId={active?.id ?? null} onSelect={selectChapter}
              printTo={`/notebooks/${notebook.id}/pdf`} />
          </div>
          <div data-tour="cahier-contenu" className="flex min-h-0 min-w-0 flex-1 flex-col bg-white">
            {active ? (
              <SectionContent key={active.id} notebookId={notebook.id} section={active} onRemoved={() => load(true)} />
            ) : (
              <div className="flex-1 overflow-y-auto bg-paper p-4 sm:p-8">
                <div className="mx-auto max-w-lg">
                  <EmptyState icon={BookMarked} title="Ton cahier est encore vide"
                    text="Ouvre une leçon et touche « Ajouter à mon cahier » : elle vient se ranger ici, dans son chapitre."
                    action={(
                      <Link to={levelSlug ? hubPath('lessons', levelSlug) : '/lessons'} className="fd-btn-primary min-h-10">
                        Voir les leçons de {notebook.class_level?.name || 'mon niveau'}
                      </Link>
                    )} />
                  <p className="mt-4 text-center text-[12.5px] text-ink-faint">
                    Ou touche un chapitre <span className="md:hidden">ci-dessus</span><span className="hidden md:inline">à gauche</span> pour trouver ses leçons.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentNotebook;
