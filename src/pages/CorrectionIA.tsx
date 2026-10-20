/**
 * Ma copie corrigée par l'IA (20/10/2026, fonction cachée) : la note, puis d'abord les questions où des points ont été
 * perdus (ce que l'IA a lu sur la copie, comparé au corrigé de Fidni, avec son explication), question par question,
 * les points faibles par théorème et les scans. Pas de professeur : c'est une correction automatique, qui peut se
 * tromper, et le dit.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowRight, ChevronDown, FileText, Info, Loader2, Target, Trash2 } from 'lucide-react';
import { t, dateLocale } from '@/i18n';
import { SEO } from '@/components/layout/SEO';
import { Page, PageHeader, CardsSkeleton, EmptyState } from '@/components/space/Page';
import TipTapRenderer from '@/components/editor/TipTapRenderer';
import TexteMaths from '@/components/classrooms/copies/TexteMaths';
import { copiesError, enTraitement, fmt, urlApi } from '@/lib/api/copiesApi';
import { getCorrection, supprimerCorrection, type CorrectionDetail } from '@/lib/api/correctionIaApi';

export default function CorrectionIA() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [c, setC] = useState<CorrectionDetail | null>(null);
  const [err, setErr] = useState('');
  const [suppr, setSuppr] = useState(false);
  const minuteur = useRef<number | undefined>(undefined);

  const charger = useCallback(() => {
    getCorrection(id).then((d) => {
      setC(d);
      window.clearTimeout(minuteur.current);
      if (enTraitement(d.statut)) minuteur.current = window.setTimeout(charger, 4000);
    }).catch((e) => setErr(copiesError(e, t('Copie introuvable.'))));
  }, [id]);

  useEffect(() => { charger(); return () => window.clearTimeout(minuteur.current); }, [charger]);

  const lien = c?.content ? `/exams/${c.content.id}` : '/exams';

  if (err) {
    return (
      <Page>
        <EmptyState icon={FileText} tone="ink" title={t('Copie indisponible')}
          text={t('Elle n’existe pas, ou tu n’as pas accès à cette fonction.')}
          action={<Link to="/exams" className="fd-btn-primary min-h-10">{t('Examens')}</Link>} />
      </Page>
    );
  }
  if (!c) return <Page><CardsSkeleton n={3} /></Page>;

  const supprimer = async () => {
    if (!window.confirm(t('Supprimer cette correction et les photos de ta copie ?'))) return;
    setSuppr(true);
    try { await supprimerCorrection(c.id); navigate(lien); } catch (e) { setErr(copiesError(e, t('Suppression impossible.'))); setSuppr(false); }
  };

  const titre = c.evaluation.titre;
  const sous = new Date(c.evaluation.created_at).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'long', year: 'numeric' });

  if (enTraitement(c.statut)) {
    return (
      <Page>
        <SEO title={`${titre} - Fidni`} description={t('Ma copie corrigée par l’IA')} />
        <PageHeader back={{ to: lien, label: t('Retour au sujet') }} eyebrow={t('Correction par l’IA')} title={titre} subtitle={sous} />
        <div role="status" className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-white px-6 py-12 text-center">
          <Loader2 className="h-7 w-7 animate-spin text-brand" aria-hidden />
          <p className="text-[15px] font-semibold text-ink">{c.etape || t('Correction en cours')}</p>
          <p className="max-w-sm text-[13px] text-ink-faint">{t('L’IA lit ta copie puis la compare au corrigé. Environ une minute : tu peux rester sur cette page, elle se met à jour toute seule.')}</p>
        </div>
      </Page>
    );
  }

  if (c.statut === 'erreur') {
    return (
      <Page>
        <PageHeader back={{ to: lien, label: t('Retour au sujet') }} eyebrow={t('Correction par l’IA')} title={titre} />
        <EmptyState icon={AlertTriangle} tone="ink" title={t('La correction a échoué')}
          text={c.error || t('Vérifie que les photos sont nettes, bien orientées et lisibles, puis recommence : cette tentative ne compte pas dans ta limite.')}
          action={<div className="flex gap-3"><Link to={lien} className="fd-btn-primary min-h-10">{t('Réessayer')}</Link>
            <button type="button" onClick={supprimer} disabled={suppr} className="fd-btn-ghost min-h-10">{t('Supprimer')}</button></div>} />
      </Page>
    );
  }

  const ratio = c.note !== null ? c.note / c.note_sur : null;
  const couleur = ratio === null ? 'text-ink' : ratio >= 0.5 ? 'text-brand-hover' : 'text-gold-strong';
  const pertes = c.questions
    .map((q) => ({ q, f: c.finales[q.chemin] }))
    .filter(({ q, f }) => f && f.points !== null && f.points < q.max)
    .sort((a, b) => ((b.q.max - (b.f.points ?? 0)) - (a.q.max - (a.f.points ?? 0))));
  const perdus = pertes.reduce((s, { q, f }) => s + (q.max - (f.points ?? 0)), 0);

  return (
    <Page>
      <SEO title={`${titre} - Fidni`} description={t('Ma copie corrigée par l’IA')} />
      <PageHeader
        back={{ to: lien, label: t('Retour au sujet') }}
        eyebrow={t('Ma copie corrigée par l’IA')}
        title={titre}
        subtitle={sous}
        actions={(
          <div className="rounded-2xl border border-line bg-white px-5 py-3 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[.08em] text-ink-faint">{t('Ma note')}</p>
            <p dir="ltr" className={`fd-nums text-[30px] font-bold leading-tight ${couleur}`}>
              {fmt(c.note)}<span className="text-[15px] text-ink-faint"> / {c.note_sur}</span>
            </p>
            <p className="text-[12px] text-ink-faint">{t('{p} points sur {m}', { p: fmt(c.points), m: fmt(c.max) })}</p>
          </div>
        )}
      />

      <p className="mb-5 flex items-start gap-2 rounded-xl bg-[#f7f6f2] px-3.5 py-2.5 text-[12.5px] leading-snug text-ink-soft">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" aria-hidden />
        {t('Correction automatique par l’IA, d’après le corrigé de Fidni : elle peut se tromper ou mal lire un symbole. Vérifie « Ce que l’IA a lu » avant de t’inquiéter d’une note.')}
      </p>

      {c.commentaire_global && (
        <section className="mb-6 rounded-2xl border border-brand-line bg-brand-soft/50 p-4">
          <TexteMaths texte={c.commentaire_global} className="text-[14px] leading-relaxed text-ink" />
        </section>
      )}

      <section className="mb-6 rounded-2xl border border-gold-line bg-white p-4" aria-labelledby="pertes">
        <h2 id="pertes" className="inline-flex items-center gap-1.5 text-[14px] font-bold text-ink">
          <AlertTriangle className="h-4 w-4 text-gold-strong" aria-hidden />
          {pertes.length ? t('Où tu as perdu des points ({p} pts)', { p: fmt(Math.round(perdus * 100) / 100) }) : t('Aucun point perdu')}
        </h2>
        {pertes.length === 0 ? (
          <p className="mt-1 text-[13px] text-ink-soft">{t('Bravo : l’IA n’a relevé aucune erreur sur cette copie.')}</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2.5">
            {pertes.map(({ q, f }) => (
              <li key={q.chemin} className="flex items-start gap-3 text-[13.5px]">
                <a href={`#q-${q.chemin}`} className="mt-0.5 shrink-0 rounded-md bg-gold-soft px-2 py-0.5 text-[12px] font-bold text-gold-strong">{q.label}</a>
                <div className="min-w-0 flex-1">
                  {f.commentaire ? <TexteMaths texte={f.commentaire} className="leading-relaxed text-ink-soft" />
                    : <p className="text-ink-faint">{t('Pas d’explication.')}</p>}
                </div>
                <span dir="ltr" className="fd-nums shrink-0 text-[12.5px] font-bold text-ink">−{fmt(Math.round((q.max - (f.points ?? 0)) * 100) / 100)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {c.points_faibles.length > 0 && (
        <section className="mb-6 rounded-2xl border border-line bg-white p-4">
          <h2 className="inline-flex items-center gap-1.5 text-[14px] font-bold text-ink"><Target className="h-4 w-4 text-gold-strong" aria-hidden /> {t('À retravailler')}</h2>
          <ul className="mt-3 flex flex-col gap-3">
            {c.points_faibles.map((p) => (
              <li key={p.theoreme} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold text-ink">{p.theoreme}</p>
                  <p className="text-[12px] text-ink-faint">{t('Réussi à {n} %', { n: p.taux })}{p.questions.length ? ` · ${t('questions {q}', { q: p.questions.join(', ') })}` : ''}</p>
                </div>
                {p.chapitre?.url && (
                  <Link to={p.chapitre.url} className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2.5 text-[12.5px] font-semibold text-brand-hover hover:bg-brand-soft">
                    {t('S’entraîner : {ch}', { ch: p.chapitre.nom })} <ArrowRight className="h-3.5 w-3.5 rtl:-scale-x-100" aria-hidden />
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
          const r = c.reponses[q.chemin];
          const pts = f?.points ?? null;
          return (
            <QuestionComparee key={q.chemin} id={`q-${q.chemin}`} label={q.label} points={pts} max={q.max}
              commentaire={f?.commentaire || ''} lu={r?.texte || ''} illisible={!!r?.illisible} enonce={q.enonce_html} solution={q.solution_html}
              ouvert={pts !== null && pts < q.max} />
          );
        })}
      </div>

      {c.pages.length > 0 && (
        <details className="mt-6 rounded-2xl border border-line bg-white p-4">
          <summary className="cursor-pointer text-[14px] font-semibold text-ink">{t('Ma copie scannée ({n} pages)', { n: c.pages.length })}</summary>
          <div className="mt-3 flex flex-col gap-3">
            {c.pages.map((p) => (
              <img key={p.id} src={urlApi(p.url)} alt={t('Page {n} de ma copie', { n: p.numero })} loading="lazy" className="fd-fixe w-full rounded-xl border border-line" />
            ))}
          </div>
        </details>
      )}

      <div className="mt-8 flex justify-end">
        <button type="button" onClick={supprimer} disabled={suppr}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold text-[#a23b34] hover:bg-[#fbecea]">
          <Trash2 className="h-4 w-4" aria-hidden /> {t('Supprimer cette correction et mes photos')}
        </button>
      </div>
    </Page>
  );
}

function QuestionComparee({ id, label, points, max, commentaire, lu, illisible, enonce, solution, ouvert }: {
  id: string; label: string; points: number | null; max: number; commentaire: string; lu: string; illisible: boolean;
  enonce: string; solution: string; ouvert: boolean;
}) {
  const [corrige, setCorrige] = useState(false);
  const ratio = points !== null && max ? points / max : null;
  const barre = ratio === null ? 'bg-[#e7e3dc]' : ratio >= 1 ? 'bg-brand' : ratio >= 0.5 ? 'bg-brand/60' : 'bg-gold';
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border border-line bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[14px] font-bold text-ink">{t('Question {q}', { q: label })}</h3>
        <span dir="ltr" className="fd-nums shrink-0 text-[14px] font-bold text-ink">{fmt(points)}<span className="font-medium text-ink-faint"> / {fmt(max)}</span></span>
      </div>
      <div className="fd-ltr mt-2 h-1.5 overflow-hidden rounded-full bg-[#f2f1ee]">
        <div className={`h-full rounded-full ${barre}`} style={{ width: `${Math.round((ratio ?? 0) * 100)}%` }} />
      </div>
      {commentaire && <TexteMaths texte={commentaire} className="mt-2.5 text-[13.5px] leading-relaxed text-ink-soft" />}

      <details open={ouvert} className="mt-3 rounded-xl bg-[#faf9f7] px-3 py-2">
        <summary className="cursor-pointer text-[12.5px] font-semibold text-ink-soft">{t('Ce que l’IA a lu sur ma copie')}</summary>
        {lu.trim() ? <TexteMaths texte={lu} className="mt-2 text-[13.5px] text-ink" />
          : <p className="mt-2 text-[13px] text-ink-faint">{illisible ? t('Réponse illisible.') : t('Aucune réponse trouvée pour cette question.')}</p>}
      </details>

      <button type="button" onClick={() => setCorrige((o) => !o)} aria-expanded={corrige}
        className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand-hover hover:underline">
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${corrige ? 'rotate-180' : ''}`} aria-hidden /> {t('Énoncé et corrigé')}
      </button>
      {corrige && (
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
