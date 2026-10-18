/**
 * Feuille de correction à imprimer (18/10/2026) : la correction d'une copie (note, points et commentaire de chaque
 * question, mot du professeur, points faibles), en vraies pages A4 comme l'aperçu PDF des sujets (PagedSheet).
 *   prof    /classrooms/:id/evaluations/:eid/copies/:copieId/pdf   une copie
 *           /classrooms/:id/evaluations/:eid/corrections/pdf       toutes les copies notées, une feuille chacune
 *   eleve   /mes-copies/:id/pdf                                    sa copie publiée (ce qu'il voit déjà, sans transcription)
 * Commentaire retenu = celui du professeur s'il l'a changé, sinon celui de l'IA (notes_finales côté serveur) ; la
 * feuille ne dit pas qui l'a écrit, comme la copie de l'élève. Le contenu de la feuille reste en français.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Printer } from 'lucide-react';
import { t } from '@/i18n';
import { useAuth } from '@/contexts/AuthContext';
import { SEO } from '@/components/layout/SEO';
import PagedSheet, { type SheetBlock } from '@/components/paper/PagedSheet';
import { Rich, RichPart, richParts } from '@/components/paper/paperBlocks';
import { texteEnHtml } from '@/components/classrooms/copies/TexteMaths';
import { trackAction } from '@/lib/usage';
import {
  copiesError, fmt, getImpression, maCopie, type FeuilleCopie, type Impression, type QuestionBareme,
} from '@/lib/api/copiesApi';

interface Props { source: 'prof' | 'eleve' }

interface Options { enonce: boolean; corrige: boolean; reponse: boolean; valideesSeules: boolean }

const OPTIONS_KEY = 'fidni:feuille-correction';
const lireOptions = (): Partial<Options> => {
  try { return JSON.parse(localStorage.getItem(OPTIONS_KEY) || '{}') || {}; } catch { return {}; }
};

const dateFr = (iso: string | null) => (iso
  ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${iso}T12:00:00`))
  : '');

const pts = (n: number | null | undefined) => `${fmt(n)}`;

export default function FeuilleCorrection({ source }: Props) {
  // Feuille toujours claire (impression), même en mode sombre.
  useEffect(() => {
    const root = document.documentElement;
    const sombre = root.classList.contains('dark');
    root.classList.remove('dark');
    return () => { if (sombre) root.classList.add('dark'); };
  }, []);
  const { id = '', eid = '', copieId } = useParams<{ id: string; eid: string; copieId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<Impression | null>(null);
  const [err, setErr] = useState('');
  const [preparation, setPreparation] = useState(false);
  const [options, setOptionsState] = useState<Options>(() => ({
    enonce: false, corrige: false, reponse: false, valideesSeules: true, ...lireOptions(),
  }));
  const setOptions = (patch: Partial<Options>) => setOptionsState((o) => {
    const n = { ...o, ...patch };
    try { localStorage.setItem(OPTIONS_KEY, JSON.stringify(n)); } catch { /* réglages pour cette page seulement */ }
    return n;
  });
  const toutes = source === 'prof' && !copieId;

  useEffect(() => {
    let annule = false;
    (async () => {
      try {
        let d: Impression;
        if (source === 'eleve') {
          // Copie publiée : seulement ce que l'élève voit déjà (pas de transcription ni de part IA/professeur).
          const c = await maCopie(id);
          const nom = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || c.eleve.username;
          d = {
            evaluation: { ...c.evaluation, total_max: c.max },
            classe: c.classe,
            questions: c.questions,
            copies: [{
              id: c.id, statut: c.statut, validee: true, publiee: true, eleve: { ...c.eleve, nom },
              points: c.points, max: c.max, note: c.note, note_sur: c.note_sur, finales: c.finales, transcription: {},
              commentaire_prof: c.commentaire_prof, commentaire_global: c.commentaire_global, points_faibles: c.points_faibles,
            }],
          };
        } else {
          d = await getImpression(id, eid, copieId);
        }
        if (!annule) setData(d);
      } catch (e) {
        if (!annule) setErr(copiesError(e, t('Impossible de charger la correction.')));
      }
    })();
    return () => { annule = true; };
  }, [source, id, eid, copieId, user?.first_name, user?.last_name]);

  const nonValidees = data ? data.copies.filter((c) => !c.validee).length : 0;
  const copies = useMemo(() => {
    if (!data) return [];
    return toutes && options.valideesSeules && nonValidees < data.copies.length
      ? data.copies.filter((c) => c.validee) : data.copies;
  }, [data, toutes, options.valideesSeules, nonValidees]);

  // Titre de l'onglet = nom proposé pour le fichier PDF.
  const titre = data ? (copies.length === 1 && !toutes
    ? `Correction — ${data.evaluation.titre} — ${copies[0].eleve.nom}`
    : `Corrections — ${data.evaluation.titre}`) : '';
  useEffect(() => {
    if (!titre) return;
    const avant = document.title;
    document.title = titre;
    return () => { document.title = avant; };
  }, [titre]);

  const retour = () => {
    if (window.history.length > 1) navigate(-1);
    else if (source === 'eleve') navigate(`/mes-copies/${id}`);
    else navigate(copieId ? `/classrooms/${id}/evaluations/${eid}/copies/${copieId}` : `/classrooms/${id}/evaluations/${eid}`);
  };

  const imprimer = async () => {
    setPreparation(true);
    try {
      // Polices (KaTeX) chargées avant d'imprimer, sinon des formules sortent en police de secours.
      await document.fonts?.ready;
    } finally { setPreparation(false); }
    trackAction('imprimer');
    window.print();
  };

  if (err || !data) {
    return (
      <div className="fc-desk fc-center">
        <SEO title={t('Feuille de correction')} noindex />
        {err ? (
          <>
            <p style={{ color: '#6b6862', marginBottom: 16 }}>{err}</p>
            <button type="button" className="fd-btn-primary" onClick={retour}>{t('Retour')}</button>
          </>
        ) : <Loader2 className="h-7 w-7 animate-spin" style={{ color: '#6b6862' }} />}
        <style>{STYLES}</style>
      </div>
    );
  }

  const aCorrige = data.questions.some((q) => q.solution_html);
  const aReponse = source === 'prof' && copies.some((c) => Object.values(c.transcription).some((x) => x.texte.trim()));

  return (
    <div className="fc-desk">
      <SEO title={titre} noindex />
      {/* Barre d'options : écran seulement. */}
      <div className="fc-toolbar print:hidden">
        <div className="fc-toolbar-inner">
          <button type="button" className="fc-btn" onClick={retour}><ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {t('Retour')}</button>
          <div className="fc-toolbar-title">
            {toutes ? t('Toutes les corrections ({n})', { n: copies.length }) : t('Feuille de correction')}
          </div>
          <div className="fc-toolbar-actions">
            <label className="fc-check"><input type="checkbox" checked={options.enonce} onChange={(e) => setOptions({ enonce: e.target.checked })} /> {t('Inclure l’énoncé')}</label>
            {aCorrige && <label className="fc-check"><input type="checkbox" checked={options.corrige} onChange={(e) => setOptions({ corrige: e.target.checked })} /> {t('Inclure le corrigé')}</label>}
            {aReponse && <label className="fc-check"><input type="checkbox" checked={options.reponse} onChange={(e) => setOptions({ reponse: e.target.checked })} /> {t('Inclure la réponse de l’élève (transcription)')}</label>}
            {toutes && nonValidees > 0 && nonValidees < data.copies.length && (
              <label className="fc-check"><input type="checkbox" checked={options.valideesSeules} onChange={(e) => setOptions({ valideesSeules: e.target.checked })} /> {t('Copies validées seulement')}</label>
            )}
            <button type="button" className="fd-btn-primary" onClick={imprimer} disabled={preparation || !copies.length}>
              {preparation ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />} {t('Imprimer')}
            </button>
          </div>
        </div>
        <p className="fc-hint">
          {source === 'prof' && copies.some((c) => !c.validee) && <b>{t('Attention : certaines corrections ne sont pas encore validées.')} </b>}
          {t('Ce que tu vois est exactement ce qui sera imprimé. Choisis « Enregistrer au format PDF » dans la fenêtre d’impression pour obtenir un fichier.')}
        </p>
      </div>

      {copies.length === 0 ? (
        <p className="fc-vide">{t('Aucune copie corrigée à imprimer pour l’instant.')}</p>
      ) : (
        <div dir="ltr">
          {copies.map((c) => (
            <div key={c.id} className="fc-copie">
              <PagedSheet blocks={feuille(data, c, options, source)} density={0}
                version={JSON.stringify([c.id, options, data.evaluation.id])}
                footer={`Fidni · ${data.evaluation.titre} · ${c.eleve.nom}`} />
            </div>
          ))}
        </div>
      )}
      <style>{STYLES}</style>
    </div>
  );
}

