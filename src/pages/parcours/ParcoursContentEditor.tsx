import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Check, ChevronRight, Film, Pencil, Plus, RotateCcw } from 'lucide-react';
import { Page, PageHeader, EmptyState, CardsSkeleton } from '@/components/space/Page';
import { ModalShell, FormError, fieldCls } from '@/components/enregistrements/ModalShell';
import { useAuth } from '@/contexts/AuthContext';
import { isModerator } from '@/lib/features';
import { getChapters } from '@/lib/api';
import { addParcoursChapter, getParcours, type Parcours, type ParcoursChapter, type ParcoursVideo } from '@/lib/api/parcoursApi';
import { formatDuration, sameId } from '@/components/parcours/progression';
import { ParcoursVideoForm } from '@/components/parcours/admin/ParcoursVideoForm';
import { t } from '@/i18n';
import type { ChapterModel } from '@/types';

function AddChapter({ path, onClose, onAdded }: { path: Parcours; onClose: () => void; onAdded: (id: string) => Promise<void> }) {
  const [choices, setChoices] = useState<ChapterModel[] | null>(null);
  const [chosen, setChosen] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [attempt, retry] = useState(0);
  const saving = useRef(false);
  useEffect(() => {
    let active = true;
    setError('');
    getChapters(String(path.subject.id), path.class_level.map((l) => String(l.id)), [])
      .then((list) => {
        if (!active) return;
        const available = list.filter((c) => !path.path_chapters.some((p) => sameId(p.chapter?.id, c.id)));
        setChoices(available);
        setChosen(available[0] ? String(available[0].id) : '');
      }).catch(() => { if (active) setError(t('Les chapitres n’ont pas pu être chargés.')); });
    return () => { active = false; };
  }, [path, attempt]);
  const submit = async () => {
    const chapter = choices?.find((c) => String(c.id) === chosen);
    if (!chapter || saving.current) return;
    saving.current = true;
    setBusy(true);
    setError('');
    try {
      const latest = await getParcours(path.id);
      if (!latest.path_chapters.some((c) => sameId(c.chapter?.id, chapter.id))) {
        await addParcoursChapter(latest, chapter);
      }
      await onAdded(String(chapter.id));
      onClose();
    } catch { setError(t('Le chapitre n’a pas pu être ajouté. Réessaie.')); }
    finally { saving.current = false; setBusy(false); }
  };
  return <ModalShell open onClose={() => { if (!busy) onClose(); }} labelId="ajouter-chapitre-titre"
    title={t('Ajouter un chapitre')} subtitle={path.title} onSubmit={submit}>
    {choices ? choices.length > 0 ? <label className="block text-sm font-medium text-ink">
      {t('Chapitre du programme')}
      <select className={fieldCls + ' mt-2'} value={chosen} onChange={(e) => setChosen(e.target.value)} disabled={busy}>
        {choices.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
    </label> : <p className="text-sm text-ink-soft">{t('Tous les chapitres de ce programme sont déjà dans le parcours.')}</p>
      : !error && <p role="status">{t('Chargement')}</p>}
    <p className="mt-3 text-sm text-ink-soft">{t('Le chapitre sera ajouté à la suite. Tu pourras ensuite y déposer tes vidéos.')}</p>
    {error && <FormError>{error}</FormError>}
    {!choices && error && <button type="button" className="fd-btn-ghost mt-3" onClick={() => retry((n) => n + 1)}>{t('Réessayer')}</button>}
    <div className="mt-5 flex justify-end gap-2">
      <button type="button" className="fd-btn-ghost" disabled={busy} onClick={onClose}>{t('Annuler')}</button>
      <button className="fd-btn-primary" disabled={!chosen || busy}>{busy ? t('Enregistrement…') : t('Ajouter le chapitre')}</button>
    </div>
  </ModalShell>;
}

function ContentEditor({ id }: { id: string }) {
  const [params, setParams] = useSearchParams();
  const [path, setPath] = useState<Parcours | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, retry] = useState(0);
  const [newChapter, setNewChapter] = useState(params.get('ajouter') === 'chapitre');
  const [videoForm, setVideoForm] = useState<{ chapter: ParcoursChapter; video?: ParcoursVideo } | null>(null);
  const [notice, setNotice] = useState('');
  const reload = async () => {
    const data = await getParcours(id);
    setPath(data);
    return data;
  };
  useEffect(() => {
    let active = true;
    setFailed(false);
    getParcours(id).then((data) => { if (active) setPath(data); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [id, attempt]);
  const returnTo = '/parcours?parcours=' + id;
  const chapters = [...(path?.path_chapters ?? [])].sort((a, b) => a.order - b.order);
  const selected = chapters.find((c) => sameId(c.id, params.get('chapitre'))) ?? chapters[0];
  const choose = (value: string) => {
    setNotice('');
    setParams({ chapitre: value }, { replace: true });
  };
  const chapterAdded = async (chapterId: string) => {
    const data = await reload();
    const added = data.path_chapters.find((c) => sameId(c.chapter?.id, chapterId));
    if (added) choose(String(added.id));
    setNotice(t('Chapitre ajouté. Tu peux maintenant ajouter ses vidéos.'));
  };
  const videoSaved = async () => {
    await reload();
    setNotice(t('Vidéo enregistrée.'));
    setVideoForm(null);
  };
  return <Page width="wide">
    <PageHeader eyebrow={t('Gestion des parcours')} title={t('Chapitres et vidéos')} subtitle={path?.title}
      back={{ to: returnTo, label: t('Retour au parcours') }}
      actions={path && <button type="button" onClick={() => setNewChapter(true)} className="fd-btn-ghost min-h-11"><Plus size={16} />{t('Ajouter un chapitre')}</button>} />
    {failed ? <div role="alert" className="space-y-3 rounded-xl border border-line bg-white p-5">
      <p>{t('Le parcours n’a pas pu se charger. Vérifie ta connexion.')}</p>
      <button type="button" onClick={() => retry((n) => n + 1)} className="fd-btn-ghost"><RotateCcw size={16} />{t('Réessayer')}</button>
    </div> : !path ? <CardsSkeleton n={3} /> : <>
      <p className="mb-5 max-w-2xl text-sm text-ink-soft">{t('Choisis un chapitre, puis ajoute tes vidéos dans l’ordre où elles seront regardées.')}</p>
      <p role="status" className={notice ? 'mb-4 flex items-center gap-2 text-sm font-medium text-brand-hover' : 'sr-only'}>{notice && <Check size={16} />}{notice}</p>
      {chapters.length === 0 ? <EmptyState icon={Film} title={t('Ajoute le premier chapitre')}
        text={t('Tu pourras ensuite y déposer tes vidéos ou coller leurs liens.')}
        action={<button type="button" className="fd-btn-primary" onClick={() => setNewChapter(true)}><Plus size={16} />{t('Ajouter un chapitre')}</button>} />
        : <div className="grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="min-w-0 lg:sticky lg:top-24">
            <label className="block text-sm font-semibold text-ink lg:hidden">{t('Chapitre')}
              <select className={fieldCls + ' mt-2'} value={selected?.id ?? ''} onChange={(e) => choose(e.target.value)}>
                {chapters.map((c) => <option key={c.id} value={c.id}>{c.title} ({c.videos.length})</option>)}
              </select>
            </label>
            <nav aria-label={t('Chapitres du parcours')} className="hidden space-y-1 lg:block">
              {chapters.map((c, i) => <button key={c.id} type="button" aria-current={sameId(c.id, selected?.id) ? 'true' : undefined}
                onClick={() => choose(String(c.id))}
                className={`flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-3 text-start ${sameId(c.id, selected?.id) ? 'bg-white border border-gold-line' : 'border border-transparent hover:bg-white'}`}>
                <span className="fd-nums text-sm text-gold-strong">{i + 1}</span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-ink">{c.title}</span>
                  <span className="block text-xs text-ink-soft">{t('{n} vidéos', { n: c.videos.length })}</span></span>
                <ChevronRight size={15} className="shrink-0 rtl:rotate-180" />
              </button>)}
            </nav>
          </aside>
          {selected && <section className="min-w-0 rounded-2xl border border-line bg-white p-4 sm:p-6" aria-labelledby="contenu-chapitre">
            <header className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <h2 id="contenu-chapitre" className="fd-display min-w-0 text-xl text-ink">{selected.title}</h2>
              <button type="button" className="fd-btn-primary min-h-11" onClick={() => setVideoForm({ chapter: selected })}>
                <Plus size={16} />{t('Ajouter une vidéo')}
              </button>
            </header>
            {selected.videos.length === 0 ? <div className="border-t border-line py-10 text-center">
              <Film className="mx-auto mb-3 h-6 w-6 text-gold-strong" />
              <p className="font-semibold text-ink">{t('Ce chapitre attend sa première vidéo')}</p>
              <p className="mt-2 text-sm text-ink-soft">{t('Dépose un fichier vidéo ou colle un lien YouTube, Vimeo ou vidéo.')}</p>
            </div> : <ol className="divide-y divide-line border-y border-line">
              {[...selected.videos].sort((a, b) => a.order - b.order).map((v, i) => <li key={v.id} className="flex items-start gap-3 py-4">
                <span className="fd-nums flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-paper text-sm text-ink-soft">{i + 1}</span>
                <span className="min-w-0 flex-1"><span className="block break-words font-semibold text-ink">{v.title}</span>
                  <span className="mt-1 block text-sm text-ink-soft">{formatDuration(v.duration_seconds)}</span></span>
                <button type="button" className="fd-btn-ghost min-h-10 shrink-0 px-2 sm:px-3" onClick={() => setVideoForm({ chapter: selected, video: v })}
                  aria-label={t('Modifier {titre}', { titre: v.title })}><Pencil size={15} /><span className="hidden sm:inline">{t('Modifier')}</span></button>
              </li>)}
            </ol>}
            <Link to={returnTo + '&chapitre=' + selected.id} className="mt-5 inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-brand-hover">
              {t('Voir ce chapitre dans le parcours')}<ChevronRight size={15} className="rtl:rotate-180" />
            </Link>
          </section>}
        </div>}
      {newChapter && <AddChapter path={path} onClose={() => setNewChapter(false)} onAdded={chapterAdded} />}
      {videoForm && <ParcoursVideoForm chapter={videoForm.chapter} video={videoForm.video} onClose={() => setVideoForm(null)} onSaved={videoSaved} />}
    </>}
  </Page>;
}

export const ParcoursContentEditor: React.FC = () => {
  const { id = '' } = useParams();
  const { user, isLoading } = useAuth();
  if (isLoading) return <Page><CardsSkeleton n={2} /></Page>;
  if (!isModerator(user)) return <Page><p>{t('Accès réservé à l’équipe.')}</p></Page>;
  return <ContentEditor key={id} id={id} />;
};
