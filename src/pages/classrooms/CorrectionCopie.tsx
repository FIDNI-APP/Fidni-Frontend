/**
 * Vérification d'une copie par le professeur (15/10/2026) : le scan d'un côté, les questions de l'autre avec la note
 * proposée par l'IA, sa confiance, son commentaire et la transcription (corrigeable, puis « Renoter »). Le professeur
 * garde ou change chaque note, commente, puis valide. Clavier : Ctrl+Entrée valide et passe à la copie suivante,
 * Alt+↑ / Alt+↓ copie précédente / suivante.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Loader2, RotateCcw, Save, Sparkles,
} from 'lucide-react';
import { t } from '@/i18n';
import { SEO } from '@/components/layout/SEO';
import { Page, CardsSkeleton } from '@/components/space/Page';
import TipTapRenderer from '@/components/editor/TipTapRenderer';
import {
  copiesError, enTraitement, fmt, getCopie, recorriger, updateCopie, urlApi, type CopieDetail,
} from '@/lib/api/copiesApi';
import { STATUT_CLS, STATUT_LABEL } from './EvaluationPage';
import TexteMaths from '@/components/classrooms/copies/TexteMaths';

type Saisie = Record<string, { points: string; commentaire: string }>;

const RAISONS: Record<string, string> = {
  injection: 'La copie contient un texte qui réclame des points : l’IA l’a ignoré, vérifie.',
  hors_sujet: 'L’IA a lu la copie mais n’y a trouvé de réponse à aucune question du sujet : vérifie que l’évaluation utilise le bon sujet (onglet « Sujet et barème »), puis relance la correction.',
  illisible: 'Passage illisible',
  confiance: 'L’IA hésite',
  non_notee: 'Pas de note proposée',
};

export default function CorrectionCopie() {
  const { id = '', eid = '', copieId = '' } = useParams<{ id: string; eid: string; copieId: string }>();
  const navigate = useNavigate();
  const [c, setC] = useState<CopieDetail | null>(null);
  const [saisie, setSaisie] = useState<Saisie>({});
  const [comProf, setComProf] = useState('');
  const [modifie, setModifie] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const appliquer = useCallback((d: CopieDetail) => {
    setC(d);
    setSaisie(Object.fromEntries(d.questions.map((q) => {
      const f = d.finales[q.chemin];
      return [q.chemin, { points: f?.points === null || f?.points === undefined ? '' : String(f.points).replace('.', ','),
        commentaire: f?.commentaire || '' }];
    })));
    setComProf(d.commentaire_prof || '');
    setModifie(false);
  }, []);

  const charger = useCallback(() => getCopie(id, eid, copieId).then(appliquer)
    .catch((e) => setErr(copiesError(e, t('Copie introuvable.')))), [id, eid, copieId, appliquer]);
  useEffect(() => { setC(null); charger(); }, [charger]);
  useEffect(() => {
    if (!enTraitement(c?.statut)) return;
    const timer = setInterval(charger, 4000);
    return () => clearInterval(timer);
  }, [c?.statut, charger]);

  const total = useMemo(() => {
    if (!c) return null;
    let s = 0;
    for (const q of c.questions) {
      const v = Number(String(saisie[q.chemin]?.points ?? '').replace(',', '.'));
      if (saisie[q.chemin]?.points === '' || Number.isNaN(v)) return null;
      s += v;
    }
    return s;
  }, [c, saisie]);

  const corps = () => {
    if (!c) return {};
    // Toutes les questions à chaque fois : la valeur du professeur si elle diffère de la proposition de l'IA,
    // sinon null (on revient à la proposition de l'IA).
    const notes: Record<string, { points: number | null; commentaire: string | null }> = {};
    for (const q of c.questions) {
      const s = saisie[q.chemin];
      const pts = s.points.trim() === '' ? null : Number(s.points.replace(',', '.'));
      const iaPts = c.ia?.[q.chemin]?.points ?? null;
      const iaCom = c.ia?.[q.chemin]?.commentaire ?? '';
      notes[q.chemin] = {
        points: pts !== null && !Number.isNaN(pts) && pts !== iaPts ? pts : null,
        commentaire: s.commentaire !== iaCom ? s.commentaire : null,
      };
    }
    return { notes, commentaire_prof: comProf };
  };

  const enregistrer = async (valider?: boolean) => {
    if (!c) return null;
    setBusy(true);
    setErr('');
    try {
      const d = await updateCopie(id, eid, c.id, { ...corps(), ...(valider === undefined ? {} : { valider }) });
      appliquer(d);
      return d;
    } catch (e) {
      setErr(copiesError(e, t('Impossible d’enregistrer.')));
      return null;
    } finally { setBusy(false); }
  };

  const aller = useCallback((autre?: number | null) => {
    if (autre) navigate(`/classrooms/${id}/evaluations/${eid}/copies/${autre}`);
  }, [navigate, id, eid]);

  const validerSuivante = async () => {
    const d = await enregistrer(true);
    if (d?.statut === 'validee' && d.suivante) aller(d.suivante);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); validerSuivante(); }
      else if (e.altKey && e.key === 'ArrowDown') { e.preventDefault(); aller(c?.suivante); }
      else if (e.altKey && e.key === 'ArrowUp') { e.preventDefault(); aller(c?.precedente); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (err && !c) return <Page width="wide"><p className="text-[13.5px] text-[#a23b34]">{err}</p></Page>;
  if (!c) return <Page width="wide"><CardsSkeleton n={3} /></Page>;

  const enCours = enTraitement(c.statut);
  const drapeaux = c.drapeaux || [];
  const drapeauDe = (chemin: string) => drapeaux.find((d) => d.chemin === chemin);
  const noteSur = c.evaluation.note_sur;
  const max = c.max || 0;

  return (
    <Page width="full">
      <SEO title={`${c.eleve.username} — ${c.evaluation.titre}`} description={t('Correction d’une copie')} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link to={`/classrooms/${id}/evaluations/${eid}`} className="inline-flex min-h-10 items-center gap-1 rounded-xl px-2 text-[13px] font-semibold text-ink-faint hover:bg-[#f2f1ee] hover:text-ink">
          <ChevronLeft className="h-4 w-4" /> {c.evaluation.titre}
        </Link>
        <span className="text-ink-faint">/</span>
        <h1 className="text-[18px] font-bold text-ink">{c.eleve.username}</h1>
        <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${STATUT_CLS[c.statut]}`}>{t(STATUT_LABEL[c.statut])}</span>
        <div className="ms-auto flex items-center gap-1">
          <button type="button" disabled={!c.precedente} onClick={() => aller(c.precedente)} title={t('Copie précédente (Alt+↑)')}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-ink-soft hover:bg-[#f2f1ee] disabled:opacity-40"><ChevronLeft className="h-5 w-5" /></button>
          <button type="button" disabled={!c.suivante} onClick={() => aller(c.suivante)} title={t('Copie suivante (Alt+↓)')}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-ink-soft hover:bg-[#f2f1ee] disabled:opacity-40"><ChevronRight className="h-5 w-5" /></button>
        </div>
      </div>

      {enCours && (
        <p className="mb-4 inline-flex items-center gap-2 rounded-xl border border-brand-line bg-brand-soft px-4 py-2.5 text-[13.5px] text-brand-hover">
          <Loader2 className="h-4 w-4 animate-spin" /> {c.etape || t('Correction en cours…')}
        </p>
      )}
      {c.statut === 'erreur' && c.error && (
        <p className="mb-4 rounded-xl border border-[#f0d5d1] bg-[#fbecea] px-4 py-2.5 text-[13.5px] text-[#a23b34]">{c.error}</p>
      )}
      {drapeaux.filter((d) => !d.chemin && RAISONS[d.raison]).map((d) => (
        <p key={d.raison} className="mb-4 flex items-start gap-2 rounded-xl border border-gold-line bg-gold-soft px-4 py-2.5 text-[13.5px] text-gold-strong">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {t(RAISONS[d.raison])}
        </p>
      ))}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Scan */}
        <div className="flex flex-col gap-3 lg:max-h-[calc(100vh-150px)] lg:overflow-y-auto lg:pe-1">
          {c.pages.map((p) => (
            <figure key={p.id} id={`page-${p.numero}`} className="fd-fixe overflow-hidden rounded-xl border border-line bg-white">
              <img src={urlApi(p.url)} alt={t('Page {n} de la copie', { n: p.numero })} className="w-full" loading="lazy" />
              <figcaption className="border-t border-line px-3 py-1 text-[11.5px] text-ink-faint">{t('Page {n}', { n: p.numero })}</figcaption>
            </figure>
          ))}
          {!c.pages.length && <p className="rounded-xl border border-line bg-white p-6 text-center text-[13px] text-ink-faint">{t('Scan supprimé (conservation limitée) ou pas encore déposé.')}</p>}
        </div>

        {/* Notes */}
        <div className="flex flex-col gap-3 lg:max-h-[calc(100vh-150px)] lg:overflow-y-auto lg:pe-1">
          <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 shadow-[0_4px_14px_rgba(20,18,16,.05)]">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.08em] text-ink-faint">{t('Total')}</p>
              <p dir="ltr" className="fd-nums text-[20px] font-bold text-ink">
                {total === null ? '—' : fmt(total)}<span className="text-[13px] text-ink-faint"> / {fmt(max)}</span>
                {total !== null && max > 0 && <span className="ms-2 text-[14px] font-semibold text-brand-hover">{fmt(Math.round(total * noteSur * 100 / max) / 100)} / {noteSur}</span>}
              </p>
            </div>
            <div className="ms-auto flex flex-wrap gap-2">
              <button type="button" className="fd-btn-ghost min-h-10" disabled={busy || enCours} onClick={() => enregistrer()}>
                <Save className="h-4 w-4" /> {t('Enregistrer')}
              </button>
              {c.statut === 'validee' ? (
                <button type="button" className="fd-btn-ghost min-h-10" disabled={busy} onClick={() => enregistrer(false)}>
                  <RotateCcw className="h-4 w-4" /> {t('Annuler la validation')}
                </button>
              ) : (
                <button type="button" className="fd-btn-primary min-h-10" disabled={busy || enCours || total === null} onClick={validerSuivante}
                  title={t('Ctrl+Entrée')}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {c.suivante ? t('Valider et suivante') : t('Valider')}
                </button>
              )}
            </div>
            {modifie && <p className="w-full text-[12px] text-gold-strong">{t('Modifications non enregistrées.')}</p>}
            {err && <p className="w-full text-[12.5px] text-[#a23b34]">{err}</p>}
          </div>

          {c.questions.map((q) => (
            <QuestionCarte key={q.chemin} c={c} chemin={q.chemin} pas={c.evaluation.pas}
              saisie={saisie[q.chemin]} drapeau={drapeauDe(q.chemin)?.raison}
              onSaisie={(v) => { setSaisie((s) => ({ ...s, [q.chemin]: { ...s[q.chemin], ...v } })); setModifie(true); }}
              onRenoter={async (texte) => {
                setBusy(true);
                try {
                  await updateCopie(id, eid, c.id, { ...corps(), transcription: { [q.chemin]: texte } });
                  await recorriger(id, eid, c.id, [q.chemin]);
                  await charger();
                } catch (e) { setErr(copiesError(e, t('Impossible de renoter.'))); }
                finally { setBusy(false); }
              }} />
          ))}

          <div className="rounded-2xl border border-line bg-white p-4">
            <label htmlFor="com-prof" className="text-[13px] font-semibold text-ink">{t('Ton commentaire à l’élève')}</label>
            {c.commentaire_global && (
              <div className="mt-1 text-[12.5px] leading-relaxed text-ink-faint">
                <span className="font-semibold">{t('Proposé par l’IA :')}</span>
                <TexteMaths texte={c.commentaire_global} />
              </div>
            )}
            <textarea id="com-prof" dir="auto" value={comProf} rows={3} maxLength={2000}
              onChange={(e) => { setComProf(e.target.value); setModifie(true); }}
              className="mt-2 w-full rounded-xl border border-line p-3 text-[13.5px]" />
          </div>
          {!!c.transcription?._pages?.length && (
            <details className="rounded-2xl border border-line bg-white p-4 text-[13px]">
              <summary className="cursor-pointer font-semibold text-ink-soft">{t('Tout ce que l’IA a lu sur la copie')}</summary>
              {c.transcription._pages.map((texte, i) => (
                <div key={i} className="mt-3">
                  <p className="text-[11px] font-bold uppercase tracking-[.08em] text-ink-faint">{t('Page {n}', { n: i + 1 })}</p>
                  <TexteMaths texte={texte} className="mt-1 text-[13px] text-ink-soft" />
                </div>
              ))}
            </details>
          )}
          {!!c.transcription?._hors_question && (
            <details className="rounded-2xl border border-line bg-white p-4 text-[13px]">
              <summary className="cursor-pointer font-semibold text-ink-soft">{t('Écrit hors des questions')}</summary>
              <TexteMaths texte={c.transcription._hors_question} className="mt-2 text-ink-soft" />
            </details>
          )}
        </div>
      </div>
    </Page>
  );
}

