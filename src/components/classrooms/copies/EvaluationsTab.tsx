/**
 * Onglet « Évaluations » d'une classe (15/10/2026).
 * Professeur : ses évaluations (copies déposées, corrigées, publiées) et la création d'une évaluation, à partir d'un
 * devoir de Fidni ou d'un sujet à lui (lu par l'IA). Élève : « Mes copies », ses copies corrigées publiées.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, ClipboardCheck, FileUp, Loader2, Plus, Search, Sparkles } from 'lucide-react';
import { t, dateLocale } from '@/i18n';
import { EmptyState, CardsSkeleton } from '@/components/space/Page';
import { ModalShell, FormError, fieldCls } from '@/components/enregistrements/ModalShell';
import {
  createEvaluation, copiesError, fmt, listEvaluations, mesCopies, searchSujets,
  type EvaluationResume, type MaCopieResume,
} from '@/lib/api/copiesApi';

const dateCourte = (iso: string | null) =>
  (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short', year: 'numeric' }) : '');

export const EvaluationsTab: React.FC<{ classroomId: number; isOwner: boolean }> = ({ classroomId, isOwner }) =>
  (isOwner ? <EvaluationsProf classroomId={classroomId} /> : <MesCopiesClasse classroomId={classroomId} />);

/* ───────────────────────────── Professeur */

