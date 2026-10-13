// « Ton prochain objectif » (13/10/2026) : le bloc le plus visible de « Ma progression ». Une seule priorité,
// pourquoi elle a été choisie (les observations, dépliables), un bouton pour commencer, et jusqu'à 5 exercices
// ciblés (3 sur téléphone), qu'on peut ranger dans une fiche. Backend : apps/users/objectif.py.
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
import type { ActionKind, Objectif as ObjectifData } from './types';

const LABEL: Record<ActionKind, string> = {
  entrainer: 'Commencer', cours: 'Revoir le cours', quiz: 'Passer le quiz', ds_blanc: 'Lancer le DS blanc',
  nationaux: 'Sujets du Bac', devoirs: 'Devoirs du chapitre',
};
const SECONDARY: Record<ActionKind, string> = {
  entrainer: 'Ou des exercices faciles', cours: 'Ou le cours d’abord', quiz: 'Le quiz du chapitre', ds_blanc: 'Le DS blanc',
  nationaux: 'Ou des sujets du Bac', devoirs: 'Ou des devoirs du chapitre',
};

export function EtatPill({ etat, enProgres = false, size = 'md' }: { etat: keyof typeof ETAT; enProgres?: boolean; size?: 'sm' | 'md' }) {
  const e = ETAT[etat];
  const Icon = e.icon;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border font-semibold ${e.pill} ${size === 'sm' ? 'px-2 py-0.5 text-[11.5px]' : 'px-2.5 py-1 text-[12.5px]'}`}>
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} aria-hidden /> {e.label}
      {enProgres && <span className="ml-0.5 inline-flex items-center gap-0.5 font-medium"><ProgresIcon className="h-3 w-3" aria-hidden /> en progrès</span>}
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
  const secondary = data.secondaire ? actionUrl(data.secondaire, ch) : null;

  const fiche = async () => {
    setSaving(true);
    trackAction('prog-fiche');
    try {
      const r = await quickAddManyToRevision(exercices.map((x) => x.id), ch ? `Objectif : ${ch.name}` : 'Mon objectif');
      if (r.list_id) navigate(`/profile/revision-lists/${r.list_id}`);
    } catch {
      toast.error('La fiche n’a pas pu être créée.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section data-tour="prog-resume" aria-labelledby="objectif-titre"
      className={`flex flex-col rounded-2xl border border-line bg-white p-5 shadow-[0_1px_0_rgba(20,18,16,.03)] sm:p-6 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.1em] text-gold-strong">
          <Compass className="h-3.5 w-3.5" aria-hidden /> Ton prochain objectif
        </p>
        {data.ds && (
          <span className="inline-flex items-center gap-1 rounded-full bg-gold-soft px-2 py-0.5 text-[11.5px] font-semibold text-[#8a6318]">
            <CalendarClock className="h-3 w-3" aria-hidden /> DS {data.ds.quand}
          </span>
        )}
      </div>
      {ch && <div className="mt-3"><EtatPill etat={ch.etat} enProgres={ch.en_progres} /></div>}
      <h2 id="objectif-titre" className="fd-display mt-2 text-[24px] leading-tight text-ink sm:text-[27px]">{data.titre}</h2>
      <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-soft">{data.phrase}</p>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link to={exercices.length && data.action.kind === 'entrainer' ? exercices[0].url : primary}
          onClick={() => trackAction('prog-objectif')} className="fd-btn-primary min-h-11 px-5">
          {LABEL[data.action.kind]} <ArrowRight className="h-4 w-4" />
        </Link>
        {secondary && data.secondaire && (
          <Link to={secondary} onClick={() => trackAction('prog-objectif')}
            className="text-[13.5px] font-medium text-ink-soft underline-offset-4 hover:text-ink hover:underline">
            {SECONDARY[data.secondaire.kind]}
          </Link>
        )}
      </div>

      {exercices.length > 0 && (
        <div className="mt-5">
          {/* Téléphone et tablette : la liste se déplie (l'objectif et « Ma progression » restent à l'écran). */}
          <button type="button" onClick={() => setMore((v) => !v)} aria-expanded={more}
            className="flex min-h-10 w-full items-center justify-between rounded-xl border border-line px-3.5 text-[13.5px] font-semibold text-ink-soft lg:hidden">
            {data.type === 'verifier'
              ? `${exercices.length} exercice${exercices.length > 1 ? 's' : ''} jamais fait${exercices.length > 1 ? 's' : ''}, à faire sans aide`
              : `${exercices.length} exercice${exercices.length > 1 ? 's' : ''} proposé${exercices.length > 1 ? 's' : ''}`}
            <ChevronDown className={`h-4 w-4 transition-transform ${more ? 'rotate-180' : ''}`} />
          </button>
          <div className={`${more ? 'mt-2 block' : 'hidden'} lg:block`}>
            <p className="hidden text-[12px] font-semibold uppercase tracking-[.08em] text-ink-faint lg:block">
              {data.type === 'verifier' ? 'Exercices jamais faits, à faire sans aide' : 'Exercices proposés'}
            </p>
            <ol className="divide-y divide-line overflow-hidden rounded-xl border border-line lg:mt-2">
              {exercices.map((x, i) => (
                <li key={x.id}>
                  <Link to={x.url} onClick={() => trackAction('prog-objectif-exercice')}
                    className="flex min-h-11 items-center gap-3 px-3.5 py-2 transition-colors hover:bg-paper">
                    <span className="fd-nums w-4 shrink-0 text-[12px] text-ink-faint">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-ink">{x.title}</span>
                    <span className="hidden shrink-0 sm:inline-flex"><DifficultyChip difficulty={x.difficulty} plain /></span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-[12px] text-ink-faint"><Clock className="h-3 w-3" aria-hidden />{x.minutes} min</span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden />
                  </Link>
                </li>
              ))}
            </ol>
            {exercices.length > 1 && (
              <button type="button" onClick={fiche} disabled={saving}
                className="mt-1.5 inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-[13px] font-medium text-ink-soft hover:bg-paper hover:text-ink disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />} En faire une fiche
              </button>
            )}
          </div>
        </div>
      )}

      <div className="mt-auto pt-4">
        <button type="button" onClick={() => setWhy((v) => !v)} aria-expanded={why}
          className="inline-flex min-h-9 items-center gap-1 text-[13px] font-semibold text-ink-soft hover:text-ink">
          Pourquoi cet objectif ? <ChevronDown className={`h-4 w-4 transition-transform ${why ? 'rotate-180' : ''}`} />
        </button>
        {why && (
          <ul className="mt-1.5 space-y-1.5 rounded-xl bg-paper px-4 py-3 text-[13.5px] leading-relaxed text-ink-soft">
            {data.pourquoi.map((p) => <li key={p} className="flex gap-2"><span aria-hidden className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-ink-faint" />{p}</li>)}
          </ul>
        )}
        {/* Téléphone : l'avis vient avec « Pourquoi » (la progression reste à l'écran) ; ordinateur : toujours. */}
        <Avis sujet={`objectif-${data.type}`} cle={String(ch?.id ?? data.ds?.id ?? 0)} className={`mt-3 ${why ? '' : 'hidden lg:flex'}`} />
      </div>
    </section>
  );
}
