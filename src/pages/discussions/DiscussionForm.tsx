// /discussions/nouvelle et /discussions/:id/modifier (08/11/2026) : titre, salon, niveau, contenus tagués (leçons,
// exercices, examens), message (formules, photos). « ?contenu=<id> » (onglet « Discussions » d'un contenu) : ce contenu
// est déjà tagué ; « ?salon= » : ce salon est choisi.
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getClassLevels().then((l) => setLevels((l as { id: number | string; name: string }[]).map((x) => ({ id: Number(x.id), name: x.name })))).catch(() => {});
  }, []);
  // Niveau de l'auteur par défaut.
  useEffect(() => {
    if (editing || level) return;
    const own = levelId(user?.profile?.class_level);
    setLevel(own ? String(own) : 'tous');
  }, [user, editing]);  // eslint-disable-line react-hooks/exhaustive-deps

  // Contenu déjà tagué (depuis l'onglet « Discussions » d'un contenu).
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
    if (!editing) return;
    getDiscussion(id!).then((d) => {
      setTitle(d.title); setSalon(d.salon); setTags(d.tags); setBody(d.body); setInitialBody(d.body);
      setLevel(d.class_level ? String(d.class_level.id) : 'tous');
    }).catch(() => setError(t('La discussion n’a pas pu être chargée.')));
  }, [id, editing]);

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

      <div className="space-y-6 rounded-2xl border border-line bg-white p-4 sm:p-6">
        <div>
          <label htmlFor="disc-titre" className={label}>{t('Titre')}</label>
          <input id="disc-titre" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={TITLE_MAX}
            placeholder={t('Ex. : Limite en +∞ : comment lever la forme ∞ − ∞ ?')}
            className="h-12 w-full rounded-xl border border-line bg-white px-3.5 text-[15px] text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" />
          <p className="mt-1 text-end text-[12px] text-ink-faint fd-nums">{cleanTitle.length} / {TITLE_MAX}</p>
        </div>

        <fieldset>
          <legend className={label}>{t('Salon')}</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {SALONS.map((s) => {
              const Ico = s.icon;
              const active = salon === s.key;
              return (
                <label key={s.key}
                  className={`flex cursor-pointer flex-col items-start gap-1.5 rounded-xl border px-3 py-2.5 transition-colors ${
                    active ? 'border-ink bg-[#faf9f7]' : 'border-line hover:border-[#cfc9bf]'}`}>
                  <input type="radio" name="salon" value={s.key} checked={active} onChange={() => setSalon(s.key)} className="sr-only" />
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${s.tone}`}><Ico className="h-4 w-4" /></span>
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

        <div>
          <p className={label}>{t('Message')}</p>
          {initialBody === null ? (
            <div className="h-24 animate-pulse rounded-xl border border-line bg-[#faf9f7]" />
          ) : (
            <MessageComposer initial={initialBody} attachments={!editing} minHeight="140px"
              placeholder={t('Explique ce que tu cherches, ce que tu as essayé… (formules entre $ $, @pseudo pour mentionner)')}
              submitLabel="" onChange={setBody} onFilesChange={setFileIds} />
          )}
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
