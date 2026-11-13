/**
 * Salle de travail (13/11/2026) : sur la page d'un sujet ouverte avec « ?salle=<conversation> », un panneau à côté de
 * la feuille : qui est là, à quelle question en est chacun (« Aller voir »), la discussion du groupe et l'appel.
 * Chacun fait le sujet sur sa propre page (ses réponses restent les siennes) ; seule la position est partagée.
 * Ordinateur : panneau flottant à droite, repliable. Téléphone : une barre en bas, qui s'ouvre en feuille.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, MessageCircle, Phone, SendHorizontal, Users, Video, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useMessagerie } from '@/contexts/MessagerieContext';
import { tempsReel } from '@/lib/tempsReel';
import { messagerieApi, raisonRefus, type Conversation, type EtatAppel, type Message } from '@/lib/api/messagerieApi';
import { Avatar } from '@/components/discussions/parts';
import { MathText } from '@/components/skilliq/MathText';
import { heure } from './parts';
import { t } from '@/i18n';

/** Questions de la feuille, dans l'ordre de la page (ExerciseRenderer : id « question-<chemin> »). */
const ancres = () => Array.from(document.querySelectorAll<HTMLElement>('[id^="question-"]'));
const numero = (ancre: string) => {
  const i = ancres().findIndex((e) => e.id === ancre);
  return i >= 0 ? i + 1 : null;
};

/** La question en haut de l'écran, envoyée aux autres quand elle change (au plus toutes les 1,5 s). */
function usePosition(conversation: number, actif: boolean) {
  const derniere = useRef('');
  useEffect(() => {
    if (!actif) return;
    let minut: number | null = null;
    const envoyer = () => {
      minut = null;
      const liste = ancres();
      const haut = liste.find((e) => e.getBoundingClientRect().bottom > 110) ?? liste[liste.length - 1];
      const id = haut?.id ?? '';
      if (id && id !== derniere.current) {
        derniere.current = id;
        tempsReel.envoyer({ type: 'salle.question', conversation, question: id });
      }
    };
    const onScroll = () => { if (minut === null) minut = window.setTimeout(envoyer, 1500); };
    window.addEventListener('scroll', onScroll, { passive: true });
    const debut = window.setTimeout(envoyer, 1200);
    return () => { window.removeEventListener('scroll', onScroll); window.clearTimeout(debut); if (minut) window.clearTimeout(minut); };
  }, [conversation, actif]);
}

