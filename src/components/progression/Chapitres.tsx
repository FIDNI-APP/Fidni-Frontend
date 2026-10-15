/**
 * « Mes chapitres » du tableau de bord (13/10/2026) : un tableau trié au choix (ordre du programme, note, questions,
 * temps) sur ordinateur, des cartes sur téléphone. Par chapitre : note moyenne aux examens (/20), son minimum et son
 * maximum (barre 0–20), son évolution (petite courbe), les questions réussies / à revoir et le temps. Un clic ouvre le
 * détail. Les chapitres sans activité sur la période sont repliés.
 */
import React, { useMemo, useState } from 'react';
import { ArrowDown, ChevronDown, ChevronRight } from 'lucide-react';
import type { TableauChapitre } from '@/lib/api/tableauApi';
import { decimal, duration } from '@/pages/progression/format';
import { COULEUR } from './chart';
import { t } from '@/i18n';

type Tri = 'programme' | 'note' | 'questions' | 'temps';

/** Minimum → maximum sur 0–20, la moyenne marquée d'un point. */
export const Fourchette: React.FC<{ min: number | null; max: number | null; moyenne: number | null; className?: string }> = ({ min, max, moyenne, className = '' }) => (
  <span className={`fd-ltr relative block h-2 rounded-full bg-[#f2f1ee] ${className}`} aria-hidden>
    {min !== null && max !== null && (
      <span className="absolute inset-y-0 rounded-full" style={{ left: `${(min / 20) * 100}%`, width: `${Math.max(2, ((max - min) / 20) * 100)}%`, background: '#cfe6d8' }} />
    )}
    {moyenne !== null && (
      <span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white" style={{ left: `${(moyenne / 20) * 100}%`, background: COULEUR.note }} />
    )}
  </span>
);

/** Petite courbe des notes d'un chapitre (0–20). */
export const MiniCourbe: React.FC<{ notes: number[] }> = ({ notes }) => {
  if (notes.length < 2) return <span className="text-[12px] text-ink-faint">{notes.length === 1 ? t('1 examen') : '—'}</span>;
  const x = (i: number) => (i / (notes.length - 1)) * 70 + 3;
  const y = (n: number) => 22 - (n / 20) * 20;
  return (
    <svg width="76" height="24" viewBox="0 0 76 24" aria-hidden className="overflow-visible">
      <line x1="0" x2="76" y1={y(10)} y2={y(10)} stroke="#f2f1ee" strokeWidth="1" />
      <polyline fill="none" stroke={COULEUR.note} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
        points={notes.map((n, i) => `${x(i)},${y(n)}`).join(' ')} />
      <circle cx={x(notes.length - 1)} cy={y(notes[notes.length - 1])} r="3" fill={COULEUR.note} stroke="#fff" strokeWidth="1.5" />
    </svg>
  );
};

/** Réussies / en partie / à revoir en une barre fine. */
export const BarreQuestions: React.FC<{ r: { reussies: number; partielles: number; ratees: number }; className?: string }> = ({ r, className = '' }) => {
  const t = r.reussies + r.partielles + r.ratees;
  if (!t) return <span className={`block h-1.5 rounded-full bg-[#f2f1ee] ${className}`} aria-hidden />;
  return (
    <span className={`flex h-1.5 gap-[2px] overflow-hidden rounded-full ${className}`} aria-hidden>
      {([['reussies', COULEUR.reussies], ['partielles', COULEUR.partielles], ['ratees', COULEUR.ratees]] as const).map(([k, c]) =>
        r[k] > 0 && <span key={k} style={{ flexGrow: r[k], background: c }} />)}
    </span>
  );
};

const noteTexte = (n: number | null) => (n === null ? '—' : decimal(n));

