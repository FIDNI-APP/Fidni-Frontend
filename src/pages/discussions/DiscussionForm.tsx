// /discussions/nouvelle et /discussions/:id/modifier (08/11/2026) : une discussion du forum. Titre, salon, niveau, contenus
// tagués (leçons, exercices, examens), message (formules, photos). « ?contenu=<id> » : ce contenu est déjà tagué ;
// « ?salon= » : ce salon est choisi. Un commentaire se modifie sur place, dans l'onglet de son contenu.
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronDown, ChevronLeft, Loader2, Send } from 'lucide-react';
import { Page } from '@/components/space/Page';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/components/auth/AuthController';
import { getClassLevels } from '@/lib/api';
import {
  createDiscussion, getDiscussion, searchContentTags, updateDiscussion, type ContentTag, type Salon,
} from '@/lib/api/discussionsApi';
import { ContentTagPicker } from '@/components/discussions/ContentTagPicker';
import { MessageComposer } from '@/components/discussions/MessageComposer';
import { SALONS } from '@/components/discussions/parts';
import { t } from '@/i18n';

const TITLE_MIN = 6;
const TITLE_MAX = 160;

const levelId = (cl: unknown): number | null => {
  if (cl && typeof cl === 'object' && 'id' in cl) return Number((cl as { id: unknown }).id) || null;
  return cl != null && cl !== '' ? Number(cl) || null : null;
};

export const DiscussionForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  return <DiscussionEditor key={id ?? 'new'} id={id} />;
};

