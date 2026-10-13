// « Ma progression » (13/10/2026) : trois chiffres seulement, chacun avec sa portée en deux mots ; un clic dit comment
// il est calculé (règle : ne jamais afficher une précision qu'on n'a pas). La régularité est au second plan : une
// ligne discrète qui ouvre « Mon activité ». Backend : apps/users/maitrise.py (_apercu, _regularite).
import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Sheet } from '@/components/space/Sheet';
import { trackAction } from '@/lib/usage';
import { ETAT, ETAT_ORDER } from './etat';
import { shortDate } from './format';
import { EvolutionSheet } from './EvolutionSheet';
import { RegulariteSheet } from './RegulariteSheet';
import type { Apercu, ChapterProgress, Regularite } from './types';

type Open = 'maitrise' | 'evolution' | 'chapitres' | 'activite' | null;

export function MaProgression({ apercu, chapters, regularite, onGoalSaved, className = '' }: {
  apercu: Apercu;
  chapters: ChapterProgress[];
  regularite: Regularite | null;
  onGoalSaved: (minutes: number) => void;
  className?: string;
}) {
  const [open, setOpen] = useState<Open>(null);
  const show = (o: Exclude<Open, null>) => { trackAction(o === 'activite' ? 'prog-activite-detail' : 'prog-calcul'); setOpen(o); };
  const evo = apercu.evolution;
  const evalues = apercu.chapitres.evalues;
  const total = apercu.chapitres.total;
  const deltaText = evo.mesurable && evo.delta !== null ? `${evo.delta > 0 ? '+' : evo.delta < 0 ? '−' : ''}${Math.abs(evo.delta)} pts` : '—';

  return (
    <section data-tour="prog-activite" aria-labelledby="progression-titre" className={`flex flex-col rounded-2xl border border-line bg-white ${className}`}>
      <h2 id="progression-titre" className="sr-only">Mes chiffres</h2>
      <div className="grid grid-cols-3 gap-1 p-2 sm:p-3">
        <Tile onClick={() => show('maitrise')} value={apercu.maitrise !== null ? `${apercu.maitrise} %` : '—'}
          label="Maîtrise" scope={apercu.maitrise !== null ? `${evalues} chapitre${evalues > 1 ? 's' : ''}` : 'à évaluer'}
          aria="Maîtrise estimée : comment c’est calculé" />
        <Tile onClick={() => show('evolution')} value={deltaText}
          tone={evo.mesurable && evo.delta !== null ? (evo.delta > 0 ? 'up' : evo.delta < 0 ? 'down' : 'flat') : 'flat'}
          label="En 30 jours"
          scope={evo.mesurable ? `${evo.chapitres_compares} chapitres` : evo.disponible_le ? `dès le ${shortDate(evo.disponible_le)}` : 'pas encore'}
          aria="Évolution sur 30 jours : comment c’est calculé" />
        <Tile onClick={() => show('chapitres')} value={`${evalues}/${total}`} label="Évalués"
          scope={<StackBar etats={apercu.etats} total={total} />} aria="Chapitres évalués : le détail" />
      </div>
      {regularite && (
        <button type="button" onClick={() => show('activite')}
          className="mt-auto flex min-h-11 items-center gap-2 border-t border-line px-5 text-left text-[13px] text-ink-faint transition-colors hover:bg-paper hover:text-ink">
          <span className="flex gap-[3px]" aria-hidden>
            {regularite.jours.slice(-7).map((j) => (
              <span key={j.date} className={`h-2.5 w-2.5 rounded-[3px] ${j.actif ? 'bg-brand/70' : 'bg-[#ebe8e2]'}`} />
            ))}
          </span>
          <span className="flex-1"><b className="fd-nums font-semibold text-ink-soft">{regularite.jours_actifs}/{regularite.sur}</b> jours actifs</span>
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      )}

      <Sheet open={open === 'maitrise'} onClose={() => setOpen(null)} labelId="calcul-maitrise" title="Maîtrise estimée : comment c’est calculé"
        subtitle={apercu.maitrise !== null ? `${apercu.maitrise} %, moyenne de tes ${evalues} chapitre${evalues > 1 ? 's' : ''} évalué${evalues > 1 ? 's' : ''}.` : 'Pas encore de chapitre évalué.'}>
        <Explain items={[
          'Tes questions évaluées : réussi = 1, en partie = ½, à revoir = 0.',
          'Un chapitre compte à partir de 4 questions (ou d’un quiz : 40 %).',
          'Une estimation, d’après ce que tu as dit de tes réponses.',
        ]} />
        <ChapterPcts chapters={chapters.filter((c) => c.etat && c.etat !== 'non_evalue')} />
      </Sheet>

      <Sheet open={open === 'chapitres'} onClose={() => setOpen(null)} labelId="calcul-chapitres" title="Chapitres évalués"
        subtitle={`${evalues} sur ${total} chapitres du programme.`}>
        <ul className="space-y-3">
          {ETAT_ORDER.map((etat) => {
            const e = ETAT[etat];
            const Icon = e.icon;
            return (
              <li key={etat} className="flex gap-3">
                <span className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${e.pill}`}><Icon className="h-3.5 w-3.5" aria-hidden /></span>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-ink">{e.label} <span className="fd-nums font-normal text-ink-faint">· {apercu.etats[etat]}</span></p>
                  <p className="text-[13px] leading-relaxed text-ink-soft">{MEANING[etat]}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </Sheet>

      <EvolutionSheet open={open === 'evolution'} onClose={() => setOpen(null)} evolution={evo} serie={apercu.serie ?? []} />
      {regularite && <RegulariteSheet open={open === 'activite'} onClose={() => setOpen(null)} regularite={regularite} onGoalSaved={onGoalSaved} />}
    </section>
  );
}

const MEANING = {
  maitrise: 'Réussi, varié, sans aide, et revérifié.',
  bonne_voie: '60 % ou plus, ou en hausse.',
  a_consolider: 'Réussite partielle, ou pas tenu à la vérification.',
  a_renforcer: 'Moins de 40 % : reprendre les bases.',
  non_evalue: 'Moins de 4 questions évaluées.',
} as const;

function Tile({ value, label, scope, tone = 'flat', aria, onClick }: {
  value: string; label: string; scope: React.ReactNode; tone?: 'up' | 'down' | 'flat'; aria: string; onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} aria-label={`${value}, ${label}. ${aria}`}
      className="flex min-w-0 flex-col items-start rounded-xl px-3 py-3 text-left transition-colors hover:bg-paper">
      <span className={`fd-nums whitespace-nowrap text-[24px] font-bold leading-none sm:text-[26px] ${tone === 'up' ? 'text-brand-hover' : tone === 'down' ? 'text-[#8a6318]' : 'text-ink'}`}>{value}</span>
      <span className="mt-1.5 text-[13px] font-semibold text-ink">{label}</span>
      <span className="mt-0.5 block w-full truncate text-[12px] text-ink-faint">{scope}</span>
    </button>
  );
}

function StackBar({ etats, total }: { etats: Apercu['etats']; total: number }) {
  if (!total) return null;
  return (
    <span className="mt-1 flex h-1.5 w-full max-w-[120px] overflow-hidden rounded-full bg-[#f2f1ee]" role="img"
      aria-label={ETAT_ORDER.filter((e) => etats[e]).map((e) => `${etats[e]} ${ETAT[e].label.toLowerCase()}`).join(', ')}>
      {ETAT_ORDER.filter((e) => e !== 'non_evalue' && etats[e]).map((e) => (
        <span key={e} className="h-full" style={{ width: `${(etats[e] / total) * 100}%`, background: ETAT[e].hex }} />
      ))}
    </span>
  );
}

function Explain({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 text-[13.5px] leading-relaxed text-ink-soft">
      {items.map((t) => <li key={t} className="flex gap-2"><span aria-hidden className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-ink-faint" />{t}</li>)}
    </ul>
  );
}

function ChapterPcts({ chapters }: { chapters: ChapterProgress[] }) {
  if (!chapters.length) return null;
  return (
    <div className="mt-5">
      <p className="text-[12px] font-semibold uppercase tracking-[.08em] text-ink-faint">Tes chapitres évalués</p>
      <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
        {chapters.map((c) => (
          <li key={c.id} className="flex items-center gap-3 px-3.5 py-2.5 text-[13.5px]">
            <span className="min-w-0 flex-1 truncate text-ink">{c.name}</span>
            <span className="text-[12px] text-ink-faint">{c.reussite?.questions ?? 0} q.</span>
            <span className="fd-nums w-10 text-right font-semibold text-ink">{c.pct ?? '—'} %</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
