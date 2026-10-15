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
  const [scan, setScan] = useState(true);

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

      <div className="mb-3 flex justify-end">
        <button type="button" onClick={() => setScan((v) => !v)} className="fd-btn-ghost min-h-9 text-[12.5px]">
          {scan ? t('Masquer le scan') : t('Afficher le scan')}
        </button>
      </div>
      <div className={`grid gap-5 ${scan ? 'lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]' : ''}`}>
        {/* Scan */}
        {scan && <div className="flex flex-col gap-3 lg:sticky lg:top-4 lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto lg:pe-1">
          {c.pages.map((p) => (
            <figure key={p.id} id={`page-${p.numero}`} className="fd-fixe overflow-hidden rounded-xl border border-line bg-white">
              <img src={urlApi(p.url)} alt={t('Page {n} de la copie', { n: p.numero })} className="w-full" loading="lazy" />
              <figcaption className="border-t border-line px-3 py-1 text-[11.5px] text-ink-faint">{t('Page {n}', { n: p.numero })}</figcaption>
            </figure>
          ))}
          {!c.pages.length && <p className="rounded-xl border border-line bg-white p-6 text-center text-[13px] text-ink-faint">{t('Scan supprimé (conservation limitée) ou pas encore déposé.')}</p>}
        </div>}

        {/* Notes */}
        <div className="flex flex-col gap-4">
          <div className="sticky top-2 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 shadow-[0_4px_14px_rgba(20,18,16,.05)]">
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
            <textarea id="com-prof" dir="auto" value={comProf} rows={4} maxLength={2000}
              onChange={(e) => { setComProf(e.target.value); setModifie(true); }}
              placeholder={t('Formules entre $…$, par exemple $x \\neq 0$')}
              className="mt-2 w-full rounded-xl border border-line p-3 text-[14px]" />
            {comProf.includes('$') && <TexteMaths texte={comProf} className="mt-2 rounded-xl bg-[#faf9f7] px-4 py-2.5 text-[14px] text-ink" />}
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
  const [corrige, setCorrige] = useState(false);
  const [edition, setEdition] = useState(false);
  const [editCom, setEditCom] = useState(false);
  const [texte, setTexte] = useState(tr?.texte || '');
  useEffect(() => { setTexte(tr?.texte || ''); }, [tr?.texte]);
  const f = c.finales[chemin];
  const choix = useMemo(() => {
    const out: number[] = [];
    for (let v = 0; v <= q.max + 1e-9; v += pas) out.push(Math.round(v * 100) / 100);
    return out.length <= 9 ? out : null;
  }, [q.max, pas]);
  const pts = saisie?.points ?? '';
  const com = saisie?.commentaire ?? '';
  return (
    <section className={`rounded-2xl border bg-white p-5 ${drapeau ? 'border-gold-line' : 'border-line'}`}>
      {/* En-tête : question, barème, proposition de l'IA, note retenue */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[16px] font-bold text-ink">{t('Question {q}', { q: q.label })}
            <span dir="ltr" className="ms-2 text-[13.5px] font-medium text-ink-faint">/ {fmt(q.max)}</span></h2>
          {drapeau && (
            <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-gold-soft px-2.5 py-0.5 text-[12px] font-semibold text-gold-strong">
              <AlertTriangle className="h-3.5 w-3.5" /> {t(RAISONS[drapeau] || drapeau)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {ia && ia.points !== null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#f2f1ee] px-2.5 py-1 text-[12.5px] text-ink-soft"
              title={t('Confiance de l’IA : {n} %', { n: Math.round(ia.confiance * 100) })}>
              <Sparkles className="h-3.5 w-3.5" /> {t('IA')} <b dir="ltr" className="fd-nums">{fmt(ia.points)}</b>
              <span className="text-ink-faint">· {Math.round(ia.confiance * 100)} %</span>
            </span>
          )}
          <input inputMode="decimal" aria-label={t('Points de la question {q}', { q: q.label })} value={pts}
            onChange={(e) => onSaisie({ points: e.target.value })}
            className={`fd-nums w-20 rounded-xl border-2 px-2 py-2 text-end text-[17px] font-bold ${f?.source === 'prof' ? 'border-brand' : 'border-line'}`} />
        </div>
      </div>

      {/* Énoncé, en rappel */}
      <div className="fd-card-preview mt-3 text-[13px] text-ink-faint"><TipTapRenderer content={q.enonce_html} /></div>

      {/* Réponse de l'élève, lue par l'IA (toujours visible, formules rendues) */}
      <div className="mt-3 rounded-xl border border-line bg-[#faf9f7] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[.08em] text-ink-faint">{t('Réponse de l’élève')}
            {tr?.page ? <a href={`#page-${tr.page}`} className="ms-2 normal-case tracking-normal text-brand-hover hover:underline">{t('page {n}', { n: tr.page })}</a> : null}</p>
          <button type="button" onClick={() => setEdition((e) => !e)} aria-expanded={edition}
            className="text-[12px] font-semibold text-brand-hover hover:underline">
            {edition ? t('Fermer') : t('Corriger la lecture de l’IA')}
          </button>
        </div>
        {texte.trim() ? <TexteMaths texte={texte} className="mt-1.5 text-[15px] leading-relaxed text-ink" />
          : <p className="mt-1.5 text-[14px] italic text-ink-faint">{t('Rien n’a été rangé sous cette question.')}</p>}
        {edition && (
          <textarea value={texte} onChange={(e) => setTexte(e.target.value)} rows={5}
            className="fd-ltr mt-2 w-full rounded-xl border border-line bg-white p-3 font-mono text-[13px]" />
        )}
        {texte !== (tr?.texte || '') && (
          <button type="button" className="fd-btn-ghost mt-2 min-h-9" onClick={() => onRenoter(texte)}>
            <RotateCcw className="h-4 w-4" /> {t('Renoter cette question avec ma transcription')}
          </button>
        )}
      </div>

      {/* Points rapides */}
      {choix && (
        <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label={t('Points rapides')}>
          {choix.map((v) => {
            const actif = Number(pts.replace(',', '.')) === v && pts !== '';
            return (
              <button key={v} type="button" onClick={() => onSaisie({ points: String(v).replace('.', ',') })}
                className={`fd-nums min-h-10 min-w-11 rounded-xl border px-2.5 text-[14px] font-semibold ${actif ? 'border-ink bg-ink text-white' : 'border-line text-ink-soft hover:border-[#cfc9bf]'}`}>
                {fmt(v)}
              </button>
            );
          })}
        </div>
      )}

      {/* Commentaire pour l'élève : rendu (formules), modifiable */}
      <div className="mt-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[.08em] text-ink-faint">{t('Commentaire pour l’élève')}</p>
          <button type="button" onClick={() => setEditCom((e) => !e)} aria-expanded={editCom}
            className="text-[12px] font-semibold text-brand-hover hover:underline">
            {editCom ? t('Fermer') : com ? t('Modifier') : t('Écrire un commentaire')}
          </button>
        </div>
        {editCom && (
          <textarea dir="auto" value={com} onChange={(e) => onSaisie({ commentaire: e.target.value })} rows={3} maxLength={1000} autoFocus
            placeholder={t('Formules entre $…$, par exemple $x \\neq 0$')} aria-label={t('Commentaire de la question {q}', { q: q.label })}
            className="mt-1.5 w-full rounded-xl border border-line p-3 text-[14px]" />
        )}
        {com.trim()
          ? <TexteMaths texte={com} className="mt-1.5 rounded-xl border border-gold-line/60 bg-gold-soft/40 px-4 py-2.5 text-[14.5px] leading-relaxed text-ink" />
          : !editCom && <p className="mt-1 text-[13px] italic text-ink-faint">{t('Pas de commentaire.')}</p>}
      </div>

      {/* Corrigé */}
      {q.solution_html && (
        <>
          <button type="button" onClick={() => setCorrige((o) => !o)} aria-expanded={corrige}
            className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink-faint hover:text-ink">
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${corrige ? 'rotate-180' : ''}`} /> {t('Corrigé')}
          </button>
          {corrige && (
            <div className="mt-2 rounded-xl bg-brand-soft/40 p-4 text-[14px]"><TipTapRenderer content={q.solution_html} /></div>
          )}
        </>
      )}
    </section>
  );
}
