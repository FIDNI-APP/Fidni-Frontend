// « Faire corriger ma copie » (20/10/2026, fonction cachée) : bouton flottant en bas à droite de la page d'un examen,
// comme celui de la Fiche TD. Il n'existe que pour les administrateurs et les personnes à qui un administrateur a donné
// des corrections (GET /correction-ia/acces/). Un clic ouvre un panneau : on y dépose les photos (ou le PDF) de sa copie,
// l'IA la corrige en comparant ce qu'elle lit au corrigé de Fidni, puis la page /correction-ia/:id montre où les points
// ont été perdus.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, FileText, Loader2, ScanText, Sparkles, Upload, X } from 'lucide-react';
import { t, dateLocale } from '@/i18n';
import { copiesError, fmt } from '@/lib/api/copiesApi';
import {
  getAcces, mesCorrections, soumettre, type AccesCorrection, type CorrectionResume,
} from '@/lib/api/correctionIaApi';

const ACCEPT = 'image/*,.pdf,application/pdf';
const PAGES_MAX = 12;

export const CorrectionIAButton: React.FC<{ contentId: number | string; enabled: boolean }> = ({ contentId, enabled }) => {
  const navigate = useNavigate();
  const [acces, setAcces] = useState<AccesCorrection | null>(null);
  const [ouvert, setOuvert] = useState(false);
  const [fichiers, setFichiers] = useState<File[]>([]);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const [anciennes, setAnciennes] = useState<CorrectionResume[]>([]);
  const entree = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!enabled) return undefined;
    let vivant = true;
    getAcces().then((a) => { if (vivant) setAcces(a); }).catch(() => { if (vivant) setAcces(null); });
    return () => { vivant = false; };
  }, [enabled, contentId]);

  const recharger = useCallback(() => {
    mesCorrections(contentId).then((r) => { setAnciennes(r.corrections); setAcces({ acces: r.acces, restant: r.restant, limite: r.limite }); })
      .catch(() => undefined);
  }, [contentId]);

  useEffect(() => { if (ouvert) recharger(); }, [ouvert, recharger]);

  useEffect(() => {
    if (!ouvert) return undefined;
    const fermer = (e: KeyboardEvent) => { if (e.key === 'Escape' && !envoi) setOuvert(false); };
    window.addEventListener('keydown', fermer);
    return () => window.removeEventListener('keydown', fermer);
  }, [ouvert, envoi]);

  if (!enabled || !acces?.acces) return null;

  const epuise = acces.restant !== null && acces.restant <= 0;
  const ajouter = (liste: FileList | null) => {
    if (!liste) return;
    setErreur('');
    // Copie tout de suite : la FileList est « vivante », vider l'entrée juste après la viderait aussi.
    const choisis = Array.from(liste);
    setFichiers((avant) => [...avant, ...choisis].slice(0, PAGES_MAX));
    if (entree.current) entree.current.value = '';
  };

  const envoyer = async () => {
    if (!fichiers.length || envoi) return;
    setEnvoi(true);
    setErreur('');
    try {
      const r = await soumettre(contentId, fichiers);
      navigate(`/correction-ia/${r.id}`);
    } catch (e) {
      setErreur(copiesError(e, t('L’envoi a échoué. Réessaie dans un instant.')));
      setEnvoi(false);
    }
  };

  return (
    <>
      <div aria-hidden className="h-16 md:hidden" />
      {!ouvert && (
        <button type="button" onClick={() => setOuvert(true)} data-tour="correction-ia"
          className="fixed bottom-[calc(var(--fd-tabbar-h,0px)+12px)] end-3 z-[45] inline-flex min-h-12 items-center gap-2 rounded-full bg-brand ps-2 pe-4 text-white shadow-[0_10px_28px_rgba(26,122,74,.38)] transition-transform focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/30 active:scale-[.97] print:hidden md:bottom-6 md:end-6 md:gap-2.5 md:ps-4 md:pe-5 [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:bg-brand-hover">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15"><ScanText className="h-[18px] w-[18px]" aria-hidden /></span>
          <span className="text-start leading-tight">
            <span className="block text-[14px] font-semibold">{t('Corriger ma copie')}</span>
            <span className="hidden text-[11.5px] text-white/80 md:block">
              {acces.restant === null ? t('Corrigée par l’IA, comparée au corrigé')
                : t('{n} correction(s) restante(s)', { n: acces.restant })}
            </span>
          </span>
        </button>
      )}

      {ouvert && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 print:hidden md:items-center md:p-6"
          onMouseDown={(e) => { if (e.target === e.currentTarget && !envoi) setOuvert(false); }}>
          <div role="dialog" aria-modal="true" aria-label={t('Faire corriger ma copie')}
            className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl md:rounded-3xl">
            <div className="flex items-start gap-3 border-b border-line px-5 py-4">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-hover"><Sparkles className="h-[18px] w-[18px]" aria-hidden /></span>
              <div className="min-w-0 flex-1">
                <h2 className="text-[16px] font-bold text-ink">{t('Faire corriger ma copie')}</h2>
                <p className="mt-0.5 text-[12.5px] leading-snug text-ink-faint">
                  {t('Photographie ta copie de ce sujet : l’IA lit ce que tu as écrit, le compare au corrigé de Fidni et te montre où tu as perdu des points.')}
                </p>
              </div>
              <button type="button" onClick={() => !envoi && setOuvert(false)} aria-label={t('Fermer')}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-[#f2f1ee]"><X className="h-4 w-4" /></button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <p className="rounded-xl bg-[#f7f6f2] px-3 py-2 text-[12.5px] text-ink-soft">
                {acces.restant === null ? t('Corrections illimitées (administrateur).')
                  : t('Il te reste {n} correction(s) sur {m}.', { n: acces.restant, m: acces.limite ?? 0 })}
              </p>

              <div>
                <input ref={entree} type="file" accept={ACCEPT} multiple className="sr-only" id="correction-fichiers"
                  onChange={(e) => ajouter(e.target.files)} disabled={epuise || envoi} />
                <label htmlFor="correction-fichiers"
                  className={`flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed px-4 py-5 text-center transition-colors ${epuise ? 'cursor-not-allowed border-line text-ink-faint' : 'border-brand-line text-ink-soft hover:border-brand hover:bg-brand-soft/40'}`}>
                  <Upload className="h-5 w-5 text-brand-hover" aria-hidden />
                  <span className="text-[13.5px] font-semibold text-ink">{t('Ajouter les photos ou le PDF de ma copie')}</span>
                  <span className="text-[12px] text-ink-faint">{t('Dans l’ordre des pages · {n} pages au plus', { n: PAGES_MAX })}</span>
                </label>
                {fichiers.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {fichiers.map((f, i) => (
                      <li key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-[12.5px]">
                        <FileText className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden />
                        <span className="min-w-0 flex-1 truncate text-ink">{f.name}</span>
                        <button type="button" onClick={() => setFichiers((l) => l.filter((_, k) => k !== i))} disabled={envoi}
                          aria-label={t('Retirer {nom}', { nom: f.name })} className="text-ink-faint hover:text-ink"><X className="h-3.5 w-3.5" /></button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {erreur && <p role="alert" className="rounded-xl bg-[#fbecea] px-3 py-2 text-[13px] text-[#a23b34]">{erreur}</p>}
              {epuise && <p role="alert" className="rounded-xl bg-gold-soft px-3 py-2 text-[13px] text-gold-strong">{t('Tu as utilisé toutes tes corrections.')}</p>}

              {anciennes.length > 0 && (
                <div>
                  <h3 className="text-[11.5px] font-bold uppercase tracking-[.06em] text-ink-faint">{t('Mes corrections de ce sujet')}</h3>
                  <ul className="mt-1.5 divide-y divide-[#f2f1ee]">
                    {anciennes.map((c) => (
                      <li key={c.id}>
                        <Link to={`/correction-ia/${c.id}`} className="flex min-h-11 items-center gap-3 py-2 text-[13px] text-ink hover:text-brand">
                          <span className="min-w-0 flex-1">
                            {new Date(c.created_at).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span dir="ltr" className="fd-nums shrink-0 font-semibold">
                            {c.statut === 'corrigee' ? `${fmt(c.points)} / ${fmt(c.max)}` : c.statut === 'erreur' ? t('Erreur') : t('En cours…')}
                          </span>
                          <ArrowRight className="h-4 w-4 shrink-0 text-ink-faint rtl:-scale-x-100" aria-hidden />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="border-t border-line px-5 py-3">
              <button type="button" onClick={envoyer} disabled={!fichiers.length || envoi || epuise}
                className="fd-btn-primary min-h-11 w-full justify-center disabled:cursor-not-allowed disabled:opacity-50">
                {envoi ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {t('Envoi…')}</> : t('Envoyer pour correction')}
              </button>
              <p className="mt-2 text-center text-[11.5px] text-ink-faint">{t('La correction prend environ une minute. Tu peux supprimer ta copie à tout moment.')}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CorrectionIAButton;
