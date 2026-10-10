/**
 * Pilotage › Membres › « Un membre n'arrive pas à se connecter ? » (09/10/2026).
 * Un e-mail ou un pseudo → comptes correspondants, blocage après trop d'essais, journaux d'authentification
 * en échec et erreurs serveur. Backend : GET /api/pilotage/connexion/?q= (apps/users/login_diagnostic.py).
 * Depuis le 10/10/2026 : connexion avec Google (compte lié ou non, essais refusés).
 */
import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, KeyRound, Loader2, Search, XCircle } from 'lucide-react';
import { api } from '@/lib/api/apiClient';

interface Account {
  id: number; username: string; email: string; is_active: boolean; email_verified: boolean; email_verified_at: string | null;
  has_password: boolean; date_joined: string; last_login: string | null; used_for_login: boolean;
  /** Compte lié à un compte Google (connexion avec Google). Absent d'un serveur plus ancien. */
  google?: boolean;
}
interface LogRow {
  at: string; method: string; endpoint: string; status: number; ip: string | null; user: string | null;
  identifier: string | null; code: string | null; message: string | null; hint: string | null;
}
interface Diagnostic {
  query: string;
  accounts: Account[];
  warnings: string[];
  throttles: { identifier: string; attempts: number; limit: number; blocked: boolean; until_minutes: number | null }[];
  logs: LogRow[];
  errors: { at: string; endpoint: string; message: string; type: string; count: number }[];
}

const when = (iso: string | null) => (iso
  ? new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : 'jamais');

// Routes d'authentification → libellé lisible.
const ROUTE: [RegExp, string][] = [
  [/password-reset\/confirm/, 'Nouveau mot de passe (lien reçu)'], [/password-reset/, 'Mot de passe oublié'],
  [/password\/change/, 'Changement de mot de passe'], [/resend-verification/, 'Renvoi de l’e-mail de confirmation'],
  [/verify-email/, 'Confirmation d’e-mail'], [/register/, 'Inscription'], [/token\/refresh/, 'Renouvellement de session'],
  [/auth\/google/, 'Connexion avec Google'], [/login|\/token\/$/, 'Connexion'],
];
const routeLabel = (endpoint: string) => ROUTE.find(([re]) => re.test(endpoint))?.[1] ?? endpoint;

