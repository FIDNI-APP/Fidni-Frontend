// Défi du jour (07/11/2026) : un même problème par jour pour tous les niveaux, à la manière de chess.com. On répond par un
// nombre, vérifié par le serveur ; trois essais ; des indices qui expliquent l'outil à utiliser, à ouvrir un par un.
// Accueil connecté, page d'accueil des visiteurs (sans compte) et page /defis. Sur l'accueil (`compact`), un défi déjà fini
// se replie sur une ligne pour laisser la place au reste. Pas d'animation, pas de confettis : l'accueil reste calme.
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronDown, ChevronRight, Lightbulb, Loader2, Flame } from 'lucide-react';
import { MathText } from '@/components/skilliq/MathText';
import { DifficultyBars } from '@/components/common/DifficultyBars';
import { useOpenSignup } from '@/components/auth/SignupPrompt';
import { useAuth } from '@/contexts/AuthContext';
import { confirmer } from '@/lib/confirmer';
import { trackAction } from '@/lib/usage';
import { defiApi, type Defi, type DefiDifficulte, type DefiEtat, type DefiTheme } from '@/lib/api/defiApi';
import { dateLocale, t } from '@/i18n';

export const NIVEAU: Record<DefiDifficulte, { level: number; label: string }> = {
  easy: { level: 1, label: 'Facile' }, medium: { level: 2, label: 'Moyen' },
  hard: { level: 3, label: 'Difficile' }, very_hard: { level: 4, label: 'Très difficile' },
};
export const THEME: Record<DefiTheme, string> = {
  algebre: 'Algèbre', arithmetique: 'Arithmétique', logique: 'Logique', geometrie: 'Géométrie', denombrement: 'Dénombrement',
};
export const dateDefi = (iso: string) => {
  const s = new Date(`${iso}T12:00:00`).toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** Texte d'un défi : une ligne vide sépare deux paragraphes. */
const Texte: React.FC<{ texte: string; className?: string }> = ({ texte, className = '' }) => (
  <div dir="ltr" lang="fr" className={`flex flex-col gap-2 text-left ${className}`}>
    {texte.split(/\n\s*\n/).map((p, i) => <p key={i} className="min-w-0 overflow-x-auto"><MathText text={p} /></p>)}
  </div>
);

// Un visiteur n'a rien en base : son navigateur garde où il en est. Illisible (navigation privée…) : il repart de zéro.
const cleLocale = (date: string) => `fidni-defi-${date}`;
function lireLocal(date: string): { essais: number; indices: number; statut: DefiEtat['statut'] } | null {
  try { return JSON.parse(localStorage.getItem(cleLocale(date)) ?? 'null'); } catch { return null; }
}
function ecrireLocal(date: string, v: { essais: number; indices: number; statut: DefiEtat['statut'] }) {
  try { localStorage.setItem(cleLocale(date), JSON.stringify(v)); } catch { /* sans stockage : rien de grave */ }
}

export const DefiPanel: React.FC<{ defi: Defi; compact?: boolean }> = ({ defi: initial, compact = false }) => {
  const { isAuthenticated } = useAuth();
  const openSignup = useOpenSignup('defi');
  const [defi, setDefi] = useState<Defi>(initial);
  const [saisie, setSaisie] = useState('');
  const [message, setMessage] = useState<{ ton: 'faux' | 'format' | 'erreur'; texte: string } | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [indices, setIndices] = useState(initial.indices_vus);
  // Un défi qu'on vient de finir reste ouvert ; déjà fini en arrivant sur l'accueil, il est replié.
  const [replie, setReplie] = useState(compact && initial.statut !== 'en_cours');
  const champ = useRef<HTMLInputElement>(null);

  const fini = defi.statut !== 'en_cours';
  const appliquer = (e: DefiEtat) => setDefi((d) => ({ ...d, ...e, serie: e.serie === undefined ? d.serie : e.serie }));
  const memoriser = (e: DefiEtat, nbIndices = indices) => {
    if (!isAuthenticated) ecrireLocal(defi.date, { essais: e.essais, indices: nbIndices, statut: e.statut });
  };

  // Visiteur qui revient : on reprend ses essais et ses indices ; s'il avait fini, on redemande la solution.
  useEffect(() => {
    if (isAuthenticated) return;
    const local = lireLocal(initial.date);
    if (!local) return;
    setIndices(local.indices ?? 0);
    if (local.statut === 'en_cours') {
      setDefi((d) => ({ ...d, essais: local.essais, essais_restants: Math.max(d.essais_max - local.essais, 0) }));
    } else {
      defiApi.abandonner(initial.date).then((e) => { setDefi((d) => ({ ...d, ...e, statut: local.statut, essais: local.essais })); }).catch(() => undefined);
      if (compact) setReplie(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial.date, isAuthenticated]);

  const repondre = async (e: React.FormEvent) => {
    e.preventDefault();
    const texte = saisie.trim();
    if (!texte || envoi) return;
    setEnvoi(true);
    setMessage(null);
    try {
      const r = await defiApi.repondre(defi.date, texte, isAuthenticated ? undefined : defi.essais + 1);
      trackAction('defi-repondu');
      appliquer(r);
      memoriser(r);
      if (r.juste) trackAction('defi-trouve');
      if (!r.juste && r.statut === 'en_cours') {
        setMessage({ ton: 'faux', texte: r.essais_restants > 1 ? t('Ce n’est pas ça. Il te reste {n} essais.', { n: r.essais_restants }) : t('Ce n’est pas ça. Il te reste un essai.') });
        setSaisie('');
        champ.current?.focus();
      }
    } catch (err) {
      const statut = (err as { response?: { status?: number } }).response?.status;
      if (statut === 400) setMessage({ ton: 'format', texte: t('Écris un nombre, par exemple 12, -3 ou 3/4.') });
      else if (statut === 429) setMessage({ ton: 'erreur', texte: t('Trop d’essais d’un coup. Réessaie dans une minute.') });
      else setMessage({ ton: 'erreur', texte: t('Ta réponse n’a pas pu être envoyée. Vérifie ta connexion.') });
    } finally {
      setEnvoi(false);
    }
  };

  const indiceSuivant = () => {
    const n = indices + 1;
    setIndices(n);
    trackAction('defi-indice');
    if (isAuthenticated) defiApi.indice(defi.date).catch(() => undefined);
    else ecrireLocal(defi.date, { essais: defi.essais, indices: n, statut: defi.statut });
  };

  const voirSolution = async () => {
    const ok = await confirmer(t('Tu ne pourras plus répondre à ce défi, et il ne comptera pas dans ta série.'),
      { action: t('Voir la solution') });
    if (!ok) return;
    try {
      const r = await defiApi.abandonner(defi.date);
      trackAction('defi-solution');
      appliquer(r);
      memoriser(r);
      setMessage(null);
    } catch {
      setMessage({ ton: 'erreur', texte: t('La solution n’a pas pu se charger. Vérifie ta connexion.') });
    }
  };

  const niveau = NIVEAU[defi.difficulte];
  const serie = defi.serie ?? 0;

  if (replie) {
    return (
      <section aria-label={t('Défi du jour')} data-tour="home-defi" className="rounded-2xl border border-line bg-white">
        <button type="button" onClick={() => setReplie(false)} aria-expanded={false}
          className="flex min-h-[56px] w-full items-center gap-3 rounded-2xl px-4 py-3 text-start hover:bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-brand sm:px-5">
          {defi.statut === 'trouve' && <Check className="h-4 w-4 shrink-0 text-brand" aria-hidden />}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-semibold text-ink">{t('Défi du jour')} · {defi.titre}</span>
            <span className="fd-nums mt-0.5 block text-[12.5px] text-ink-faint">
              {defi.statut === 'trouve' ? t('Trouvé') : t('Solution vue')}{serie > 0 ? ` · ${serie > 1 ? t('Série : {n} jours', { n: serie }) : t('Série : 1 jour')}` : ''}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden />
        </button>
      </section>
    );
  }

  return (
    <section aria-label={t('Défi du jour')} data-tour="home-defi" className="rounded-2xl border border-line bg-white p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="text-[12.5px] font-semibold text-gold-strong">
          {compact ? t('Défi du jour') : dateDefi(defi.date)}
        </p>
        {serie > 0 && (
          <p className="fd-nums inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink-soft">
            <Flame className="h-3.5 w-3.5 text-gold-strong" aria-hidden />
            {serie > 1 ? t('Série : {n} jours', { n: serie }) : t('Série : 1 jour')}
          </p>
        )}
      </header>
      <h2 dir="auto" lang="fr" className="fd-display mt-1 text-[20px] leading-tight text-ink [text-wrap:balance]">{defi.titre}</h2>
      <p className="mt-1.5 inline-flex flex-wrap items-center gap-x-1.5 text-[12.5px] text-ink-faint">
        <span className="sr-only">{t('Difficulté :')} </span>
        <DifficultyBars level={niveau.level} total={4} size="0.85em" />
        {t(niveau.label)} · {t(THEME[defi.theme])}
      </p>

      <Texte texte={defi.enonce} className="mt-4 text-[15.5px] leading-relaxed text-ink" />

      {/* Indices : du plus léger au plus précis, ils expliquent l'outil. Toujours relisibles une fois ouverts. */}
      {indices > 0 && (
        <ol className="mt-4 flex flex-col gap-2">
          {defi.indices.slice(0, indices).map((x, i) => (
            <li key={i} className="rounded-xl bg-gold-soft px-3.5 py-2.5 text-[14px] leading-relaxed text-ink">
              <p className="text-[12.5px] font-semibold text-gold-strong">{t('Indice {n}', { n: i + 1 })} · <span dir="auto" lang="fr">{x.titre}</span></p>
              <Texte texte={x.texte} className="mt-0.5" />
            </li>
          ))}
        </ol>
      )}

      {!fini ? (
        <>
          <form onSubmit={repondre} className="mt-5">
            <label htmlFor={`defi-${defi.date}`} dir="auto" lang="fr" className="block text-[13px] font-medium text-ink-soft">{defi.consigne}</label>
            <div className="mt-1.5 flex gap-2">
              <input id={`defi-${defi.date}`} ref={champ} value={saisie} onChange={(e) => { setSaisie(e.target.value); setMessage(null); }}
                inputMode="text" autoComplete="off" autoCorrect="off" spellCheck={false} maxLength={40} dir="ltr"
                aria-describedby={message ? `defi-${defi.date}-message` : undefined} aria-invalid={message?.ton === 'format' || undefined}
                className="fd-nums min-h-11 w-full min-w-0 flex-1 rounded-xl border border-line bg-white px-3.5 text-[16px] text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
                placeholder={t('Ta réponse')} />
              <button type="submit" disabled={envoi || !saisie.trim()} className="fd-btn-primary min-h-11 shrink-0 disabled:opacity-50">
                {envoi ? <Loader2 className="h-4 w-4 animate-spin" aria-label={t('Envoi')} /> : t('Vérifier')}
              </button>
            </div>
          </form>
          <p id={`defi-${defi.date}-message`} aria-live="polite" className={`min-h-[1.25rem] pt-1.5 text-[13px] font-medium ${message?.ton === 'faux' ? 'text-ink' : 'text-[#a23b34]'}`}>
            {message?.texte}
          </p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            {indices < defi.indices.length ? (
              <button type="button" onClick={indiceSuivant} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg text-[13.5px] font-semibold text-ink hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                <Lightbulb className="h-4 w-4 text-gold-strong" aria-hidden />
                {indices === 0 ? t('Un indice') : t('Un autre indice')}
              </button>
            ) : <span />}
            <button type="button" onClick={voirSolution} className="min-h-10 rounded-lg text-[13px] text-ink-faint hover:text-ink hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand">
              {t('Voir la solution')}
            </button>
          </div>
        </>
      ) : (
        <div className="mt-5" role="status">
          <p className="flex items-start gap-1.5 text-[15px] font-semibold text-ink">
            {defi.statut === 'trouve' && <Check className="mt-1 h-4 w-4 shrink-0 text-brand" aria-hidden />}
            <span>
              {defi.statut === 'trouve' ? t('Bien joué, c’est la bonne réponse.') : t('Ce n’était pas ça cette fois.')}{' '}
              <span className="fd-nums font-normal text-ink-soft" dir="ltr"><MathText text={`${t('Réponse :')} $${(defi.reponse ?? '').replace('-', '−')}$`} /></span>
            </span>
          </p>
          {defi.stats && (
            <p className="fd-nums mt-1 text-[13px] text-ink-faint">{t('{n} élèves sur {total} ont trouvé ce défi.', { n: defi.stats.trouves, total: defi.stats.total })}</p>
          )}
          {defi.solution && (
            <div className="mt-3 border-t border-line pt-3">
              <p className="text-[12.5px] font-semibold text-gold-strong">{t('Solution')}</p>
              <Texte texte={defi.solution} className="mt-1 text-[14.5px] leading-relaxed text-ink" />
            </div>
          )}
          {!isAuthenticated && (
            <p className="mt-4 text-[13.5px] text-ink-soft">
              {t('Avec un compte gratuit, FIDNI retient ta série jour après jour.')}{' '}
              <button type="button" onClick={() => openSignup('signup')} className="font-semibold text-brand hover:underline">{t('Créer mon compte')}</button>
            </p>
          )}
          {defi.du_jour && <p className="mt-3 text-[13px] text-ink-faint">{t('Un nouveau défi t’attend demain.')}</p>}
        </div>
      )}

      {defi.du_jour && (
        <div className="mt-3 border-t border-line pt-2">
          <Link to="/defis" onClick={() => trackAction('defi-archives')} className="inline-flex min-h-10 items-center gap-0.5 rounded-lg text-[13.5px] font-medium text-ink-soft hover:text-ink hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            {t('Défis précédents')} <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
          </Link>
        </div>
      )}
    </section>
  );
};

/** Le défi d'aujourd'hui, ou rien : un jour sans défi validé, l'accueil ne montre pas de bloc vide. */
export const DefiDuJour: React.FC<{ compact?: boolean; avant?: React.ReactNode; enveloppe?: (enfants: React.ReactNode) => React.ReactNode }> = ({ compact, avant, enveloppe }) => {
  const { isLoading } = useAuth();
  const [defi, setDefi] = useState<Defi | null>(null);
  useEffect(() => {
    if (isLoading) return;
    let vivant = true;
    defiApi.duJour().then((d) => { if (vivant) setDefi(d); }).catch(() => undefined);
    return () => { vivant = false; };
  }, [isLoading]);
  if (!defi) return null;
  const contenu = <>{avant}<DefiPanel defi={defi} compact={compact} /></>;
  return <>{enveloppe ? enveloppe(contenu) : contenu}</>;
};

export default DefiPanel;