function QuestionCarte({ c, chemin, pas, saisie, drapeau, onSaisie, onRenoter }: {
  c: CopieDetail; chemin: string; pas: number; saisie?: { points: string; commentaire: string };
  drapeau?: string; onSaisie: (v: Partial<{ points: string; commentaire: string }>) => void; onRenoter: (texte: string) => void;
}) {
  const q = c.questions.find((x) => x.chemin === chemin)!;
  const ia = c.ia?.[chemin];
  const tr = c.transcription?.[chemin];
  const [ouvert, setOuvert] = useState(false);
  const [edition, setEdition] = useState(false);
  const [texte, setTexte] = useState(tr?.texte || '');
  useEffect(() => { setTexte(tr?.texte || ''); }, [tr?.texte]);
  const f = c.finales[chemin];
  const choix = useMemo(() => {
    const out: number[] = [];
    for (let v = 0; v <= q.max + 1e-9; v += pas) out.push(Math.round(v * 100) / 100);
    return out.length <= 9 ? out : null;
  }, [q.max, pas]);
  const pts = saisie?.points ?? '';
  return (
    <section className={`rounded-2xl border bg-white p-4 ${drapeau ? 'border-gold-line' : 'border-line'}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-[14.5px] font-bold text-ink">{t('Question {q}', { q: q.label })}
            <span className="ms-1.5 text-[12.5px] font-medium text-ink-faint">/ {fmt(q.max)}</span></h2>
          {drapeau && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-gold-soft px-2 py-0.5 text-[11.5px] font-semibold text-gold-strong">
              <AlertTriangle className="h-3 w-3" /> {t(RAISONS[drapeau] || drapeau)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {ia && ia.points !== null && (
            <span className="text-[12px] text-ink-faint" title={t('Confiance de l’IA : {n} %', { n: Math.round(ia.confiance * 100) })}>
              <Sparkles className="me-0.5 inline h-3.5 w-3.5" />{fmt(ia.points)}
              <span className="ms-1">({Math.round(ia.confiance * 100)} %)</span>
            </span>
          )}
          <input inputMode="decimal" aria-label={t('Points de la question {q}', { q: q.label })} value={pts}
            onChange={(e) => onSaisie({ points: e.target.value })}
            className={`fd-nums w-16 rounded-lg border px-2 py-1.5 text-end text-[14px] font-semibold ${f?.source === 'prof' ? 'border-brand' : 'border-line'}`} />
        </div>
      </div>
      {choix && (
        <div className="mt-2 flex flex-wrap gap-1" role="group" aria-label={t('Points rapides')}>
          {choix.map((v) => {
            const actif = Number(pts.replace(',', '.')) === v && pts !== '';
            return (
              <button key={v} type="button" onClick={() => onSaisie({ points: String(v).replace('.', ',') })}
                className={`fd-nums min-h-8 min-w-9 rounded-lg border px-2 text-[12.5px] font-semibold ${actif ? 'border-ink bg-ink text-white' : 'border-line text-ink-soft hover:border-[#cfc9bf]'}`}>
                {fmt(v)}
              </button>
            );
          })}
        </div>
      )}
      <textarea dir="auto" value={saisie?.commentaire ?? ''} onChange={(e) => onSaisie({ commentaire: e.target.value })} rows={2} maxLength={1000}
        placeholder={t('Commentaire pour l’élève (facultatif)')} aria-label={t('Commentaire de la question {q}', { q: q.label })}
        className="mt-2 w-full rounded-xl border border-line p-2.5 text-[13px]" />
      {/* Aperçu du commentaire avec ses formules, tel que l'élève le verra. */}
      {(saisie?.commentaire ?? '').includes('$') && (
        <TexteMaths texte={saisie?.commentaire ?? ''} className="-mt-0.5 mb-1 rounded-xl bg-[#faf9f7] px-3 py-2 text-[13px] text-ink-soft" />
      )}
      <button type="button" onClick={() => setOuvert((o) => !o)} aria-expanded={ouvert}
        className="mt-1 inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink-faint hover:text-ink">
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${ouvert ? 'rotate-180' : ''}`} />
        {t('Réponse lue par l’IA, énoncé et corrigé')}
      </button>
      {ouvert && (
        <div className="mt-2 flex flex-col gap-3 border-t border-line pt-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.08em] text-ink-faint">{t('Réponse de l’élève (transcription)')}
              {tr?.page ? <a href={`#page-${tr.page}`} className="ms-2 normal-case tracking-normal text-brand-hover hover:underline">{t('page {n}', { n: tr.page })}</a> : null}</p>
            {tr?.texte ? <TexteMaths texte={texte} className="mt-1 rounded-xl bg-[#faf9f7] px-3 py-2 text-[13.5px] text-ink" />
              : <p className="mt-1 text-[13px] italic text-ink-faint">{t('Rien n’a été rangé sous cette question.')}</p>}
            <button type="button" onClick={() => setEdition((e) => !e)} aria-expanded={edition}
              className="mt-1 text-[12px] font-semibold text-brand-hover hover:underline">
              {edition ? t('Fermer') : t('Corriger la lecture de l’IA')}
            </button>
            {edition && (
              <textarea value={texte} onChange={(e) => setTexte(e.target.value)} rows={4}
                className="fd-ltr mt-1 w-full rounded-xl border border-line p-2.5 font-mono text-[12.5px]" />
            )}
            {texte !== (tr?.texte || '') && (
              <button type="button" className="fd-btn-ghost mt-1 min-h-9" onClick={() => onRenoter(texte)}>
                <RotateCcw className="h-4 w-4" /> {t('Renoter cette question avec ma transcription')}
              </button>
            )}
          </div>
          <div className="fd-card-preview text-[13px] text-ink-soft"><TipTapRenderer content={q.enonce_html} /></div>
          {q.solution_html && (
            <div className="rounded-xl bg-brand-soft/40 p-3">
              <p className="text-[11px] font-bold uppercase tracking-[.08em] text-brand-hover">{t('Corrigé')}</p>
              <div className="text-[13px]"><TipTapRenderer content={q.solution_html} /></div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