export const SalleTravail: React.FC<{ conversation: number; contenu: number; moi: number; onFermer: () => void }> = ({ conversation, contenu, moi, onFermer }) => {
  const m = useMessagerie();
  const [conv, setConv] = useState<Conversation | null>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [erreur, setErreur] = useState(false);
  const [ouvert, setOuvert] = useState(() => window.matchMedia('(min-width: 1024px)').matches);
  const [onglet, setOnglet] = useState<'groupe' | 'discussion'>('groupe');
  const [texte, setTexte] = useState('');
  const [nouveaux, setNouveaux] = useState(0);
  const fil = useRef<HTMLDivElement>(null);

  const charger = useCallback(() => {
    Promise.all([messagerieApi.conversation(conversation), messagerieApi.messages(conversation)])
      .then(([c, r]) => { setConv(c); setMsgs(r.results.filter((x) => x.type === 'texte')); setErreur(false); })
      .catch(() => setErreur(true));
  }, [conversation]);
  useEffect(() => { charger(); }, [charger]);

  const bonSujet = !!conv && conv.contenu?.id === contenu;
  usePosition(conversation, bonSujet);

  useEffect(() => {
    const offs = [
      tempsReel.on('salle.question', (e) => {
        if (e.conversation !== conversation) return;
        setConv((c) => c && { ...c, membres: c.membres.map((x) => (x.id === e.user ? { ...x, question: String(e.question) } : x)) });
      }),
      tempsReel.on('message.nouveau', (e) => {
        const msg = e.message as Message;
        if (msg.conversation !== conversation || msg.type !== 'texte') return;
        setMsgs((l) => (l.some((x) => x.id === msg.id) ? l : [...l, msg]));
        if (msg.auteur !== moi) setNouveaux((n) => n + 1);
      }),
      tempsReel.on('appel.maj', (e) => { if (e.conversation === conversation) setConv((c) => c && { ...c, appel: e.appel as EtatAppel | null }); }),
      tempsReel.on('conversation.maj', (e) => { if (e.conversation === conversation) charger(); }),
      tempsReel.on('reconnecte', charger),
    ];
    return () => offs.forEach((o) => o());
  }, [conversation, moi, charger]);

  // La discussion de la salle, ouverte : lue.
  useEffect(() => {
    if (ouvert && onglet === 'discussion') {
      setNouveaux(0);
      m.setOuverte(conversation);
      messagerieApi.lu(conversation).then(() => m.rafraichirNonLus()).catch(() => {});
      return () => m.setOuverte(null);
    }
    return undefined;
  }, [ouvert, onglet, msgs.length, conversation]); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => { if (fil.current) fil.current.scrollTop = fil.current.scrollHeight; }, [msgs, onglet, ouvert]);

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = texte.trim();
    if (!v) return;
    setTexte('');
    try {
      const r = await messagerieApi.ecrire(conversation, v, `s${Date.now()}`);
      setMsgs((l) => (l.some((x) => x.id === r.id) ? l : [...l, r]));
    } catch (err) {
      setTexte(v);
      toast.error(raisonRefus(err, t('Message non envoyé.')));
    }
  };

  if (erreur) {
    return (
      <div className="fixed bottom-[calc(76px+env(safe-area-inset-bottom))] end-3 z-[60] flex items-center gap-2 rounded-2xl border border-line bg-white px-4 py-3 text-[13px] text-ink-soft shadow-[0_12px_32px_rgba(20,18,16,.14)] lg:bottom-5">
        {t('Cette salle de travail n’est pas accessible.')}
        <button type="button" onClick={onFermer} aria-label={t('Fermer')} className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[#f2f1ee]"><X className="h-4 w-4" /></button>
      </div>
    );
  }
  if (!conv) return null;

  const enAppel = m.appel?.conversation === conversation;
  const dansAppel = new Set((conv.appel?.presences ?? []).map((p) => p.user));
  const parId = Object.fromEntries(conv.membres.map((x) => [x.id, x]));
  const aller = (ancre?: string) => {
    if (!ancre) return;
    document.getElementById(ancre)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (!window.matchMedia('(min-width: 1024px)').matches) setOuvert(false);
  };

  return (
    <aside aria-label={t('Travail à plusieurs')}
      className={`fixed z-[60] flex flex-col overflow-hidden border border-line bg-white shadow-[0_16px_44px_rgba(20,18,16,.16)]
        inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] rounded-t-3xl lg:inset-x-auto lg:bottom-5 lg:end-5 lg:w-[340px] lg:rounded-3xl
        ${ouvert ? 'max-h-[70dvh] lg:max-h-[calc(100dvh-7rem)]' : ''}`}>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button type="button" onClick={() => setOuvert((o) => !o)} aria-expanded={ouvert}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-1.5 py-1 text-start hover:bg-[#f7f6f3]">
          <span className="flex -space-x-2 rtl:space-x-reverse" aria-hidden>
            {conv.membres.slice(0, 4).map((x) => <Avatar key={x.id} user={{ username: x.username, avatar: x.avatar ?? null }} size={26} ring />)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-semibold text-ink">{t('Travail à plusieurs')}</span>
            <span className="block truncate text-[12px] text-ink-faint">
              {!bonSujet ? t('Cette salle est sur un autre sujet') : conv.appel ? t('Appel en cours') : t('{n} personnes', { n: conv.membres.length })}
            </span>
          </span>
          {nouveaux > 0 && !(ouvert && onglet === 'discussion') && (
            <span className="fd-nums rounded-full bg-brand px-1.5 text-[11px] font-semibold leading-5 text-white">{nouveaux}</span>
          )}
          {ouvert ? <ChevronDown className="h-4 w-4 text-ink-faint" /> : <ChevronUp className="h-4 w-4 text-ink-faint" />}
        </button>
        <button type="button" onClick={onFermer} aria-label={t('Quitter la salle (sans quitter le groupe)')} title={t('Fermer le panneau')}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-faint hover:bg-[#f2f1ee] hover:text-ink">
          <X className="h-4 w-4" />
        </button>
      </div>

      {ouvert && (
        <>
          <div className="flex gap-1 border-y border-line px-3 py-1.5" role="tablist">
            {(['groupe', 'discussion'] as const).map((o) => (
              <button key={o} type="button" role="tab" aria-selected={onglet === o} onClick={() => setOnglet(o)}
                className={`inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-[13px] font-medium ${onglet === o ? 'bg-[#efece6] text-ink' : 'text-ink-soft hover:bg-[#f7f6f3]'}`}>
                {o === 'groupe' ? <Users className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
                {o === 'groupe' ? t('Le groupe') : t('Discussion')}
                {o === 'discussion' && nouveaux > 0 && onglet !== 'discussion' && <span className="h-2 w-2 rounded-full bg-brand" aria-label={t('Nouveaux messages')} />}
              </button>
            ))}
          </div>

          {onglet === 'groupe' ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ul className="divide-y divide-line">
                {conv.membres.map((x) => {
                  const n = x.question ? numero(x.question) : null;
                  return (
                    <li key={x.id} className="flex items-center gap-3 px-4 py-2.5">
                      <Avatar user={{ username: x.username, avatar: x.avatar ?? null }} size={34} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 truncate text-[14px] font-medium text-ink">
                          {x.id === moi ? t('Toi') : x.username}
                          {dansAppel.has(x.id) && <Phone className="h-3.5 w-3.5 text-brand" aria-label={t('dans l’appel')} />}
                        </span>
                        <span className="block text-[12.5px] text-ink-faint">{n ? t('Question {n}', { n }) : t('Pas encore sur la feuille')}</span>
                      </span>
                      {x.id !== moi && n && (
                        <button type="button" onClick={() => aller(x.question)} className="fd-btn-ghost min-h-9 px-2.5 text-[12.5px]">{t('Aller voir')}</button>
                      )}
                    </li>
                  );
                })}
              </ul>
              <div className="flex flex-wrap gap-2 border-t border-line px-4 py-3">
                {enAppel ? (
                  <button type="button" onClick={() => m.reduire(false)} className="fd-btn-ghost min-h-10 flex-1">{t('Voir l’appel')}</button>
                ) : conv.lecture_seule ? null : (
                  <>
                    <button type="button" onClick={() => void m.lancer(conversation, false)} disabled={!!m.appel} className="fd-btn-primary min-h-10 flex-1 disabled:opacity-50">
                      <Phone className="h-4 w-4" /> {conv.appel ? t('Rejoindre l’appel') : t('Appeler le groupe')}
                    </button>
                    <button type="button" onClick={() => void m.lancer(conversation, true)} disabled={!!m.appel} aria-label={t('Appel vidéo')}
                      className="fd-btn-ghost min-h-10 px-3 disabled:opacity-50"><Video className="h-4 w-4" /></button>
                  </>
                )}
                <Link to={`/messages/${conversation}`} className="w-full text-center text-[12.5px] font-medium text-ink-faint hover:text-ink hover:underline">
                  {t('Ouvrir dans Messages')}
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <div ref={fil} className="min-h-[160px] flex-1 space-y-2 overflow-y-auto px-3 py-3">
                {msgs.length === 0 && <p className="py-6 text-center text-[13px] text-ink-faint">{t('Pas encore de message. Une question ? Demande au groupe.')}</p>}
                {msgs.slice(-40).map((x) => {
                  const a = x.auteur ? parId[x.auteur] : undefined;
                  const moiAuteur = x.auteur === moi;
                  return (
                    <div key={x.id} className={`flex flex-col ${moiAuteur ? 'items-end' : 'items-start'}`}>
                      {!moiAuteur && <span className="px-1 text-[11.5px] font-medium text-ink-faint">{a?.username}</span>}
                      <div dir="auto" title={heure(x.created_at)}
                        className={`max-w-[90%] whitespace-pre-wrap break-words rounded-2xl px-3 py-1.5 text-[13.5px] leading-relaxed ${moiAuteur ? 'bg-brand-soft' : 'border border-line bg-white'} ${x.supprime ? 'italic text-ink-faint' : 'text-ink'}`}>
                        {x.supprime ? t('Message supprimé') : <MathText text={x.texte} />}
                      </div>
                    </div>
                  );
                })}
              </div>
              {!conv.lecture_seule && (
                <form onSubmit={envoyer} className="flex items-center gap-2 border-t border-line p-2.5">
                  <input value={texte} onChange={(e) => setTexte(e.target.value.slice(0, 2000))} placeholder={t('Écris au groupe…')} aria-label={t('Message au groupe')} dir="auto"
                    className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-paper px-3 text-[14px] focus:border-brand focus:bg-white focus:outline-none" />
                  <button type="submit" disabled={!texte.trim()} aria-label={t('Envoyer')}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-white disabled:bg-[#e7e3dc] disabled:text-ink-faint">
                    <SendHorizontal className="h-4 w-4 rtl:rotate-180" />
                  </button>
                </form>
              )}
            </div>
          )}
        </>
      )}
    </aside>
  );
};

export default SalleTravail;