function EvaluationsProf({ classroomId }: { classroomId: number }) {
  const [items, setItems] = useState<EvaluationResume[] | null>(null);
  const [quota, setQuota] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    listEvaluations(classroomId)
      .then((r) => { setItems(r.evaluations); setQuota(r.quota_restant); })
      .catch((e) => setError(copiesError(e, t('Impossible de charger les évaluations.'))));
  }, [classroomId]);

  if (error) return <p className="text-[13.5px] text-[#a23b34]">{error}</p>;
  if (!items) return <CardsSkeleton n={2} className="sm:grid-cols-2" />;

  const ouvrir = (id: number) => navigate(`/classrooms/${classroomId}/evaluations/${id}`);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-[13.5px] leading-relaxed text-ink-faint">
          {t('Dépose les copies de tes élèves : l’IA les lit et propose une note par question. Tu vérifies, tu valides, puis chaque élève reçoit sa copie corrigée avec ses points à retravailler.')}
        </p>
        <button type="button" className="fd-btn-primary min-h-10" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> {t('Nouvelle évaluation')}
        </button>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={ClipboardCheck} tone="ink" title={t('Aucune évaluation pour l’instant')}
          text={t('Crée une évaluation à partir d’un devoir de Fidni ou de ton propre sujet, puis dépose les copies.')}
          action={<button type="button" className="fd-btn-primary min-h-10" onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> {t('Nouvelle évaluation')}</button>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((e) => {
            const c = e.copies || {};
            const deposees = Object.entries(c).filter(([k]) => k !== 'vide').reduce((s, [, n]) => s + (n || 0), 0);
            const aVerifier = c.corrigee || 0;
            const enCours = (c.en_attente || 0) + (c.en_cours || 0);
            return (
              <Link key={e.id} to={`/classrooms/${classroomId}/evaluations/${e.id}`}
                className="fd-card block p-4 transition-colors hover:border-[#d8d4cc] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-[15.5px] font-semibold text-ink">{e.titre}</h3>
                    <p className="mt-0.5 text-[12.5px] text-ink-faint">
                      {[dateCourte(e.date), e.source === 'prive' ? t('Sujet privé') : t('Sujet Fidni'),
                        t('sur {n}', { n: e.note_sur })].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  {e.sujet_statut === 'a_verifier' && (
                    <span className="shrink-0 rounded-full bg-gold-soft px-2.5 py-0.5 text-[11.5px] font-semibold text-gold-strong">{t('Sujet à vérifier')}</span>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink-soft">
                  <span><b dir="ltr" className="fd-nums">{deposees}</b> {deposees > 1 ? t('copies déposées') : t('copie déposée')}</span>
                  {enCours > 0 && <span className="inline-flex items-center gap-1 text-brand-hover"><Loader2 className="h-3.5 w-3.5 animate-spin" /> {t('{n} en correction', { n: enCours })}</span>}
                  {aVerifier > 0 && <span className="text-gold-strong">{t('{n} à vérifier', { n: aVerifier })}</span>}
                  {(e.publiees || 0) > 0 && <span className="inline-flex items-center gap-1 text-brand-hover"><CheckCircle2 className="h-3.5 w-3.5" /> {t('{n} publiées', { n: e.publiees || 0 })}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
      {quota !== null && (
        <p className="mt-4 text-[12px] text-ink-faint">{t('Corrections par l’IA restantes ce mois-ci : {n}', { n: quota })}</p>
      )}
      <NouvelleEvaluation open={creating} classroomId={classroomId} onClose={() => setCreating(false)}
        onCreated={(id) => { setCreating(false); ouvrir(id); }} />
    </div>
  );
}

function NouvelleEvaluation({ open, classroomId, onClose, onCreated }: {
  open: boolean; classroomId: number; onClose: () => void; onCreated: (id: number) => void;
}) {
  const [source, setSource] = useState<'fidni' | 'prive'>('fidni');
  const [titre, setTitre] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [noteSur, setNoteSur] = useState(20);
  const [q, setQ] = useState('');
  const [resultats, setResultats] = useState<{ id: number; title: string; type: string }[]>([]);
  const [choisi, setChoisi] = useState<{ id: number; title: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const seq = useRef(0);

  useEffect(() => {
    if (source !== 'fidni' || !q.trim() || choisi) { setResultats([]); return; }
    const n = ++seq.current;
    const timer = setTimeout(() => {
      searchSujets(q).then((r) => { if (n === seq.current) setResultats(r); }).catch(() => undefined);
    }, 250);
    return () => clearTimeout(timer);
  }, [q, source, choisi]);

  const pret = !busy && (source === 'fidni' ? !!choisi : !!titre.trim());

  const submit = async () => {
    if (!pret) return;
    setBusy(true);
    setError('');
    try {
      const e = await createEvaluation(classroomId, {
        titre: titre.trim() || undefined, date: date || null, note_sur: noteSur,
        content_id: source === 'fidni' ? choisi?.id : null,
      });
      onCreated(e.id);
    } catch (e) {
      setError(copiesError(e, t('Impossible de créer l’évaluation.')));
    } finally { setBusy(false); }
  };

  const choix = (v: 'fidni' | 'prive', titreChoix: string, texte: string, Icon: typeof Search) => (
    <button type="button" onClick={() => setSource(v)} aria-pressed={source === v}
      className={`flex flex-1 items-start gap-2.5 rounded-xl border p-3 text-start transition-colors ${source === v
        ? 'border-brand bg-brand-soft/60' : 'border-line bg-white hover:border-[#cfc9bf]'}`}>
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${source === v ? 'text-brand-hover' : 'text-ink-faint'}`} />
      <span>
        <span className="block text-[13.5px] font-semibold text-ink">{titreChoix}</span>
        <span className="block text-[12px] leading-snug text-ink-faint">{texte}</span>
      </span>
    </button>
  );

  return (
    <ModalShell open={open} onClose={onClose} labelId="nouvelle-evaluation-titre" onSubmit={submit}
      title={t('Nouvelle évaluation')} subtitle={t('Le sujet donne le barème et le corrigé que l’IA utilise pour proposer les notes.')}>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {choix('fidni', t('Un devoir de Fidni'), t('Barème et corrigé déjà prêts.'), Search)}
        {choix('prive', t('Mon propre sujet'), t('Envoie le PDF : l’IA le lit, tu vérifies. Il reste privé.'), FileUp)}
      </div>

      {source === 'fidni' && (
        <div className="mt-4">
          <label className="mb-1 block text-[12px] font-semibold text-ink-faint" htmlFor="ev-recherche">{t('Devoir ou exercice')}</label>
          {choisi ? (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-brand-line bg-brand-soft/50 px-3 py-2.5">
              <span className="min-w-0 truncate text-[13.5px] font-semibold text-ink">{choisi.title}</span>
              <button type="button" className="shrink-0 text-[12.5px] font-semibold text-brand-hover hover:underline"
                onClick={() => { setChoisi(null); setQ(''); }}>{t('Changer')}</button>
            </div>
          ) : (
            <>
              <input id="ev-recherche" className={fieldCls} value={q} onChange={(e) => setQ(e.target.value)}
                placeholder={t('Ex. Devoir surveillé n° 2 — 2ème Bac SM')} autoComplete="off" />
              {resultats.length > 0 && (
                <ul className="mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-line bg-white p-1">
                  {resultats.map((r) => (
                    <li key={r.id}>
                      <button type="button" onClick={() => { setChoisi(r); setResultats([]); }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-start text-[13px] text-ink hover:bg-[#f7f6f3]">
                        <span className="shrink-0 rounded-md bg-[#f2f1ee] px-1.5 py-0.5 text-[10.5px] font-bold uppercase text-ink-faint">
                          {r.type === 'exam' ? t('Devoir') : t('Exercice')}
                        </span>
                        <span className="min-w-0 truncate">{r.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}

      <div className="mt-4">
        <label className="mb-1 block text-[12px] font-semibold text-ink-faint" htmlFor="ev-titre">
          {source === 'fidni' ? t('Titre (facultatif : celui du devoir)') : t('Titre')}
        </label>
        <input id="ev-titre" className={fieldCls} value={titre} onChange={(e) => setTitre(e.target.value)} maxLength={200}
          placeholder={t('Ex. Devoir surveillé n° 1')} />
      </div>
      <div className="mt-3 flex gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-[12px] font-semibold text-ink-faint" htmlFor="ev-date">{t('Date de l’épreuve')}</label>
          <input id="ev-date" type="date" className={fieldCls} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="w-28">
          <label className="mb-1 block text-[12px] font-semibold text-ink-faint" htmlFor="ev-sur">{t('Noté sur')}</label>
          <input id="ev-sur" type="number" min={1} max={100} className={fieldCls} value={noteSur}
            onChange={(e) => setNoteSur(Number(e.target.value) || 20)} />
        </div>
      </div>
      {error && <FormError>{error}</FormError>}
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className="fd-btn-ghost min-h-10" onClick={onClose}>{t('Annuler')}</button>
        <button type="submit" className="fd-btn-primary min-h-10" disabled={!pret}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {t('Créer')}
        </button>
      </div>
    </ModalShell>
  );
}

/* ───────────────────────────── Élève */

function MesCopiesClasse({ classroomId }: { classroomId: number }) {
  const [items, setItems] = useState<MaCopieResume[] | null>(null);
  useEffect(() => { mesCopies(classroomId).then(setItems).catch(() => setItems([])); }, [classroomId]);
  if (!items) return <CardsSkeleton n={2} className="sm:grid-cols-2" />;
  if (!items.length) {
    return <EmptyState icon={ClipboardCheck} tone="ink" title={t('Pas encore de copie corrigée')}
      text={t('Quand ton professeur publiera la correction d’une évaluation, ta copie corrigée apparaîtra ici.')} />;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((c) => (
        <Link key={c.id} to={`/mes-copies/${c.id}`}
          className="fd-card flex items-center justify-between gap-3 p-4 transition-colors hover:border-[#d8d4cc] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-semibold text-ink">{c.titre}</h3>
            <p className="mt-0.5 text-[12.5px] text-ink-faint">{dateCourte(c.date)}</p>
          </div>
          <span dir="ltr" className="fd-nums shrink-0 text-[20px] font-bold text-ink">
            {fmt(c.note)}<span className="text-[13px] font-semibold text-ink-faint"> / {c.note_sur}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
