import React, { useEffect, useRef, useState } from 'react';
import { Film, Loader2 } from 'lucide-react';
import { ModalShell, FormError, fieldCls } from '@/components/enregistrements/ModalShell';
import { beginVideoUpload, finishVideoUpload, saveParcoursVideo, sendVideoChunk,
  type ParcoursChapter, type ParcoursVideo, type VideoUploadSession } from '@/lib/api/parcoursApi';
import { t } from '@/i18n';

export const ParcoursVideoForm: React.FC<{
  chapter: ParcoursChapter; video?: ParcoursVideo; onClose: () => void; onSaved: () => Promise<void>;
}> = ({ chapter, video, onClose, onSaved }) => {
  const uploaded = !!video && /\/api\/files\/[^/]+\/download\//.test(video.url);
  const [mode, setMode] = useState<'file' | 'link'>(video && !uploaded ? 'link' : 'file');
  const [title, setTitle] = useState(video?.title ?? '');
  const [url, setUrl] = useState(video?.url ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [minutes, setMinutes] = useState(video ? String(Math.floor(video.duration_seconds / 60)) : '');
  const [seconds, setSeconds] = useState(video ? String(video.duration_seconds % 60) : '0');
  const [videoType, setVideoType] = useState(video?.video_type ?? 'lesson');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [percent, setPercent] = useState(0);
  const saving = useRef(false);
  const saved = useRef(false);
  const session = useRef<(VideoUploadSession & { signature: string }) | null>(null);
  const order = useRef(video?.order ?? Math.max(-1, ...chapter.videos.map((v) => v.order)) + 1);
  useEffect(() => {
    if (!file) return;
    const media = document.createElement('video');
    const source = URL.createObjectURL(file);
    media.preload = 'metadata';
    media.onloadedmetadata = () => {
      if (!Number.isFinite(media.duration) || media.duration <= 0) return;
      const duration = Math.ceil(media.duration);
      setMinutes(String(Math.floor(duration / 60)));
      setSeconds(String(duration % 60));
    };
    media.src = source;
    return () => { media.onloadedmetadata = null; media.removeAttribute('src'); media.load(); URL.revokeObjectURL(source); };
  }, [file]);
  const submit = async () => {
    if (saving.current) return;
    const duration = Number(minutes) * 60 + Number(seconds);
    if (!title.trim() || !Number.isInteger(duration) || duration <= 0 || Number(minutes) < 0 || Number(seconds) < 0 || Number(seconds) >= 60) {
      setError(t('Renseigne le titre et une durée supérieure à zéro.'));
      return;
    }
    if (mode === 'file' && !file && !uploaded) { setError(t('Choisis un fichier vidéo.')); return; }
    if (mode === 'link') {
      try { if (!['http:', 'https:'].includes(new URL(url).protocol)) throw Error(); }
      catch { setError(t('Colle un lien vidéo valide commençant par https:// ou http://.')); return; }
    }
    saving.current = true;
    setBusy(true);
    setError('');
    try {
      const input = { path_chapter: chapter.id, title: title.trim(), url: url.trim(), duration_seconds: duration, video_type: videoType, order: order.current };
      if (!saved.current) {
        if (mode === 'link' || !file && uploaded) await saveParcoursVideo(input, video?.id);
        else if (file) {
          const signature = JSON.stringify([input, file.name, file.size, file.lastModified]);
          if (session.current?.signature !== signature) session.current = { ...await beginVideoUpload(file, input, video?.id), signature };
          const upload = session.current;
          while (upload.received < file.size) {
            const offset = upload.received;
            const chunk = file.slice(offset, offset + upload.chunk_size);
            const received = await sendVideoChunk(upload.session, offset, chunk,
              (loaded) => setPercent(Math.min(99, Math.round((offset + loaded) / file.size * 100))));
            if (received <= offset || received > file.size) throw Error('Progression incorrecte');
            upload.received = received;
          }
          await finishVideoUpload(upload.session);
        }
        saved.current = true;
        setPercent(100);
      }
      await onSaved();
    } catch {
      setError(saved.current
        ? t('La vidéo est enregistrée. Réessaie pour actualiser la liste.')
        : t('L’enregistrement a été interrompu. Réessaie pour reprendre l’envoi.'));
    } finally { saving.current = false; setBusy(false); }
  };
  const chooseFile = (selected: File | undefined) => {
    if (!selected) return;
    if (!/\.(mp4|webm)$/i.test(selected.name) || !selected.size || selected.size > 2 * 1024 ** 3) {
      setFile(null);
      session.current = null;
      setError(t('Choisis une vidéo MP4 ou WebM de moins de 2 Go.'));
      return;
    }
    setError('');
    setFile(selected);
    setPercent(0);
    if (!title.trim()) setTitle(selected.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').slice(0, 200));
  };
  return <ModalShell open onClose={() => { if (!saving.current) onClose(); }} labelId="video-parcours-titre"
    title={video ? t('Modifier la vidéo') : t('Ajouter une vidéo')} subtitle={chapter.title} onSubmit={submit}>
    <fieldset disabled={busy || saved.current} className="min-w-0 space-y-4">
      <div role="group" aria-label={t('Source de la vidéo')} className="flex gap-1 rounded-xl bg-paper p-1">
        {(['file', 'link'] as const).map((source) => <button key={source} type="button" aria-pressed={mode === source}
          onClick={() => { setMode(source); setError(''); }}
          className={`min-h-11 flex-1 rounded-lg px-3 text-sm font-semibold ${mode === source ? 'bg-white text-ink shadow-sm' : 'text-ink-soft'}`}>
          {source === 'file' ? t('Depuis mon ordinateur') : t('Avec un lien')}
        </button>)}
      </div>
      {mode === 'file' ? <div>
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-line bg-paper p-5 text-center focus-within:ring-2 focus-within:ring-brand"
          onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (!busy) chooseFile(e.dataTransfer.files[0]); }}>
          <Film className="h-6 w-6 text-gold-strong" />
          <span className="max-w-full break-all text-sm font-semibold text-ink">{file ? file.name : uploaded ? t('Vidéo déjà enregistrée') : t('Dépose ta vidéo ici ou choisis un fichier')}</span>
          <span className="text-xs text-ink-soft">{t('MP4 ou WebM · 2 Go maximum')}</span>
          <span className="mt-1 inline-flex min-h-10 items-center rounded-lg border border-line bg-white px-3 text-sm font-semibold">{uploaded ? t('Remplacer le fichier') : t('Choisir un fichier')}</span>
          <input type="file" accept="video/mp4,video/webm,.mp4,.webm" aria-label={t('Fichier vidéo')}
            className="sr-only"
            onChange={(e) => chooseFile(e.target.files?.[0])} />
        </label>
      </div> : <label className="block text-sm font-medium text-ink">{t('Lien de la vidéo')}
        <input type="url" required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className={fieldCls + ' mt-1.5'} />
        <span className="mt-1 block text-xs font-normal text-ink-soft">{t('YouTube, Vimeo ou lien direct vers une vidéo.')}</span>
      </label>}
      <label className="block text-sm font-medium text-ink">{t('Titre de la vidéo')}
        <input required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} className={fieldCls + ' mt-1.5'} />
      </label>
      <fieldset>
        <legend className="text-sm font-medium text-ink">{t('Durée')}</legend>
        <div className="mt-1.5 grid grid-cols-2 gap-3">
          <label className="text-xs text-ink-soft">{t('Minutes')}<input type="number" min="0" step="1" required value={minutes}
            onChange={(e) => setMinutes(e.target.value)} className={fieldCls + ' mt-1'} /></label>
          <label className="text-xs text-ink-soft">{t('Secondes')}<input type="number" min="0" max="59" step="1" required value={seconds}
            onChange={(e) => setSeconds(e.target.value)} className={fieldCls + ' mt-1'} /></label>
        </div>
        {mode === 'file' && <p className="mt-1 text-xs text-ink-soft">{t('La durée se remplit automatiquement si le navigateur reconnaît la vidéo.')}</p>}
      </fieldset>
      <label className="block text-sm font-medium text-ink">{t('Type de vidéo')}
        <select className={fieldCls + ' mt-1.5'} value={videoType} onChange={(e) => setVideoType(e.target.value)}>
          {[['lesson', 'Cours'], ['introduction', 'Introduction'], ['explanation', 'Explication'], ['demo', 'Exercice corrigé'], ['tips', 'Méthodes et astuces'], ['summary', 'Résumé']].map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}
        </select>
      </label>
    </fieldset>
    {busy && <div className="mt-4" role="status">
      <p className="mb-2 flex items-center gap-2 text-sm text-ink-soft"><Loader2 size={15} className="animate-spin" />
        {mode === 'file' ? t('Envoi de la vidéo · {n} %', { n: percent }) : t('Enregistrement…')}</p>
      {mode === 'file' && <progress value={percent} max={100} aria-label={t('Envoi de la vidéo')} className="h-2 w-full accent-brand" />}
    </div>}
    {error && <FormError>{error}</FormError>}
    <p className="mt-4 text-xs text-ink-soft">{t('Les élèves n’ont pas accès aux parcours pendant leur préparation.')}</p>
    <div className="mt-5 flex justify-end gap-2">
      <button type="button" className="fd-btn-ghost" disabled={busy} onClick={onClose}>{t('Annuler')}</button>
      <button type="submit" className="fd-btn-primary min-h-11" disabled={busy}>{busy ? t('Enregistrement…') : saved.current ? t('Actualiser la liste') : t('Enregistrer la vidéo')}</button>
    </div>
  </ModalShell>;
};