/** Blocs d'une feuille (jamais coupés d'une page à l'autre ; une question garde son commentaire et ses suites). */
function feuille(d: Impression, c: FeuilleCopie, o: Options, source: Props['source']): SheetBlock[] {
  const ev = d.evaluation;
  const out: SheetBlock[] = [];
  const k = (s: string) => `${c.id}:${s}`;
  out.push({ key: k('top'), node: (
    <header className="fp-top">
      <div className="fp-brand">
        <img src="/android-chrome-192x192.png" alt="" />
        <div><strong>Fidni</strong><small>fidni.fr</small></div>
      </div>
      <div className="fp-top-right"><strong>Feuille de correction</strong><small>{d.classe.name}</small></div>
    </header>
  ) });
  out.push({ key: k('info'), node: (
    <div className="fp-info">
      <div>
        <p><b>Élève :</b> {c.eleve.nom}</p>
        <p><b>Classe :</b> {d.classe.name}</p>
      </div>
      <div className="fp-info-right">
        {ev.date && <p><b>Date :</b> {dateFr(ev.date)}</p>}
        <p><b>Barème :</b> {pts(ev.total_max)} points</p>
      </div>
    </div>
  ) });
  out.push({ key: k('titre'), keepWithNext: true, node: (
    <>
      <h1 className="fp-title">{ev.titre}</h1>
      <div className="fc-note">
        <span className="fc-note-val">{fmt(c.note)}<small> / {c.note_sur}</small></span>
        <span className="fc-note-pts">{pts(c.points)} points sur {pts(c.max)}</span>
      </div>
    </>
  ) });
  if (c.commentaire_prof.trim() || c.commentaire_global.trim()) {
    out.push({ key: k('mot'), node: (
      <div className="fc-mot">
        <span className="fp-sol-label">Appréciation</span>
        {c.commentaire_prof.trim() && <Rich content={{ html: texteEnHtml(c.commentaire_prof) }} />}
        {c.commentaire_global.trim() && <Rich content={{ html: texteEnHtml(c.commentaire_global) }} className={c.commentaire_prof.trim() ? 'fc-mot-2' : ''} />}
      </div>
    ) });
  }
  out.push({ key: k('qtitre'), keepWithNext: true, node: <h2 className="fc-h2">Correction question par question</h2> });
  d.questions.forEach((q, i) => out.push(...question(c, q, o, source, k(`q${i}`))));
  if (c.points_faibles.length) {
    out.push({ key: k('pf'), node: (
      <div className="fc-pf">
        <h2 className="fc-h2">À retravailler</h2>
        <p className="fc-pf-intro">Les théorèmes les moins réussis dans cette évaluation.</p>
        <ul>
          {c.points_faibles.map((p) => (
            <li key={p.theoreme}>
              <strong>{p.theoreme}</strong> — réussi à {p.taux} %
              {p.questions.length > 0 && <> (question{p.questions.length > 1 ? 's' : ''} {p.questions.join(', ')})</>}
              {p.chapitre && <span className="fc-pf-ch"> · chapitre « {p.chapitre.nom} »</span>}
            </li>
          ))}
        </ul>
      </div>
    ) });
  }
  return out;
}

