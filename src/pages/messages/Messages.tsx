/**
 * Messages (/messages, /messages/:id), 13/11/2026 : conversations privées entre abonnés mutuels, groupes (6 au plus),
 * salles de travail sur un sujet, appels audio et vidéo.
 * Ordinateur : la liste à gauche, la conversation à droite. Téléphone : l'une ou l'autre (retour en haut).
 * « /messages?avec=pseudo » (bouton « Écrire » d'un profil) ouvre la conversation avec ce membre.
 * Temps réel : lib/tempsReel (nouveaux messages, lu, « écrit… », appels) ; à la reconnexion, tout est relu.
 */
import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft, Loader2, LogOut, MessageCircle, MoreHorizontal, Pencil, Phone, Search, SendHorizontal, SquarePen,
  UserPlus, Users, Video,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useMessagerie } from '@/contexts/MessagerieContext';
import { SEO } from '@/components/layout/SEO';
import { useOpenSignup } from '@/components/auth/SignupPrompt';
import { FloatingPanel } from '@/components/ui/FloatingPanel';
import { ModalShell } from '@/components/enregistrements/ModalShell';
import { confirmer } from '@/lib/confirmer';
import { tempsReel } from '@/lib/tempsReel';
import { messagerieApi, raisonRefus, type Conversation, type EtatAppel, type Message } from '@/lib/api/messagerieApi';
import { AvatarConversation, Bulle, ChoixContacts, LigneSysteme, apercu, jour, quand } from '@/components/messages/parts';
import { t } from '@/i18n';

