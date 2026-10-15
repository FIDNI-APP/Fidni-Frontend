// « Ton objectif » (13/10/2026) : le bloc le plus visible de « Ma progression ». Une seule priorité, un titre, une
// ligne, un bouton et jusqu'à 5 exercices ciblés (3 sur téléphone), qu'on peut ranger dans une fiche. Le « pourquoi »
// et l'avis restent repliés (peu de texte à l'écran). Backend : apps/users/objectif.py.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowRight, CalendarClock, ChevronDown, ClipboardList, Clock, Compass, Loader2 } from 'lucide-react';
import { DifficultyChip } from '@/components/content/listing/ListingParts';
import { quickAddManyToRevision } from '@/lib/api/revisionListApi';
import { trackAction } from '@/lib/usage';
import { actionUrl } from './links';
import { ETAT, ProgresIcon } from './etat';
import { Avis } from './Avis';
import { t } from '@/i18n';
import type { ActionKind, Objectif as ObjectifData } from './types';

const LABEL: Record<ActionKind, string> = {
  entrainer: 'Commencer', cours: 'Revoir le cours', quiz: 'Passer le quiz', ds_blanc: 'Lancer le DS blanc',
  nationaux: 'Sujets du Bac', devoirs: 'Devoirs du chapitre',
};

export function EtatPill({ etat, enProgres = false, size = 'md' }: { etat: keyof typeof ETAT; enProgres?: boolean; size?: 'sm' | 'md' }) {
  const e = ETAT[etat];
  const Icon = e.icon;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border font-semibold ${e.pill} ${size === 'sm' ? 'px-2 py-0.5 text-[11.5px]' : 'px-2.5 py-1 text-[12.5px]'}`}>
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} aria-hidden /> {t(e.label)}
      {enProgres && <span className="ms-0.5 inline-flex items-center gap-0.5 font-medium"><ProgresIcon className="h-3 w-3" aria-hidden /> {t('en progrès')}</span>}
    </span>
  );
}

export function Objectif({ data, className = '' }: { data: ObjectifData; className?: string }) {
  const navigate = useNavigate();
  const [why, setWhy] = useState(false);
  const [more, setMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const ch = data.chapitre;
  const exercices = data.exercices ?? [];
  const primary = actionUrl(data.action, ch);

  const fiche = async () => {
    setSaving(true);
    trackAction('prog-fiche');
    try {
      const r = await quickAddManyToRevision(exercices.map((x) => x.id), ch ? `Objectif : ${ch.name}` : 'Mon objectif');
      if (r.list_id) navigate(`/profile/revision-lists/${r.list_id}`);
    } catch {
      toast.error(t('La fiche n’a pas pu être créée.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section data-tour="prog-resume" aria-labelledby="objectif-titre"
      className={`flex flex-col self-start rounded-2xl border border-line bg-white p-5 shadow-[0_1px_0_rgba(20,18,16,.03)] sm:p-6 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.1em] text-gold-strong">
          <Compass className="h-3.5 w-3.5" aria-hidden /> {t('Ton objectif')}
        </p>
        {data.ds && (
          <span className="inline-flex items-center gap-1 rounded-full bg-gold-soft px-2 py-0.5 text-[11.5px] font-semibold text-[#8a6318]">
            <CalendarClock className="h-3 w-3" aria-hidden /> {t('DS {quand}', { quand: data.ds.quand })}
          </span>
        )}
      </div>
      <h2 id="objectif-titre" className="fd-display mt-2.5 text-[24px] leading-tight text-ink sm:text-[27px]"><bdi>{data.titre}</bdi></h2>
      <p className="mt-1 text-[14px] text-ink-faint"><bdi>{data.phrase}</bdi></p>

      <div className="mt-4">
        <Link to={exercices.length && data.action.kind === 'entrainer' ? exercices[0].url : primary}
          onClick={() => trackAction('prog-objectif')} className="fd-btn-primary min-h-11 px-5">
          {t(LABEL[data.action.kind])} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {exercices.length > 0 && (
        <div className="mt-5">
          {/* Téléphone et tablette : la liste se déplie (l'objectif et « Ma progression » restent à l'écran). */}
          <button type="button" onClick={() => setMore((v) => !v)} aria-expanded={more}
            className="flex min-h-10 w-full items-center justify-between rounded-xl border border-line px-3.5 text-[13.5px] font-semibold text-ink-soft lg:hidden">
            {exercices.length > 1 ? t('{n} exercices', { n: exercices.length }) : t('{n} exercice', { n: exercices.length })}
            <ChevronDown className={`h-4 w-4 transition-transform ${more ? 'rotate-180' : ''}`} />
          </button>
          <div className={`${more ? 'mt-2 block' : 'hidden'} lg:block`}>
            <ol className="divide-y divide-line overflow-hidden rounded-xl border border-line">
              {exercices.map((x, i) => (
                <li key={x.id}>
                  <Link to={x.url} onClick={() => trackAction('prog-objectif-exercice')}
                    className="flex min-h-11 items-center gap-3 px-3.5 py-2 transition-colors hover:bg-paper">
                    <span className="fd-nums w-4 shrink-0 text-[12px] text-ink-faint">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-ink">{x.title}</span>
                    <span className="hidden shrink-0 sm:inline-flex"><DifficultyChip difficulty={x.difficulty} plain /></span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-[12px] text-ink-faint"><Clock className="h-3 w-3" aria-hidden />{t('{m} min', { m: x.minutes })}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden />
                  </Link>
                </li>
              ))}
            </ol>
            {exercices.length > 1 && (
              <button type="button" onClick={fiche} disabled={saving}
                className="mt-1.5 inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-[13px] font-medium text-ink-soft hover:bg-paper hover:text-ink disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />} {t('En faire une fiche')}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="pt-3">
        <button type="button" onClick={() => setWhy((v) => !v)} aria-expanded={why}
          className="inline-flex min-h-9 items-center gap-1 text-[13px] font-medium text-ink-faint hover:text-ink">
          {t('Pourquoi ?')} <ChevronDown className={`h-4 w-4 transition-transform ${why ? 'rotate-180' : ''}`} />
        </button>
        {why && (
          <ul className="mt-1.5 space-y-1.5 rounded-xl bg-paper px-4 py-3 text-[13.5px] leading-relaxed text-ink-soft">
            {data.pourquoi.map((p) => <li key={p} className="flex gap-2"><span aria-hidden className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-ink-faint" />{p}</li>)}
          </ul>
        )}
        {/* L'avis vient avec « Pourquoi ? » (replié : moins de texte à l'écran). */}
        {why && <Avis sujet={`objectif-${data.type}`} cle={String(ch?.id ?? data.ds?.id ?? 0)} className="mt-3" />}
      </div>
    </section>
  );
}