function question(c: FeuilleCopie, q: QuestionBareme, o: Options, source: Props['source'], key: string): SheetBlock[] {
  const f = c.finales[q.chemin];
  const ratio = f?.points !== null && f?.points !== undefined && q.max ? f.points / q.max : null;
  const ton = ratio === null ? '' : ratio >= 1 ? 'is-ok' : ratio >= 0.5 ? 'is-mid' : 'is-low';
  const tr = source === 'prof' && o.reponse ? c.transcription[q.chemin] : undefined;
  const suites: SheetBlock[] = [];
  if (tr && (tr.texte.trim() || tr.illisible)) {
    suites.push({ key: `${key}:rep`, node: (
      <div className="fc-rep">
        <span className="fp-sol-label">Réponse de l’élève (transcription)</span>
        {tr.texte.trim() && !/^\[illisible\]$/i.test(tr.texte.trim()) ? <Rich content={{ html: texteEnHtml(tr.texte) }} /> : <p className="fc-muet">Passage illisible.</p>}
      </div>
    ) });
  }
  if (o.corrige && q.solution_html) {
    // Corrigé découpé en paragraphes : un long corrigé peut changer de page entre deux paragraphes.
    richParts(q.solution_html).forEach((h, i) => suites.push({ key: `${key}:sol${i}`, node: (
      <div className={`fc-sol ${i === 0 ? 'is-first' : ''}`}>
        {i === 0 && <span className="fp-sol-label">Corrigé</span>}
        <RichPart html={h} />
      </div>
    ) }));
  }
  const tete: SheetBlock = { key, keepWithNext: suites.length > 0, node: (
    <section className={`fc-q ${ton}`}>
      <div className="fc-q-head">
        <span className="fc-q-label">Question {q.label}</span>
        <span className="fc-q-pts">{fmt(f?.points ?? null)} / {fmt(q.max)}</span>
      </div>
      {o.enonce && q.enonce_html && <Rich content={{ html: q.enonce_html }} className="fc-enonce" />}
      {f?.commentaire?.trim()
        ? <Rich content={{ html: texteEnHtml(f.commentaire) }} className="fc-com" />
        : <p className="fc-muet">{ratio === 1 ? 'Réponse juste.' : 'Pas de commentaire.'}</p>}
    </section>
  ) };
  return [tete, ...suites];
}