export const Chapitres: React.FC<{ chapitres: TableauChapitre[]; onOpen: (id: number) => void }> = ({ chapitres, onOpen }) => {
  const [tri, setTri] = useState<Tri>('programme');
  const [tous, setTous] = useState(false);
  const ordre = useMemo(() => {
    const rows = chapitres.map((c, i) => ({ c, i }));
    const q = (c: TableauChapitre) => c.reussies + c.partielles + c.ratees;
    const key: Record<Tri, (x: { c: TableauChapitre; i: number }) => number> = {
      programme: (x) => x.i,
      note: (x) => -(x.c.note.moyenne ?? -1),
      questions: (x) => -q(x.c),
      temps: (x) => -x.c.secondes,
    };
    return rows.sort((a, b) => key[tri](a) - key[tri](b) || a.i - b.i).map((x) => x.c);
  }, [chapitres, tri]);
  const actifs = ordre.filter((c) => c.actif);
  const autres = ordre.filter((c) => !c.actif);
  const shown = tous ? [...actifs, ...autres] : actifs;

  const Entete: React.FC<{ k: Tri; children: React.ReactNode; className?: string }> = ({ k, children, className = '' }) => (
    <th scope="col" aria-sort={tri === k && k !== 'programme' ? 'descending' : 'none'} className={`px-3 py-2.5 font-medium ${className}`}>
      <button type="button" onClick={() => setTri(k)}
        className={`inline-flex items-center gap-1 rounded-md hover:text-ink ${tri === k ? 'text-ink' : ''}`}>
        {children}{tri === k && k !== 'programme' && <ArrowDown className="h-3 w-3" aria-hidden />}
      </button>
    </th>
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      {/* Ordinateur : tableau triable */}
      <table className="hidden w-full text-start text-[13px] md:table">
        <thead className="border-b border-line bg-[#fcfbf9] text-[12px] text-ink-faint">
          <tr>
            <Entete k="programme" className="ps-5">{t('Chapitre')}</Entete>
            <Entete k="note">{t('Note moy.')}</Entete>
            <th scope="col" className="px-3 py-2.5 font-medium">{t('Min – max')}</th>
            <th scope="col" className="px-3 py-2.5 font-medium">{t('Évolution')}</th>
            <Entete k="questions">{t('Questions')}</Entete>
            <Entete k="temps" className="pe-5 text-end">{t('Temps')}</Entete>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {shown.map((c) => (
            <tr key={c.id} className={`group cursor-pointer transition-colors hover:bg-[#faf9f7] ${c.actif ? '' : 'text-ink-faint'}`} onClick={() => onOpen(c.id)}>
              <td className="py-3 ps-5 pe-3">
                <button type="button" onClick={(e) => { e.stopPropagation(); onOpen(c.id); }}
                  className="text-start font-semibold text-ink group-hover:underline focus:outline-none focus-visible:underline">{c.nom}</button>
              </td>
              <td className="fd-nums px-3 py-3">
                {c.note.moyenne !== null ? <><b className="text-[15px] text-ink">{noteTexte(c.note.moyenne)}</b><span className="text-ink-faint"> /20</span></> : <span className="text-ink-faint">—</span>}
              </td>
              <td className="px-3 py-3">
                {c.note.n ? (
                  <span className="flex items-center gap-2">
                    <Fourchette min={c.note.min} max={c.note.max} moyenne={c.note.moyenne} className="w-20" />
                    <span className="fd-nums text-[12px] text-ink-faint">{noteTexte(c.note.min)} – {noteTexte(c.note.max)}</span>
                  </span>
                ) : <span className="text-[12px] text-ink-faint">{t('pas d’examen')}</span>}
              </td>
              <td className="px-3 py-3"><MiniCourbe notes={c.note.serie.map((p) => p.note)} /></td>
              <td className="px-3 py-3">
                <span className="flex flex-col gap-1">
                  <span className="fd-nums text-[12px] text-ink-soft">{c.reussies > 1 ? t('{n} réussies', { n: c.reussies }) : t('{n} réussie', { n: c.reussies })} · {t('{n} à revoir', { n: c.ratees })}{c.partielles ? ` · ${t('{n} en partie', { n: c.partielles })}` : ''}</span>
                  <BarreQuestions r={c} className="w-24" />
                </span>
              </td>
              <td className="fd-nums px-3 py-3 pe-5 text-end text-ink-soft">{c.secondes ? duration(c.secondes) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Téléphone : cartes */}
      <ul className="divide-y divide-line md:hidden">
        {shown.map((c) => (
          <li key={c.id}>
            <button type="button" onClick={() => onOpen(c.id)} className="flex w-full items-center gap-3 px-4 py-3.5 text-start active:bg-[#faf9f7]">
              <span className="min-w-0 flex-1">
                <span className={`block truncate text-[14px] font-semibold ${c.actif ? 'text-ink' : 'text-ink-faint'}`}>{c.nom}</span>
                <span className="mt-1.5 flex items-center gap-2">
                  <span className="fd-nums w-[54px] shrink-0 text-[13px]">
                    {c.note.moyenne !== null ? <><b className="text-ink">{noteTexte(c.note.moyenne)}</b><span className="text-ink-faint">/20</span></> : <span className="text-ink-faint">—</span>}
                  </span>
                  {c.note.n ? <Fourchette min={c.note.min} max={c.note.max} moyenne={c.note.moyenne} className="flex-1" />
                    : <span className="flex-1 text-[12px] text-ink-faint">{t('pas d’examen')}</span>}
                </span>
                <span className="fd-nums mt-1.5 block text-[12px] text-ink-faint">
                  {c.reussies > 1 ? t('{n} réussies', { n: c.reussies }) : t('{n} réussie', { n: c.reussies })} · {t('{n} à revoir', { n: c.ratees })}{c.secondes ? ` · ${duration(c.secondes)}` : ''}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden />
            </button>
          </li>
        ))}
      </ul>

      {!actifs.length && !tous && (
        <p className="px-5 py-4 text-[13px] text-ink-faint">{t('Aucun chapitre travaillé sur cette période.')}</p>
      )}
      {autres.length > 0 && (
        <button type="button" onClick={() => setTous((v) => !v)} aria-expanded={tous}
          className="flex min-h-11 w-full items-center justify-center gap-1.5 border-t border-line text-[13px] font-semibold text-ink-soft hover:text-ink">
          {tous ? t('Masquer les chapitres sans activité') : t('Les {n} autres chapitres du programme', { n: autres.length })}
          <ChevronDown className={`h-4 w-4 transition-transform ${tous ? 'rotate-180' : ''}`} aria-hidden />
        </button>
      )}
    </div>
  );
};

export default Chapitres;