const DiscussionEditor: React.FC<{ id?: string }> = ({ id }) => {
  const editing = !!id;
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { openModal } = useAuthModal();
  const [title, setTitle] = useState('');
  const [salon, setSalon] = useState<Salon>(() => (SALONS.some((s) => s.key === params.get('salon')) ? params.get('salon') as Salon : 'entraide'));
  const [level, setLevel] = useState<string>('');
  const [levels, setLevels] = useState<{ id: number; name: string }[]>([]);
  const [tags, setTags] = useState<ContentTag[]>([]);
  const [body, setBody] = useState('');
  const [initialBody, setInitialBody] = useState<string | null>(editing ? null : '');
  const [fileIds, setFileIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getClassLevels().then((l) => setLevels((l as { id: number | string; name: string }[]).map((x) => ({ id: Number(x.id), name: x.name })))).catch(() => {});
  }, []);
  // Niveau de l'auteur par défaut.
  useEffect(() => {
    if (editing || level || !user) return;
    const own = levelId(user?.profile?.class_level);
    setLevel(own ? String(own) : 'tous');
  }, [user, editing, level]);

  // Contenu déjà tagué (« ?contenu= »).
  useEffect(() => {
    const cid = params.get('contenu');
    if (editing || !cid || !/^\d+$/.test(cid) || !isAuthenticated) return;
    searchContentTags(cid).then((r) => {
      const tag = r.find((x) => String(x.id) === cid);
      if (tag) setTags((prev) => (prev.some((p) => p.id === tag.id) ? prev : [tag, ...prev]));
    }).catch(() => {});
  }, [params, editing, isAuthenticated]);

  // Modifier : la discussion telle qu'elle est.
  useEffect(() => {
    if (!id || !isAuthenticated) return;
    let alive = true;
    setError(null);
    getDiscussion(id).then((d) => {
      if (!alive) return;
      if (d.genre === 'commentaire') { navigate(d.url, { replace: true }); return; }
      setTitle(d.title); setSalon(d.salon); setTags(d.tags); setBody(d.body); setInitialBody(d.body);
      setLevel(d.class_level ? String(d.class_level.id) : 'tous');
    }).catch(() => { if (alive) setError(t('La discussion n’a pas pu être chargée.')); });
    return () => { alive = false; };
  }, [id, isAuthenticated, loadAttempt, navigate]);

  if (!isLoading && !isAuthenticated) {
    return (
      <Page width="narrow">
        <div className="mx-auto max-w-md rounded-2xl border border-line bg-white p-8 text-center">
          <p className="fd-display text-[20px] text-ink">{t('Connecte-toi pour lancer une discussion.')}</p>
          <button type="button" onClick={() => openModal('discussion')} className="fd-btn-primary mt-6 inline-flex min-h-10">{t('Se connecter')}</button>
        </div>
      </Page>
    );
  }

  if (isLoading || (editing && initialBody === null)) {
    return (
      <Page width="narrow">
        {error ? (
          <div role="alert" className="space-y-3 border-t-2 border-ink py-4">
            <p className="font-semibold text-ink">{error}</p>
            <button type="button" className="fd-btn-ghost min-h-10" onClick={() => setLoadAttempt((n) => n + 1)}>{t('Réessayer')}</button>
            <Link to="/discussions" className="ms-3 text-sm text-brand-hover">{t('Discussions')}</Link>
          </div>
        ) : <div role="status" aria-label={t('Chargement')} className="h-32 animate-pulse rounded-xl bg-white" />}
      </Page>
    );
  }
  const cleanTitle = title.replace(/\s+/g, ' ').trim();
  const ready = cleanTitle.length >= TITLE_MIN && cleanTitle.length <= TITLE_MAX && !busy;

  const submit = async () => {
    if (!ready) return;
    setBusy(true);
    setError(null);
    const input = {
      title: cleanTitle, body, salon, class_level: level === 'tous' || !level ? null : Number(level),
      content_ids: tags.map((x) => x.id),
    };
    try {
      const d = editing ? await updateDiscussion(Number(id), input) : await createDiscussion({ ...input, file_ids: fileIds });
      navigate(`/discussions/${d.id}`, { replace: editing });
    } catch (e) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      setError(status === 429 ? t('Beaucoup de discussions d’un coup : réessaie dans un moment.')
        : t('La discussion n’a pas pu être publiée. Vérifie ta connexion et réessaie.'));
    } finally {
      setBusy(false);
    }
  };

  const label = 'mb-1.5 block text-[13px] font-semibold text-ink';

  return (
    <Page width="narrow">
      <Link to={editing ? `/discussions/${id}` : '/discussions'}
        className="mb-3 inline-flex min-h-10 items-center gap-1 rounded-lg pe-2 text-[13px] font-medium text-ink-faint transition-colors hover:text-ink">
        <ChevronLeft className="h-4 w-4 rtl:rotate-180" /> {editing ? t('La discussion') : t('Discussions')}
      </Link>
      <h1 className="fd-display mb-6 text-ink" style={{ fontSize: 'clamp(26px, 3vw, 34px)', lineHeight: 1.1 }}>
        {editing ? t('Modifier la discussion') : t('Nouvelle discussion')}
      </h1>

      <div className="space-y-5 border-t-2 border-ink pt-5">
        <div>
          <label htmlFor="disc-titre" className={label}>{t('Titre')}</label>
          <input id="disc-titre" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={TITLE_MAX} minLength={TITLE_MIN} aria-describedby="disc-aide-titre"
            placeholder={t('Ex. : Limite en +∞ : comment lever la forme ∞ − ∞ ?')}
            className="h-12 w-full rounded-xl border border-line bg-white px-3.5 text-[15px] text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" />
          <p id="disc-aide-titre" className="fd-nums mt-1 flex justify-between gap-2 text-xs text-ink-soft">
            <span>{t('{n} caractères minimum', { n: TITLE_MIN })}</span><span>{cleanTitle.length} / {TITLE_MAX}</span>
          </p>
        </div>

        <div>
          <p className={label}>{t('Message')}</p>
          <MessageComposer initial={initialBody ?? ''} attachments={!editing} minHeight="140px"
            placeholder={t('Ton message… (formules entre $ $, @pseudo pour mentionner)')}
            submitLabel="" onChange={setBody} onFilesChange={setFileIds} />
        </div>

        <fieldset>
          <legend className={label}>{t('Salon')}</legend>
          <div className="flex flex-wrap gap-2">
            {SALONS.map((s) => {
              const Ico = s.icon;
              const active = salon === s.key;
              return (
                <label key={s.key}
                  className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 focus-within:ring-2 focus-within:ring-brand transition-colors ${
                    active ? 'border-brand bg-brand-soft' : 'border-line bg-white hover:border-ink-soft'}`}>
                  <input type="radio" name="salon" value={s.key} checked={active} onChange={() => setSalon(s.key)} className="sr-only" />
                  <span className={`flex h-5 w-5 items-center justify-center rounded ${s.tone}`}><Ico className="h-4 w-4" /></span>
                  <span className={`text-[13.5px] font-semibold ${active ? 'text-ink' : 'text-ink-soft'}`}>{t(s.label)}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div>
          <label htmlFor="disc-niveau" className={label}>{t('Niveau')}</label>
          <span className="relative inline-block">
            <select id="disc-niveau" value={level} onChange={(e) => setLevel(e.target.value)}
              className="h-11 appearance-none rounded-xl border border-line bg-white ps-3 pe-9 text-[14px] font-medium text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20">
              <option value="tous">{t('Tous les niveaux')}</option>
              {levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
          </span>
        </div>

        <div>
          <p className={label}>{t('Leçons, exercices ou examens concernés')}</p>
          <ContentTagPicker value={tags} onChange={setTags} />
        </div>

        {error && <p role="alert" className="rounded-xl border border-[#f0d4cf] bg-[#fbf1ef] px-3 py-2.5 text-[13px] text-[#9c3b2e]">{error}</p>}

        <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
          <Link to={editing ? `/discussions/${id}` : '/discussions'} className="fd-btn-ghost inline-flex min-h-11">{t('Annuler')}</Link>
          <button type="button" onClick={submit} disabled={!ready}
            className="fd-btn-primary inline-flex min-h-11 items-center gap-2 px-5 disabled:cursor-not-allowed disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {editing ? t('Enregistrer') : t('Publier')}
          </button>
        </div>
      </div>
    </Page>
  );
};

export default DiscussionForm;