const Liste: React.FC<{
  convs: Conversation[] | null; moi: number; active: number | null; onNouveau: () => void; echec: boolean; onReessayer: () => void;
}> = ({ convs, moi, active, onNouveau, echec, onReessayer }) => {
  const [q, setQ] = useState('');
  const visibles = (convs ?? []).filter((c) => !q || c.titre.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 px-4 pb-3 pt-4">
        <h1 className="fd-display flex-1 text-[22px] text-ink">{t('Messages')}</h1>
        <button type="button" onClick={onNouveau} className="fd-btn-primary min-h-10" aria-label={t('Nouveau message')}>
          <SquarePen className="h-4 w-4" /> <span className="hidden sm:inline lg:hidden xl:inline">{t('Nouveau')}</span>
        </button>
      </div>
      {(convs?.length ?? 0) > 6 && (
        <label className="relative mx-4 mb-2 block">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Rechercher')} aria-label={t('Rechercher une conversation')}
            className="h-10 w-full rounded-xl border border-line bg-paper ps-9 pe-3 text-[14px] focus:border-brand focus:outline-none" />
        </label>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {echec ? (
          <div className="px-3 py-10 text-center text-[13.5px] text-ink-soft">
            <p>{t('Les conversations n’ont pas pu se charger.')}</p>
            <button type="button" onClick={onReessayer} className="mt-2 font-semibold text-brand hover:underline">{t('Réessayer')}</button>
          </div>
        ) : convs === null ? (
          <div className="space-y-2 p-2" aria-busy="true">{[0, 1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-[#f2f1ee]" />)}</div>
        ) : convs.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <MessageCircle className="mx-auto h-7 w-7 text-ink-faint" aria-hidden />
            <p className="mt-3 text-[15px] font-semibold text-ink">{t('Aucune conversation')}</p>
            <p className="mx-auto mt-1 max-w-xs text-[13.5px] leading-relaxed text-ink-soft">
              {t('Écris à un membre que tu suis et qui te suit, appelle-le, ou proposez-vous un sujet à faire ensemble.')}
            </p>
            <button type="button" onClick={onNouveau} className="fd-btn-ghost mt-4 min-h-10">{t('Commencer une conversation')}</button>
          </div>
        ) : (
          <ul className="space-y-0.5">
            {visibles.map((c) => {
              const nl = c.non_lus > 0 && c.id !== active;
              return (
                <li key={c.id}>
                  <Link to={`/messages/${c.id}`} aria-current={c.id === active ? 'page' : undefined}
                    className={`flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors ${c.id === active ? 'bg-[#efece6]' : 'hover:bg-[#f7f6f3]'}`}>
                    <AvatarConversation c={c} moi={moi} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span className={`min-w-0 flex-1 truncate text-[14.5px] ${nl ? 'font-semibold text-ink' : 'font-medium text-ink'}`}>{c.titre}</span>
                        <span className="fd-nums shrink-0 text-[11.5px] text-ink-faint">{quand(c.dernier_message?.created_at ?? c.dernier_message_at)}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className={`min-w-0 flex-1 truncate text-[13px] ${nl ? 'text-ink' : 'text-ink-faint'}`}>
                          {c.appel ? <span className="font-medium text-brand">{t('Appel en cours')}</span> : apercu(c.dernier_message, moi, c.membres)}
                        </span>
                        {nl && <span className="fd-nums min-w-5 shrink-0 rounded-full bg-brand px-1.5 text-center text-[11px] font-semibold leading-5 text-white">{c.non_lus}</span>}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

const MenuConversation: React.FC<{
  c: Conversation; moi: number; onAjouter: () => void; onRenommer: () => void; onQuitter: () => void;
}> = ({ c, moi, onAjouter, onRenommer, onQuitter }) => {
  const [ouvert, setOuvert] = useState(false);
  const ancre = useRef<HTMLDivElement>(null);
  const autre = c.type === 'directe' ? c.membres.find((m) => m.id !== moi) : null;
  const item = 'flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 text-start text-[13.5px] font-medium hover:bg-[#f7f6f3]';
  const choisir = (f: () => void) => () => { setOuvert(false); f(); };
  return (
    <div ref={ancre}>
      <button type="button" onClick={() => setOuvert((v) => !v)} aria-label={t('Plus d’actions')} aria-haspopup="menu" aria-expanded={ouvert}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-ink-soft hover:bg-[#f2f1ee] hover:text-ink">
        <MoreHorizontal className="h-5 w-5" />
      </button>
      <FloatingPanel anchorRef={ancre} open={ouvert} onClose={() => setOuvert(false)} placement="bottom-end" offset={6} role="menu"
        className="w-[240px] rounded-2xl border border-line bg-white p-1.5 shadow-[0_14px_40px_rgba(20,18,16,.16)]">
        {autre && <Link role="menuitem" to={`/profile/${autre.username}`} className={`${item} text-ink`}><Users className="h-4 w-4" /> {t('Voir le profil')}</Link>}
        {c.type === 'groupe' && (
          <>
            <button type="button" role="menuitem" onClick={choisir(onAjouter)} className={`${item} text-ink`}><UserPlus className="h-4 w-4" /> {t('Ajouter des personnes')}</button>
            <button type="button" role="menuitem" onClick={choisir(onRenommer)} className={`${item} text-ink`}><Pencil className="h-4 w-4" /> {t('Renommer le groupe')}</button>
            <button type="button" role="menuitem" onClick={choisir(onQuitter)} className={`${item} text-[#a23b34] hover:bg-[#fbecea]`}><LogOut className="h-4 w-4" /> {t('Quitter le groupe')}</button>
          </>
        )}
      </FloatingPanel>
    </div>
  );
};

type MessageLocal = Message;

const Fil: React.FC<{ id: number; moi: number; onConversation: (c: Conversation) => void; onQuitte: () => void }> = ({ id, moi, onConversation, onQuitte }) => {
  const m = useMessagerie();
  const [conv, setConv] = useState<Conversation | null>(null);
  const [msgs, setMsgs] = useState<MessageLocal[] | null>(null);
  const [suite, setSuite] = useState(false);
  const [plus, setPlus] = useState(false);
  const [erreur, setErreur] = useState<'introuvable' | 'reseau' | null>(null);
  const [texte, setTexte] = useState('');
  const [ecrit, setEcrit] = useState<Record<number, number>>({});
  const [ajout, setAjout] = useState(false);
  const [renom, setRenom] = useState(false);
  const [nom, setNom] = useState('');
  const nomId = useId();
  const zone = useRef<HTMLDivElement>(null);
  const champ = useRef<HTMLTextAreaElement>(null);
  const enBas = useRef(true);
  const dernierTape = useRef(0);
  const temp = useRef(-1);

  const charger = useCallback(() => {
    setErreur(null);
    Promise.all([messagerieApi.conversation(id), messagerieApi.messages(id)]).then(([c, r]) => {
      setConv(c); onConversation(c);
      setMsgs(r.results); setSuite(r.suite);
      enBas.current = true;
    }).catch((e) => setErreur((e as { response?: { status?: number } })?.response?.status === 404 ? 'introuvable' : 'reseau'));
  }, [id, onConversation]);

  useEffect(() => { setConv(null); setMsgs(null); setTexte(''); charger(); }, [charger]);

  // Conversation à l'écran : ses messages ne comptent pas comme non lus ; on la marque lue.
  useEffect(() => {
    m.setOuverte(id);
    return () => m.setOuverte(null);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  const marquerLu = useCallback(() => {
    if (document.visibilityState !== 'visible') return;
    messagerieApi.lu(id).then(() => m.rafraichirNonLus()).catch(() => {});
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (msgs) marquerLu(); }, [msgs?.length, marquerLu]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const f = () => { if (document.visibilityState === 'visible') marquerLu(); };
    document.addEventListener('visibilitychange', f);
    return () => document.removeEventListener('visibilitychange', f);
  }, [marquerLu]);

  // Temps réel.
  useEffect(() => {
    const offs = [
      tempsReel.on('message.nouveau', (e) => {
        const msg = e.message as Message;
        if (msg.conversation !== id) return;
        setMsgs((l) => {
          if (!l || l.some((x) => x.id === msg.id)) return l;
          // Mon propre message revenu avant la réponse de l'envoi : il remplace sa copie « en cours ».
          const i = msg.auteur === moi ? l.findIndex((x) => x.id < 0 && !x.echec && x.texte === msg.texte) : -1;
          if (i >= 0) { const n = [...l]; n[i] = msg; return n; }
          return [...l, msg];
        });
        setEcrit((x) => { const n = { ...x }; if (msg.auteur) delete n[msg.auteur]; return n; });
        if (msg.type === 'systeme') messagerieApi.conversation(id).then((c) => { setConv(c); onConversation(c); }).catch(() => {});
      }),
      tempsReel.on('message.maj', (e) => {
        const msg = e.message as Message;
        if (msg.conversation === id) setMsgs((l) => l?.map((x) => (x.id === msg.id ? msg : x)) ?? l);
      }),
      tempsReel.on('lu', (e) => {
        if (e.conversation !== id) return;
        setConv((c) => c && { ...c, membres: c.membres.map((x) => (x.id === e.user ? { ...x, lu_jusqu_a: e.quand as string } : x)) });
      }),
      tempsReel.on('tape', (e) => {
        if (e.conversation === id) setEcrit((x) => ({ ...x, [e.user as number]: Date.now() }));
      }),
      tempsReel.on('appel.maj', (e) => {
        if (e.conversation === id) setConv((c) => c && { ...c, appel: e.appel as EtatAppel | null });
      }),
      tempsReel.on('conversation.maj', (e) => { if (e.conversation === id) charger(); }),
      tempsReel.on('reconnecte', charger),
    ];
    return () => offs.forEach((o) => o());
  }, [id, moi, charger, onConversation]);

  // « … écrit » s'efface au bout de 5 s sans nouvelle frappe.
  useEffect(() => {
    if (!Object.keys(ecrit).length) return;
    const i = window.setTimeout(() => setEcrit((x) => Object.fromEntries(Object.entries(x).filter(([, v]) => Date.now() - v < 5000))), 5200);
    return () => window.clearTimeout(i);
  }, [ecrit]);

  // Défilement : en bas à l'ouverture et à chaque message, sauf si on relit plus haut.
  useLayoutEffect(() => {
    const z = zone.current;
    if (z && enBas.current) z.scrollTop = z.scrollHeight;
  }, [msgs, ecrit]);
  const onScroll = () => {
    const z = zone.current;
    if (z) enBas.current = z.scrollHeight - z.scrollTop - z.clientHeight < 80;
  };

  const plusAnciens = async () => {
    if (!msgs?.length || plus) return;
    setPlus(true);
    const z = zone.current;
    const avant = z ? z.scrollHeight : 0;
    try {
      const r = await messagerieApi.messages(id, msgs.find((x) => x.id > 0)?.id);
      enBas.current = false;
      setMsgs((l) => [...r.results, ...(l ?? [])]);
      setSuite(r.suite);
      requestAnimationFrame(() => { if (z) z.scrollTop = z.scrollHeight - avant; });
    } catch { toast.error(t('Impossible de charger la suite.')); } finally { setPlus(false); }
  };

  const envoyer = async (contenu: string, existant?: number) => {
    const clientId = `c${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
    const local: Message = existant !== undefined ? { ...msgs!.find((x) => x.id === existant)!, echec: false } : {
      id: temp.current--, conversation: id, auteur: moi, type: 'texte', texte: contenu, donnees: {},
      created_at: new Date().toISOString(), supprime: false, client_id: clientId,
    };
    enBas.current = true;
    setMsgs((l) => (existant !== undefined ? l?.map((x) => (x.id === existant ? local : x)) ?? l : [...(l ?? []), local]));
    try {
      const r = await messagerieApi.ecrire(id, contenu, clientId);
      setMsgs((l) => {
        if (!l) return l;
        if (l.some((x) => x.id === r.id)) return l.filter((x) => x.id !== local.id);
        return l.map((x) => (x.id === local.id ? { ...r, client_id: undefined } : x));
      });
    } catch (e) {
      setMsgs((l) => l?.map((x) => (x.id === local.id ? { ...x, echec: true } : x)) ?? l);
      toast.error(raisonRefus(e, t('Message non envoyé.')));
    }
  };

  const soumettre = () => {
    const v = texte.trim();
    if (!v || conv?.lecture_seule) return;
    setTexte('');
    void envoyer(v);
    champ.current?.focus();
  };

  const onTexte = (v: string) => {
    setTexte(v);
    if (v && Date.now() - dernierTape.current > 3000) {
      dernierTape.current = Date.now();
      tempsReel.envoyer({ type: 'tape', conversation: id });
    }
  };

  // Hauteur du champ : suit le texte (6 lignes au plus).
  useLayoutEffect(() => {
    const c = champ.current;
    if (!c) return;
    c.style.height = 'auto';
    c.style.height = `${Math.min(c.scrollHeight, 150)}px`;
  }, [texte]);

  if (erreur) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <p className="text-[15px] font-semibold text-ink">{erreur === 'introuvable' ? t('Conversation introuvable') : t('La conversation n’a pas pu se charger.')}</p>
        {erreur === 'reseau' && <button type="button" onClick={charger} className="fd-btn-ghost mt-3 min-h-10">{t('Réessayer')}</button>}
      </div>
    );
  }
  if (!conv || !msgs) {
    return <div className="flex h-full items-center justify-center" aria-busy="true"><Loader2 className="h-6 w-6 animate-spin text-ink-faint" /></div>;
  }

  const groupe = conv.type === 'groupe';
  const parId = Object.fromEntries(conv.membres.map((x) => [x.id, x]));
  const autres = conv.membres.filter((x) => x.id !== moi);
  const enAppel = m.appel?.conversation === id;
  const appelSansMoi = conv.appel && !enAppel;
  // « Vu » : sous mon dernier message, quand l'autre l'a lu (conversation à deux).
  const monDernier = [...msgs].reverse().find((x) => x.auteur === moi && x.id > 0 && x.type === 'texte');
  const vuPar = !groupe && monDernier && autres[0]?.lu_jusqu_a && Date.parse(autres[0].lu_jusqu_a) >= Date.parse(monDernier.created_at);
  const quiEcrit = Object.keys(ecrit).map(Number).filter((u) => u !== moi).map((u) => parId[u]?.username).filter(Boolean);
  const sousTitre = groupe
    ? t('{n} personnes', { n: conv.membres.length })
    : autres[0]?.level || (autres[0]?.role === 'prof' ? t('Professeur') : '');

  const signaler = async (msg: Message) => {
    if (!await confirmer(t('Signaler ce message à l’équipe ? Elle le lira, avec les messages qui le précèdent.'), { action: t('Signaler') })) return;
    messagerieApi.signaler(msg.id, '').then(() => toast.success(t('Message signalé. Merci.'))).catch(() => toast.error(t('Signalement impossible pour le moment.')));
  };
  const supprimer = async (msg: Message) => {
    if (!await confirmer(t('Supprimer ce message pour tout le monde ?'), { action: t('Supprimer'), danger: true })) return;
    messagerieApi.supprimer(msg.id).then(() => setMsgs((l) => l?.map((x) => (x.id === msg.id ? { ...x, supprime: true, texte: '' } : x)) ?? l))
      .catch(() => toast.error(t('Suppression impossible pour le moment.')));
  };
  const renommer = () => { setNom(conv.titre_libre || ''); setRenom(true); };
  const enregistrerNom = (e: React.FormEvent) => {
    e.preventDefault();
    messagerieApi.renommer(id, nom).then((c) => { setConv(c); onConversation(c); setRenom(false); })
      .catch(() => toast.error(t('Action impossible pour le moment.')));
  };
  const quitter = async () => {
    if (!await confirmer(t('Quitter ce groupe ? Tu n’y recevras plus de messages.'), { action: t('Quitter'), danger: true })) return;
    messagerieApi.quitter(id).then(onQuitte).catch(() => toast.error(t('Action impossible pour le moment.')));
  };

  let jourPrec = '';
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-2 border-b border-line px-2 py-2 sm:px-4">
        <Link to="/messages" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink-soft hover:bg-[#f2f1ee] lg:hidden" aria-label={t('Retour aux conversations')}>
          <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
        </Link>
        <AvatarConversation c={conv} moi={moi} taille={38} />
        <div className="min-w-0 flex-1">
          {!groupe && autres[0] ? (
            <Link to={`/profile/${autres[0].username}`} className="block truncate text-[15px] font-semibold text-ink hover:underline">{conv.titre}</Link>
          ) : <p className="truncate text-[15px] font-semibold text-ink">{conv.titre}</p>}
          {quiEcrit.length ? (
            <p className="truncate text-[12.5px] text-brand">{quiEcrit.length === 1 ? t('{name} écrit…', { name: quiEcrit[0]! }) : t('Plusieurs personnes écrivent…')}</p>
          ) : sousTitre ? <p className="truncate text-[12.5px] text-ink-faint">{sousTitre}</p> : null}
        </div>
        {!conv.lecture_seule && (
          <>
            <button type="button" onClick={() => void m.lancer(id, false)} disabled={!!m.appel && !enAppel} aria-label={t('Appel audio')} title={t('Appel audio')}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-ink-soft hover:bg-[#f2f1ee] hover:text-ink disabled:opacity-40">
              <Phone className="h-[18px] w-[18px]" />
            </button>
            <button type="button" onClick={() => void m.lancer(id, true)} disabled={!!m.appel && !enAppel} aria-label={t('Appel vidéo')} title={t('Appel vidéo')}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-ink-soft hover:bg-[#f2f1ee] hover:text-ink disabled:opacity-40">
              <Video className="h-5 w-5" />
            </button>
          </>
        )}
        <MenuConversation c={conv} moi={moi} onAjouter={() => setAjout(true)} onRenommer={renommer} onQuitter={quitter} />
      </header>

      {(appelSansMoi || conv.contenu) && (
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-[#fbfaf7] px-4 py-2">
          {appelSansMoi && (
            <>
              <span className="text-[13px] font-medium text-ink">{t('Appel en cours · {n} connecté(s)', { n: conv.appel!.presences.length })}</span>
              <button type="button" onClick={() => void m.lancer(id, conv.appel!.video)} className="fd-btn-primary ms-auto min-h-9 px-3 text-[13px]">
                <Phone className="h-4 w-4" /> {t('Rejoindre')}
              </button>
            </>
          )}
          {conv.contenu && !appelSansMoi && (
            <>
              <span className="min-w-0 flex-1 truncate text-[13px] text-ink-soft">{t('Sujet :')} <b className="font-semibold text-ink">{conv.contenu.title}</b></span>
              <Link to={`${conv.contenu.url}?salle=${id}`} className="fd-btn-ghost min-h-9 px-3 text-[13px]"><Users className="h-4 w-4" /> {t('Ouvrir ensemble')}</Link>
            </>
          )}
        </div>
      )}

      <div ref={zone} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-5" aria-live="polite" aria-relevant="additions">
        {suite && (
          <div className="mb-2 text-center">
            <button type="button" onClick={plusAnciens} disabled={plus} className="fd-btn-ghost min-h-9 px-3 text-[13px]">
              {plus && <Loader2 className="h-4 w-4 animate-spin" />} {t('Messages plus anciens')}
            </button>
          </div>
        )}
        {msgs.length === 0 && (
          <p className="mx-auto mt-10 max-w-xs text-center text-[13.5px] leading-relaxed text-ink-soft">
            {groupe ? t('Le groupe est prêt. Dis bonjour, ou lancez un appel.') : t('Dis bonjour à {name}.', { name: conv.titre })}
          </p>
        )}
        {msgs.map((msg, i) => {
          const j = jour(msg.created_at);
          const sep = j !== jourPrec;
          jourPrec = j;
          const prec = msgs[i - 1];
          const proch = msgs[i + 1];
          const memeQue = (a?: Message) => !!a && a.auteur === msg.auteur && (a.type === 'texte' || a.type === 'invitation')
            && Math.abs(Date.parse(a.created_at) - Date.parse(msg.created_at)) < 5 * 60000 && jour(a.created_at) === j;
          return (
            <React.Fragment key={msg.id}>
              {sep && <p className="my-3 text-center text-[12px] font-medium text-ink-faint first-letter:uppercase">{j}</p>}
              {msg.type === 'appel' || msg.type === 'systeme'
                ? <LigneSysteme m={msg} membres={conv.membres} moi={moi} />
                : (
                  <Bulle m={msg} moi={msg.auteur === moi} groupe={groupe} auteur={msg.auteur ? parId[msg.auteur] : undefined}
                    debutGroupe={sep || !memeQue(prec)} finGroupe={!memeQue(proch)} vu={!!vuPar && msg.id === monDernier?.id}
                    onSupprimer={() => supprimer(msg)} onSignaler={() => signaler(msg)} onReessayer={() => void envoyer(msg.texte, msg.id)} />
                )}
            </React.Fragment>
          );
        })}
      </div>

      {conv.lecture_seule ? (
        <p className="border-t border-line bg-[#fbfaf7] px-4 py-3 text-center text-[13px] text-ink-soft">{t(conv.lecture_seule)}</p>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); soumettre(); }} className="flex items-end gap-2 border-t border-line px-3 py-2.5 sm:px-4">
          <textarea ref={champ} value={texte} onChange={(e) => onTexte(e.target.value.slice(0, 2000))} rows={1}
            onKeyDown={(e) => {
              // Entrée envoie (Maj+Entrée : nouvelle ligne) ; sur téléphone, Entrée fait une nouvelle ligne.
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && !window.matchMedia('(pointer: coarse)').matches) {
                e.preventDefault(); soumettre();
              }
            }}
            placeholder={t('Écris un message…')} title={t('Formules entre $ $, par exemple $x^2$')} aria-label={t('Message')} dir="auto"
            className="max-h-[150px] min-h-11 flex-1 resize-none rounded-2xl border border-line bg-paper px-3.5 py-2.5 text-[14.5px] leading-snug focus:border-brand focus:bg-white focus:outline-none" />
          <button type="submit" disabled={!texte.trim()} aria-label={t('Envoyer')}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-white transition-colors hover:bg-brand-hover disabled:bg-[#e7e3dc] disabled:text-ink-faint">
            <SendHorizontal className="h-5 w-5 rtl:rotate-180" />
          </button>
        </form>
      )}

      <ModalShell open={renom} onClose={() => setRenom(false)} title={t('Renommer le groupe')} labelId={nomId} onSubmit={enregistrerNom}>
        <input value={nom} onChange={(e) => setNom(e.target.value.slice(0, 80))} aria-label={t('Nom du groupe')} placeholder={t('Nom du groupe')}
          className="h-11 w-full rounded-xl border border-line bg-white px-3 text-[14px] focus:border-brand focus:outline-none" />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={() => setRenom(false)} className="fd-btn-ghost min-h-10">{t('Annuler')}</button>
          <button type="submit" className="fd-btn-primary min-h-10">{t('Enregistrer')}</button>
        </div>
      </ModalShell>
      <ChoixContacts open={ajout} onClose={() => setAjout(false)} titre={t('Ajouter au groupe')} action={t('Ajouter')}
        exclure={conv.membres.map((x) => x.id)} max={Math.max(0, 6 - conv.membres.length)}
        onValider={async (noms) => {
          try {
            const c = await messagerieApi.ajouter(id, noms);
            setConv(c); onConversation(c); setAjout(false);
          } catch (e) { toast.error(raisonRefus(e, t('Ajout impossible pour le moment.'))); }
        }} />
    </div>
  );
};

export const MessagesPage: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const openSignup = useOpenSignup('messages');
  if (isLoading) return null;
  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <SEO title={`${t('Messages')} – Fidni`} description={t('Tes conversations sur Fidni.')} noindex />
        <MessageCircle className="mx-auto h-8 w-8 text-ink-faint" aria-hidden />
        <h1 className="fd-display mt-3 text-[22px] text-ink">{t('Messages')}</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{t('Connecte-toi pour écrire aux membres que tu suis, les appeler et travailler à plusieurs.')}</p>
        <button type="button" onClick={() => openSignup('login')} className="fd-btn-primary mx-auto mt-5 flex min-h-10 items-center">{t('Connexion')}</button>
      </div>
    );
  }
  return <MessagesConnecte />;
};

const MessagesConnecte: React.FC = () => {
  const { id: idParam } = useParams<{ id?: string }>();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const moi = Number(user?.id);
  const id = idParam && /^\d+$/.test(idParam) ? Number(idParam) : null;
  const [convs, setConvs] = useState<Conversation[] | null>(null);
  const [echec, setEchec] = useState(false);
  const [nouveau, setNouveau] = useState(false);

  const charger = useCallback(() => {
    setEchec(false);
    messagerieApi.conversations().then(setConvs).catch(() => setEchec(true));
  }, []);
  useEffect(() => { charger(); }, [charger]);

  // « Écrire » depuis un profil : /messages?avec=pseudo.
  const avec = params.get('avec');
  useEffect(() => {
    if (!avec) return;
    messagerieApi.creer([avec]).then((c) => navigate(`/messages/${c.id}`, { replace: true }))
      .catch((e) => { toast.error(raisonRefus(e, t('Conversation impossible.'))); setParams({}, { replace: true }); });
  }, [avec]); // eslint-disable-line react-hooks/exhaustive-deps

  // La liste suit le temps réel : dernier message, non-lus, appel en cours.
  useEffect(() => {
    const offs = [
      tempsReel.on('message.nouveau', (e) => {
        const msg = e.message as Message;
        setConvs((l) => {
          if (!l) return l;
          const c = l.find((x) => x.id === msg.conversation);
          if (!c) { charger(); return l; }
          const n = { ...c, dernier_message: msg, dernier_message_at: msg.created_at,
            non_lus: msg.auteur !== moi && msg.conversation !== id ? c.non_lus + 1 : c.non_lus };
          return [n, ...l.filter((x) => x.id !== c.id)];
        });
      }),
      tempsReel.on('appel.maj', (e) => setConvs((l) => l?.map((x) => (x.id === e.conversation ? { ...x, appel: e.appel as EtatAppel | null } : x)) ?? l)),
      tempsReel.on('conversation.maj', charger),
      tempsReel.on('reconnecte', charger),
    ];
    return () => offs.forEach((o) => o());
  }, [charger, moi, id]);

  const majConv = useCallback((c: Conversation) => {
    setConvs((l) => (l ? (l.some((x) => x.id === c.id) ? l.map((x) => (x.id === c.id ? { ...c, non_lus: 0 } : x)) : [c, ...l]) : l));
  }, []);

  const conversationsListe = useMemo(() => convs?.map((c) => (c.id === id ? { ...c, non_lus: 0 } : c)) ?? null, [convs, id]);

  return (
    <div className="mx-auto w-full max-w-6xl px-0 pt-0 sm:px-4 sm:pt-5 md:px-8">
      <SEO title={`${t('Messages')} – Fidni`} description={t('Tes conversations sur Fidni.')} noindex />
      <div className="flex h-[calc(100dvh-56px-64px-env(safe-area-inset-bottom))] overflow-hidden border-line bg-white sm:h-[calc(100dvh-7.5rem)] sm:rounded-3xl sm:border lg:h-[calc(100dvh-6.5rem)]">
        <aside className={`min-h-0 w-full border-line lg:w-[340px] lg:shrink-0 lg:border-e ${id ? 'hidden lg:block' : 'block'}`}>
          <Liste convs={conversationsListe} moi={moi} active={id} onNouveau={() => setNouveau(true)} echec={echec} onReessayer={charger} />
        </aside>
        <section className={`min-h-0 min-w-0 flex-1 ${id ? 'block' : 'hidden lg:block'}`} aria-label={t('Conversation')}>
          {id ? (
            <Fil key={id} id={id} moi={moi} onConversation={majConv} onQuitte={() => { charger(); navigate('/messages'); }} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <MessageCircle className="h-8 w-8 text-ink-faint" aria-hidden />
              <p className="mt-3 text-[15px] font-semibold text-ink">{t('Choisis une conversation')}</p>
              <p className="mt-1 max-w-sm text-[13.5px] leading-relaxed text-ink-soft">
                {t('Messages, appels et visio avec les membres que tu suis et qui te suivent. Rien n’est enregistré pendant les appels.')}
              </p>
            </div>
          )}
        </section>
      </div>
      <ChoixContacts open={nouveau} onClose={() => setNouveau(false)} titre={t('Nouveau message')} action={t('Écrire')} avecTitre
        onValider={async (noms, titre) => {
          try {
            const c = await messagerieApi.creer(noms, { titre, groupe: noms.length > 1 });
            setNouveau(false);
            majConv(c);
            navigate(`/messages/${c.id}`);
          } catch (e) { toast.error(raisonRefus(e, t('Conversation impossible.'))); }
        }} />
    </div>
  );
};

export default MessagesPage;