const STYLES = `
  .fc-desk { min-height: 100vh; background: #e9e7e3; padding: 0 16px 48px; }
  .fc-center { display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .fc-toolbar { position: sticky; top: 0; z-index: 10; margin: 0 -16px 28px; padding: 12px 16px 10px;
    background: rgba(250, 249, 247, .96); border-bottom: 1px solid #e7e3dc; backdrop-filter: blur(6px); }
  .fc-toolbar-inner { max-width: 1040px; margin: 0 auto; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .fc-toolbar-title { font-weight: 700; font-size: 14px; color: #1a1a1a; }
  .fc-toolbar-actions { margin-inline-start: auto; display: flex; gap: 8px 14px; align-items: center; flex-wrap: wrap; }
  .fc-btn { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: #6b6862;
    padding: 7px 10px; border-radius: 10px; border: 1px solid #e7e3dc; background: #fff; min-height: 36px; }
  .fc-btn:hover { color: #1a1a1a; }
  .fc-check { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; color: #33302b; cursor: pointer; min-height: 36px; }
  .fc-check input { accent-color: #1a7a4a; width: 15px; height: 15px; }
  .fc-hint { max-width: 1040px; margin: 6px auto 0; font-size: 12px; color: #9a958c; }
  .fc-hint b { color: #9a6e1c; font-weight: 600; }
  .fc-vide { text-align: center; color: #6b6862; margin-top: 60px; font-size: 14px; }
  .fc-copie + .fc-copie { margin-top: 36px; }

  /* Feuille (même famille que les sujets : components/paper/sheetStyles) */
  .fc-note { display: flex; align-items: baseline; justify-content: center; gap: 14pt; margin: 4pt 0 10pt;
    font-family: 'DM Sans', system-ui, sans-serif; }
  .fc-note-val { font-size: calc(var(--fp-fs, 11pt) * 1.9); font-weight: 700; color: #15633c; }
  .fc-note-val small { font-size: .55em; color: #6b6862; font-weight: 600; }
  .fc-note-pts { font-size: calc(var(--fp-fs, 11pt) * .9); color: #6b6862; }
  .fc-mot { margin: 0 0 8pt; padding: 5pt 9pt; border: 0.6pt solid #cfe3d6; border-left: 2.4pt solid #1a7a4a;
    border-radius: 3pt; background: #f3f8f5; }
  .fc-mot-2 { margin-top: 3pt; color: #33302b; }
  .fc-h2 { font-family: 'DM Sans', system-ui, sans-serif; font-size: calc(var(--fp-fs, 11pt) * .95); font-weight: 700;
    letter-spacing: .05em; text-transform: uppercase; color: #33302b; margin: 10pt 0 5pt; padding-bottom: 2pt;
    border-bottom: 0.6pt solid #cfcdc8; }
  .fc-q { padding: 5pt 0 4pt 8pt; margin-top: 6pt; border-left: 2.4pt solid #cfcdc8; }
  .fc-q.is-ok { border-left-color: #1a7a4a; }
  .fc-q.is-mid { border-left-color: #7fb89a; }
  .fc-q.is-low { border-left-color: #c0892f; }
  .fc-q-head { display: flex; justify-content: space-between; align-items: baseline; gap: 10pt; margin-bottom: 2pt; }
  .fc-q-label { font-weight: 700; }
  .fc-q-pts { font-family: 'DM Sans', system-ui, sans-serif; font-weight: 700; white-space: nowrap; }
  .fc-enonce { color: #33302b; font-style: italic; margin-bottom: 3pt; }
  .fc-com { color: #1a1a1a; }
  .fc-muet { color: #6b6862; font-style: italic; margin: 0; }
  .fc-rep { margin: 3pt 0 0 10pt; padding: 3pt 8pt; border: 0.6pt dashed #cfcdc8; border-radius: 3pt;
    font-size: calc(var(--fp-fs, 11pt) * .93); }
  .fc-sol { margin: 0 0 0 10pt; padding: 0 8pt 2pt; background: #f3f8f5; border-left: 2pt solid #1a7a4a;
    font-size: calc(var(--fp-fs, 11pt) * .93); }
  .fc-sol.is-first { margin-top: 3pt; padding-top: 3pt; }
  .fc-pf ul { margin: 0; padding-left: 14pt; list-style: disc; }
  .fc-pf li { margin-bottom: 2pt; }
  .fc-pf-intro { margin: 0 0 4pt; color: #6b6862; font-size: calc(var(--fp-fs, 11pt) * .9); }
  .fc-pf-ch { color: #6b6862; }

  @media print {
    html, body, #root, #root div:has(.fp-pages) { background: #fff !important; min-height: 0 !important; }
    .fc-toolbar { display: none !important; }
    .fc-desk { background: none; padding: 0; min-height: 0; }
    .fc-copie + .fc-copie { margin-top: 0; break-before: page; page-break-before: always; }
  }
`;
