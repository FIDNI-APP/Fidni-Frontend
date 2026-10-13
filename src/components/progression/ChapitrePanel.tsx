/**
 * Détail d'un chapitre (13/10/2026) : panneau à droite sur ordinateur, plein écran sur téléphone. Sa note aux examens
 * (moyenne, min, max, courbe dans le temps), ses questions réussies / à revoir jour par jour, le temps par contenu,
 * puis de quoi le travailler (s'entraîner, le cours, le quiz, ses DS).
 */
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Brain, ClipboardList, Dumbbell, X } from 'lucide-react';
import type { Tableau, TableauChapitre } from '@/lib/api/tableauApi';
import { decimal, duration } from '@/pages/progression/format';
import { lessonsUrl, practiceUrl, quizUrl } from '@/pages/progression/links';
import { SERIES_QUESTIONS, remplir } from './chart';
import { DayBars } from './DayBars';
import { NotesChart } from './NotesChart';
import { PointsFaibles } from './PointsFaibles';

const Chiffre: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="rounded-xl border border-line bg-white px-3 py-2.5">
    <p className="text-[11.5px] text-ink-faint">{label}</p>
    <p className="fd-nums mt-0.5 text-[18px] font-bold leading-tight text-ink">{value}</p>
  </div>
);

export const ChapitrePanel: React.FC<{ chapitre: TableauChapitre; data: Tableau; onClose: () => void }> = ({ chapitre: c, data, onClose }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const titres = new Map(data.notes.map((n) => [n.id, { titre: n.titre, url: n.url }]));
  const points = c.note.serie.map((p) => ({ date: p.date, note: p.note, titre: titres.get(p.examen)?.titre ?? 'Examen', url: titres.get(p.examen)?.url }));
  const temps = data.temps.find((t) => t.id === c.id);
  const q = c.reussies + c.partielles + c.ratees;
  const rows = remplir(c.jours, data.periode.debut, data.periode.fin, data.periode.pas, ['reussies', 'partielles', 'ratees']);
  const note = (n: number | null) => (n === null ? '—' : <>{decimal(n)}<span className="text-[12px] font-semibold text-ink-faint"> /20</span></>);
  const link = 'inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold transition-colors';

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-[rgba(20,18,16,.35)] backdrop-blur-[1px]" onClick={onClose}>
      <aside role="dialog" aria-modal="true" aria-labelledby="chapitre-titre" onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full flex-col overflow-y-auto bg-[#faf9f7] shadow-[-12px_0_40px_rgba(20,18,16,.18)] sm:max-w-[560px]">
        <header className="sticky top-0 z-10 flex items-start gap-3 border-b border-line bg-white/95 px-5 py-4 backdrop-blur">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[.1em] text-gold-strong">Chapitre</p>
            <h2 id="chapitre-titre" className="fd-display mt-1 text-[22px] leading-tight text-ink">{c.nom}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" autoFocus
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink-faint hover:bg-[#f2f1ee] hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex flex-col gap-5 px-5 py-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Chiffre label="Note moyenne" value={note(c.note.moyenne)} />
            <Chiffre label="Minimum" value={note(c.note.min)} />
            <Chiffre label="Maximum" value={note(c.note.max)} />
            <Chiffre label="Examens notés" value={c.note.n} />
          </div>

          <section className="rounded-2xl border border-line bg-white p-4">
            <h3 className="mb-3 text-[14px] font-semibold text-ink">Ma note aux examens</h3>
            <NotesChart points={points} debut={data.periode.debut} fin={data.periode.fin} height={160}
              headline={c.note.moyenne !== null ? <>{decimal(c.note.moyenne)} <span className="text-[14px] font-semibold text-ink-faint">/ 20 en moyenne</span></> : '—'}
              emptyText={<>Pas encore d’examen corrigé sur ce chapitre.{c.examens_url && <> <Link to={c.examens_url} className="font-semibold text-brand-hover hover:underline">Voir ses DS</Link></>}</>} />
            <p className="mt-3 text-[12px] leading-relaxed text-ink-faint">Seulement les questions de ce chapitre, d’après ce que tu as coché sur ta copie.</p>
          </section>

          <section className="rounded-2xl border border-line bg-white p-4">
            <h3 className="mb-3 text-[14px] font-semibold text-ink">Mes questions</h3>
            <DayBars rows={rows} series={SERIES_QUESTIONS} pas={data.periode.pas} height={140}
              describe={(r) => [`${r.reussies} réussie${Number(r.reussies) > 1 ? 's' : ''}`, Number(r.partielles) ? `${r.partielles} en partie` : '', `${r.ratees} à revoir`].filter(Boolean).join(' · ')}
              headline={q ? <>{c.reussies} <span className="text-[14px] font-semibold text-ink-faint">réussie{c.reussies > 1 ? 's' : ''}{c.partielles ? ` · ${c.partielles} en partie` : ''} · {c.ratees} à revoir</span></> : 'Aucune question évaluée'}
              emptyText="Aucune question évaluée sur la période." />
          </section>

          {data.points_faibles.some((p) => p.chapitre?.id === c.id) && (
            <section>
              <h3 className="mb-2 text-[14px] font-semibold text-ink">Ce que tu ne maîtrises pas encore</h3>
              <PointsFaibles points={data.points_faibles.filter((p) => p.chapitre?.id === c.id)} compact />
            </section>
          )}

          {temps && (
            <section className="rounded-2xl border border-line bg-white p-4">
              <h3 className="mb-2 flex items-baseline justify-between gap-3 text-[14px] font-semibold text-ink">
                Mon temps <span className="fd-nums text-[13px] text-ink-soft">{duration(temps.secondes)}</span>
              </h3>
              <ul className="divide-y divide-line">
                {temps.contenus.map((ct) => (
                  <li key={ct.id} className="flex items-center gap-3 py-2">
                    <Link to={ct.url} className="min-w-0 flex-1 truncate text-[13px] text-ink hover:underline">{ct.titre}</Link>
                    <span className="fd-nums shrink-0 text-[12.5px] text-ink-faint">{duration(ct.secondes)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="flex flex-wrap gap-2">
            <Link to={practiceUrl(c.hub_url, c.id)} className={`${link} bg-brand text-white hover:bg-brand-hover`}><Dumbbell className="h-4 w-4" /> S’entraîner</Link>
            <Link to={lessonsUrl(c.hub_url, c.id)} className={`${link} border border-line bg-white text-ink-soft hover:text-ink`}><BookOpen className="h-4 w-4" /> Le cours</Link>
            {c.quiz && <Link to={quizUrl(c.id, '/progression')} className={`${link} border border-line bg-white text-ink-soft hover:text-ink`}><Brain className="h-4 w-4" /> Quiz</Link>}
            {c.examens_url && <Link to={c.examens_url} className={`${link} border border-line bg-white text-ink-soft hover:text-ink`}><ClipboardList className="h-4 w-4" /> Ses DS</Link>}
          </div>
        </div>
      </aside>
    </div>
  );
};

export default ChapitrePanel;