export const LoginDiagnostic: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [data, setData] = useState<Diagnostic | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (q.trim().length < 3) return;
    setLoading(true);
    setError(null);
    try {
      const r = await api.get('/pilotage/connexion/', { params: { q: q.trim() } });
      setData(r.data);
    } catch {
      setError('Le diagnostic n’a pas pu être chargé.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="fd-card mb-4 overflow-hidden">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
        className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-[#faf9f7]">
        <KeyRound className="h-4 w-4 shrink-0 text-ink-soft" />
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold text-ink">Un membre n’arrive pas à se connecter ?</span>
          <span className="block text-[12px] text-ink-faint">Son compte, ses essais de connexion et les erreurs, à partir de son e-mail ou de son pseudo.</span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-ink-faint transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-line px-5 py-4">
          <form onSubmit={run} className="flex flex-wrap gap-2">
            <label className="relative min-w-[220px] flex-1">
              <span className="sr-only">E-mail ou pseudo</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
              <input value={q} onChange={(ev) => setQ(ev.target.value)} placeholder="eleve@exemple.fr ou pseudo" autoFocus
                className="w-full rounded-xl border border-line bg-white py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30" />
            </label>
            <button type="submit" className="fd-btn-primary" disabled={loading || q.trim().length < 3}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Diagnostiquer
            </button>
          </form>
          {error && <p role="alert" className="mt-3 text-[13px] text-[#9c3b2e]">{error}</p>}

          {data && (
            <div className="mt-4 space-y-4">
              {data.warnings.length > 0 ? (
                <ul className="space-y-1.5 rounded-xl border border-[#ecdcb6] bg-gold-soft px-3.5 py-3">
                  {data.warnings.map((w) => (
                    <li key={w} className="flex gap-2 text-[13px] text-ink"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-gold-strong" /> {w}</li>
                  ))}
                </ul>
              ) : (
                <p className="flex items-center gap-2 rounded-xl border border-brand-line bg-brand-soft px-3.5 py-2.5 text-[13px] text-brand-hover">
                  <CheckCircle2 className="h-4 w-4" /> Rien d’anormal sur le compte : regarder les essais ci-dessous (mot de passe, identifiant tapé).
                </p>
              )}

              {data.accounts.length > 0 && (
                <div>
                  <h3 className="mb-1.5 text-[12px] font-semibold uppercase tracking-[.06em] text-ink-faint">Comptes</h3>
                  <ul className="divide-y divide-[#f2f1ee] rounded-xl border border-line">
                    {data.accounts.map((a) => (
                      <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3.5 py-2.5 text-[12.5px] text-ink-soft">
                        <span className="min-w-0 flex-1">
                          <b className="text-[13.5px] text-ink">{a.username}</b> · {a.email || 'sans e-mail'}
                          {a.used_for_login && <span className="ml-2 rounded-full bg-[#f2f1ee] px-1.5 text-[10.5px] text-ink-soft">utilisé à la connexion</span>}
                        </span>
                        <Flag ok={a.is_active} yes="Actif" no="Inactif" />
                        <Flag ok={a.email_verified} yes="E-mail confirmé" no="E-mail non confirmé" />
                        {/* Compte Google sans mot de passe : normal, pas une anomalie. */}
                        {!a.has_password && a.google
                          ? <span className="inline-flex items-center gap-1 text-ink-soft"><KeyRound className="h-3.5 w-3.5" /> Sans mot de passe</span>
                          : <Flag ok={a.has_password} yes="Mot de passe défini" no="Pas de mot de passe" />}
                        {a.google
                          ? <span className="inline-flex items-center gap-1 text-brand-hover"><CheckCircle2 className="h-3.5 w-3.5" /> Google</span>
                          : a.google === false && <span className="text-ink-faint">Pas de Google</span>}
                        <span className="w-full text-[12px] text-ink-faint">Inscrit le {when(a.date_joined)} · dernière connexion : {when(a.last_login)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.throttles.length > 0 && (
                <p className="text-[12.5px] text-ink-soft">
                  Essais dans l’heure : {data.throttles.map((t) => `« ${t.identifier} » ${t.attempts}/${t.limit}`).join(' · ')}
                </p>
              )}

              <div>
                <h3 className="mb-1.5 text-[12px] font-semibold uppercase tracking-[.06em] text-ink-faint">
                  Essais en échec ({data.logs.length})
                </h3>
                {data.logs.length === 0 ? (
                  <p className="text-[12.5px] text-ink-faint">
                    Aucun essai en échec enregistré avec cet identifiant (journaux gardés 180 jours). S’il dit ne pas pouvoir se
                    connecter, il tape peut-être une autre adresse : chercher aussi son pseudo.
                  </p>
                ) : (
                  <ul className="divide-y divide-[#f2f1ee] rounded-xl border border-line">
                    {data.logs.map((l, i) => (
                      <li key={i} className="px-3.5 py-2.5 text-[12.5px]">
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <span className={`fd-nums rounded px-1.5 text-[11px] font-semibold ${l.status >= 500 ? 'bg-[#fbecea] text-[#a23b34]' : 'bg-[#f2f1ee] text-ink-soft'}`}>{l.status}</span>
                          <span className="font-semibold text-ink">{routeLabel(l.endpoint)}</span>
                          <span className="text-ink-faint">{when(l.at)}</span>
                          {l.identifier && <span className="text-ink-faint">· tapé : « {l.identifier} »</span>}
                          {l.ip && <span className="fd-nums text-ink-faint">· {l.ip}</span>}
                        </div>
                        {(l.message || l.hint) && (
                          <p className="mt-0.5 text-ink-soft">{l.message}{l.hint && <span className="text-ink-faint"> — {l.hint}</span>}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {data.errors.length > 0 && (
                <div>
                  <h3 className="mb-1.5 text-[12px] font-semibold uppercase tracking-[.06em] text-ink-faint">Erreurs serveur du compte</h3>
                  <ul className="divide-y divide-[#f2f1ee] rounded-xl border border-line">
                    {data.errors.map((e, i) => (
                      <li key={i} className="px-3.5 py-2.5 text-[12.5px] text-ink-soft">
                        <b className="text-ink">{e.type}</b> sur {e.endpoint} · {when(e.at)}{e.count > 1 && ` · ${e.count} fois`}
                        <p className="mt-0.5 break-words text-ink-faint">{e.message}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

function Flag({ ok, yes, no }: { ok: boolean; yes: string; no: string }) {
  return ok ? (
    <span className="inline-flex items-center gap-1 text-brand-hover"><CheckCircle2 className="h-3.5 w-3.5" /> {yes}</span>
  ) : (
    <span className="inline-flex items-center gap-1 font-semibold text-[#a23b34]"><XCircle className="h-3.5 w-3.5" /> {no}</span>
  );
}
