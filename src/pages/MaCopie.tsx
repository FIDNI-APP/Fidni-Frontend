/**
 * Copie corrigée d'un élève (15/10/2026) : sa note, le mot du professeur, question par question les points, le
 * commentaire, l'énoncé et le corrigé, puis ses points à retravailler (théorèmes réussis à moins de 50 %, avec les
 * exercices du chapitre) et le scan de sa copie. Visible seulement une fois la copie validée et publiée.
 */
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, ChevronDown, FileText, MessageSquare, Printer, Target } from 'lucide-react';
import { t, dateLocale } from '@/i18n';
import { SEO } from '@/components/layout/SEO';
import { Page, PageHeader, CardsSkeleton, EmptyState } from '@/components/space/Page';
import TipTapRenderer from '@/components/editor/TipTapRenderer';
import { copiesError, fmt, maCopie, urlApi, type MaCopie as MaCopieT } from '@/lib/api/copiesApi';
import TexteMaths from '@/components/classrooms/copies/TexteMaths';

export default function MaCopie() {
  const { id = '' } = useParams<{ id: string }>();
  const [c, setC] = useState<MaCopieT | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { maCopie(id).then(setC).catch((e) => setErr(copiesError(e, t('Copie introuvable.')))); }, [id]);

  if (err) {
    return (
      <Page>
        <EmptyState icon={FileText} tone="ink" title={t('Copie indisponible')}
          text={t('Elle n’existe pas, ou ton professeur ne l’a pas (encore) publiée.')}
          action={<Link to="/classrooms" className="fd-btn-primary min-h-10">{t('Mes classes')}</Link>} />
      </Page>
    );
  }
  if (!c) return <Page><CardsSkeleton n={3} /></Page>;

  const ratio = c.note !== null ? c.note / c.note_sur : null;
  const couleur = ratio === null ? 'text-ink' : ratio >= 0.5 ? 'text-brand-hover' : 'text-gold-strong';

  return (
    <Page>
      <SEO title={`${c.evaluation.titre} - Fidni`} description={t('Ma copie corrigée')} />
      <PageHeader
        back={{ to: `/classrooms/${c.classe.id}?onglet=evaluations`, label: c.classe.name }}
        eyebrow={t('Ma copie corrigée')}
        title={c.evaluation.titre}
        subtitle={c.evaluation.date
          ? new Date(`${c.evaluation.date}T12:00:00`).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'long', year: 'numeric' }) : undefined}
        actions={(
          <div className="flex flex-wrap items-center gap-3">
            <Link to={`/mes-copies/${c.id}/pdf`} className="fd-btn-ghost min-h-10"><Printer className="h-4 w-4" /> {t('Imprimer')}</Link>
            <div className="rounded-2xl border border-line bg-white px-5 py-3 text-center">
              <p className="text-[11px] font-bold uppercase tracking-[.08em] text-ink-faint">{t('Ma note')}</p>
              <p dir="ltr" className={`fd-nums text-[30px] font-bold leading-tight ${couleur}`}>
                {fmt(c.note)}<span className="text-[15px] text-ink-faint"> / {c.note_sur}</span>
              </p>
              <p className="text-[12px] text-ink-faint">{t('{p} points sur {m}', { p: fmt(c.points), m: fmt(c.max) })}</p>
            </div>
          </div>
        )}
      />

      {(c.commentaire_prof || c.commentaire_global) && (
        <section className="mb-6 rounded-2xl border border-brand-line bg-brand-soft/50 p-4">
          <h2 className="inline-flex items-center gap-1.5 text-[13px] font-bold text-brand-hover"><MessageSquare className="h-4 w-4" /> {t('Le mot de ton professeur')}</h2>
          {c.commentaire_prof && <TexteMaths texte={c.commentaire_prof} className="mt-1.5 text-[14px] leading-relaxed text-ink" />}
          {c.commentaire_global && <TexteMaths texte={c.commentaire_global} className="mt-1.5 text-[13.5px] leading-relaxed text-ink-soft" />}
        </section>
      )}

      {c.points_faibles.length > 0 && (
        <section className="mb-6 rounded-2xl border border-gold-line bg-white p-4">
          <h2 className="inline-flex items-center gap-1.5 text-[14px] font-bold text-ink"><Target className="h-4 w-4 text-gold-strong" /> {t('À retravailler')}</h2>
          <p className="mt-1 text-[12.5px] text-ink-faint">{t('Les théorèmes que tu as le moins réussis dans cette évaluation.')}</p>
          <ul className="mt-3 flex flex-col gap-3">
            {c.points_faibles.map((p) => (
              <li key={p.theoreme} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold text-ink">{p.theoreme}</p>
                  <p className="text-[12px] text-ink-faint">
                    {t('Réussi à {n} %', { n: p.taux })}{p.questions.length ? ` · ${t('questions {q}', { q: p.questions.join(', ') })}` : ''}
                  </p>
                </div>
                {p.chapitre?.url && (
                  <Link to={p.chapitre.url} className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2.5 text-[12.5px] font-semibold text-brand-hover hover:bg-brand-soft">
                    {t('S’entraîner : {ch}', { ch: p.chapitre.nom })} <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <h2 className="mb-3 text-[15px] font-bold text-ink">{t('Question par question')}</h2>
      <div className="flex flex-col gap-3">
        {c.questions.map((q) => {
          const f = c.finales[q.chemin];
          const r = f?.points !== null && f?.points !== undefined && q.max ? f.points / q.max : null;
          return <QuestionCorrigee key={q.chemin} label={q.label} points={f?.points ?? null} max={q.max} ratio={r}
            commentaire={f?.commentaire || ''} enonce={q.enonce_html} solution={q.solution_html} />;
        })}
      </div>

      {c.pages.length > 0 && (
        <details className="mt-6 rounded-2xl border border-line bg-white p-4">
          <summary className="cursor-pointer text-[14px] font-semibold text-ink">{t('Ma copie scannée ({n} pages)', { n: c.pages.length })}</summary>
          <div className="mt-3 flex flex-col gap-3">
            {c.pages.map((p) => (
              <img key={p.id} src={urlApi(p.url)} alt={t('Page {n} de ma copie', { n: p.numero })} loading="lazy"
                className="fd-fixe w-full rounded-xl border border-line" />
            ))}
          </div>
        </details>
      )}
    </Page>
  );
}

function QuestionCorrigee({ label, points, max, ratio, commentaire, enonce, solution }: {
  label: string; points: number | null; max: number; ratio: number | null; commentaire: string; enonce: string; solution: string;
}) {
  const [ouvert, setOuvert] = useState(false);
  const barre = ratio === null ? 'bg-[#e7e3dc]' : ratio >= 1 ? 'bg-brand' : ratio >= 0.5 ? 'bg-brand/60' : 'bg-gold';
  return (
    <section className="rounded-2xl border border-line bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[14px] font-bold text-ink">{t('Question {q}', { q: label })}</h3>
        <span dir="ltr" className="fd-nums shrink-0 text-[14px] font-bold text-ink">{fmt(points)}<span className="font-medium text-ink-faint"> / {fmt(max)}</span></span>
      </div>
      <div className="fd-ltr mt-2 h-1.5 overflow-hidden rounded-full bg-[#f2f1ee]">
        <div className={`h-full rounded-full ${barre}`} style={{ width: `${Math.round((ratio ?? 0) * 100)}%` }} />
      </div>
      {commentaire && <TexteMaths texte={commentaire} className="mt-2.5 text-[13.5px] leading-relaxed text-ink-soft" />}
      <button type="button" onClick={() => setOuvert((o) => !o)} aria-expanded={ouvert}
        className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand-hover hover:underline">
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${ouvert ? 'rotate-180' : ''}`} /> {t('Énoncé et corrigé')}
      </button>
      {ouvert && (
        <div className="mt-2 flex flex-col gap-3 border-t border-line pt-3">
          <div className="text-[13.5px] text-ink-soft"><TipTapRenderer content={enonce} /></div>
          {solution && (
            <div className="rounded-xl bg-brand-soft/40 p-3">
              <p className="text-[11px] font-bold uppercase tracking-[.08em] text-brand-hover">{t('Corrigé')}</p>
              <div className="text-[13.5px]"><TipTapRenderer content={solution} /></div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
