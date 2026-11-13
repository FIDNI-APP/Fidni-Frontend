/** Morceaux de la messagerie (13/11/2026) : bulles, lignes du site, invitation à travailler, choix des contacts. */
import React, { useEffect, useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Flag, Loader2, Phone, PhoneMissed, Search, Trash2, Users, Video } from 'lucide-react';
import { ModalShell } from '@/components/enregistrements/ModalShell';
import { Avatar } from '@/components/discussions/parts';
import { MathText } from '@/components/skilliq/MathText';
import { messagerieApi, type Conversation, type Membre, type Message } from '@/lib/api/messagerieApi';
import { dateLocale, t } from '@/i18n';
import { nomAffiche } from '@/lib/nomAffiche';

export const heure = (iso: string) => new Date(iso).toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' });

export function jour(iso: string) {
  const d = new Date(iso);
  const auj = new Date();
  const hier = new Date(Date.now() - 86400000);
  const meme = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (meme(d, auj)) return t('Aujourd’hui');
  if (meme(d, hier)) return t('Hier');
  return d.toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Moment du dernier message dans la liste : l'heure aujourd'hui, sinon la date courte. */
export function quand(iso: string) {
  const d = new Date(iso);
  if (d.toDateString() === new Date().toDateString()) return heure(iso);
  return d.toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short' });
}

export function dureeAppel(s?: number) {
  if (!s || s < 60) return t('moins d’une minute');
  const m = Math.round(s / 60);
  return m >= 60 ? t('{h} h {m} min', { h: Math.floor(m / 60), m: m % 60 }) : t('{m} min', { m });
}

/** Aperçu d'un message dans la liste des conversations. */
export function apercu(m: Message | null, moi: number, membres: Membre[]): string {
  if (!m) return t('Pas encore de message');
  if (m.supprime) return t('Message supprimé');
  const auteur = m.auteur === moi ? t('Toi') : nomAffiche(membres.find((x) => x.id === m.auteur));
  if (m.type === 'appel') return m.donnees.manque ? t('Appel manqué') : (m.donnees.video ? t('Appel vidéo') : t('Appel'));
  if (m.type === 'invitation') return t('{name} propose : {titre}', { name: auteur, titre: m.donnees.contenu?.title ?? '' });
  if (m.type === 'systeme') return m.donnees.code === 'ajout' ? t('{name} a rejoint le groupe', { name: m.donnees.membre ?? '' })
    : t('{name} a quitté le groupe', { name: m.donnees.membre ?? '' });
  return m.auteur === moi ? `${t('Toi')} : ${m.texte}` : m.texte;
}

/** Les avatars d'une conversation : un seul (directe), ou deux qui se chevauchent (groupe). */
export const AvatarConversation: React.FC<{ c: Conversation; moi: number; taille?: number }> = ({ c, moi, taille = 44 }) => {
  const autres = c.membres.filter((m) => m.id !== moi);
  if (c.type === 'directe' || autres.length <= 1) {
    const u = autres[0];
    return <Avatar user={{ username: u?.username ?? '?', display_name: u?.display_name, avatar: u?.avatar ?? null }} size={taille} />;
  }
  const p = Math.round(taille * 0.72);
  return (
    <span className="relative inline-block shrink-0" style={{ width: taille, height: taille }} aria-hidden>
      <span className="absolute start-0 top-0"><Avatar user={{ username: autres[0].username, avatar: autres[0].avatar ?? null }} size={p} /></span>
      <span className="absolute bottom-0 end-0"><Avatar user={{ username: autres[1].username, avatar: autres[1].avatar ?? null }} size={p} ring /></span>
    </span>
  );
};

export const LigneSysteme: React.FC<{ m: Message; membres: Membre[]; moi: number }> = ({ m, membres, moi }) => {
  const auteur = m.auteur === moi ? t('Tu') : (nomAffiche(membres.find((x) => x.id === m.auteur)) || t('Quelqu’un'));
  let texte = '';
  let Icone: React.ComponentType<{ className?: string }> | null = null;
  if (m.type === 'appel') {
    Icone = m.donnees.manque ? PhoneMissed : m.donnees.video ? Video : Phone;
    texte = m.donnees.manque
      ? (m.auteur === moi ? t('Appel sans réponse') : t('Appel manqué de {name}', { name: auteur }))
      : `${m.donnees.video ? t('Appel vidéo') : t('Appel')} · ${dureeAppel(m.donnees.duree)}`;
  } else if (m.donnees.code === 'ajout') {
    texte = t('{auteur} a ajouté {membre}', { auteur, membre: m.donnees.membre ?? '' });
  } else if (m.donnees.code === 'depart') {
    texte = t('{membre} a quitté le groupe', { membre: m.donnees.membre ?? '' });
  }
  return (
    <p className={`mx-auto my-2 flex w-max max-w-full items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] ${
      m.type === 'appel' && m.donnees.manque ? 'bg-[#fbecea] text-[#a23b34]' : 'bg-[#f2f1ee] text-ink-soft'}`}>
      {Icone && <Icone className="h-3.5 w-3.5 shrink-0" aria-hidden />}
      <span className="truncate">{texte}</span>
      <span className="fd-nums shrink-0 text-ink-faint">· {heure(m.created_at)}</span>
    </p>
  );
};

const TYPES: Record<string, string> = { exercise: 'Exercice', exam: 'Devoir', lesson: 'Leçon' };

/** « Travailler ensemble sur … » : le sujet proposé, et le bouton pour l'ouvrir avec le groupe. */
export const CarteInvitation: React.FC<{ m: Message; conversation: number; de: string; moi: boolean }> = ({ m, conversation, de, moi }) => {
  const c = m.donnees.contenu;
  if (!c) return null;
  return (
    <div className="w-[min(100%,340px)] overflow-hidden rounded-2xl border border-line bg-white">
      <div className="px-4 py-3">
        <p className="text-[12px] font-medium text-ink-faint">{moi ? t('Tu proposes de travailler ensemble') : t('{name} propose de travailler ensemble', { name: de })}</p>
        <p className="mt-1 text-[15px] font-semibold leading-snug text-ink">{c.title}</p>
        <p className="mt-0.5 text-[12.5px] text-ink-soft">{[t(TYPES[c.type] ?? 'Contenu'), c.level, c.chapter].filter(Boolean).join(' · ')}</p>
      </div>
      <Link to={`${c.url}?salle=${conversation}`}
        className="flex min-h-11 items-center justify-center gap-2 border-t border-line bg-brand-soft text-[13.5px] font-semibold text-brand-hover hover:bg-[#dcefe4]">
        <Users className="h-4 w-4" aria-hidden /> {t('Ouvrir ensemble')}
      </Link>
    </div>
  );
};

export const Bulle: React.FC<{
  m: Message; moi: boolean; debutGroupe: boolean; finGroupe: boolean; auteur?: Membre; groupe: boolean;
  onSupprimer: () => void; onSignaler: () => void; onReessayer: () => void; vu?: boolean;
}> = ({ m, moi, debutGroupe, finGroupe, auteur, groupe, onSupprimer, onSignaler, onReessayer, vu }) => {
  const envoi = !!m.client_id && !m.echec && m.id < 0;
  return (
    <div className={`group/b flex items-end gap-2 ${moi ? 'flex-row-reverse' : ''} ${debutGroupe ? 'mt-3' : 'mt-0.5'}`}>
      {!moi && groupe && (
        <span className="w-8 shrink-0">{finGroupe && auteur && <Avatar user={{ username: auteur.username, avatar: auteur.avatar ?? null }} size={32} />}</span>
      )}
      <div className={`flex max-w-[min(78%,560px)] flex-col ${moi ? 'items-end' : 'items-start'}`}>
        {!moi && groupe && debutGroupe && auteur && (
          <Link to={`/profile/${auteur.username}`} className="mb-0.5 px-1 text-[12px] font-medium text-ink-faint hover:underline">{nomAffiche(auteur)}</Link>
        )}
        {m.type === 'invitation' ? (
          <CarteInvitation m={m} conversation={m.conversation} de={nomAffiche(auteur)} moi={moi} />
        ) : (
          <div dir="auto" title={heure(m.created_at)}
            className={`whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[14.5px] leading-relaxed ${
              m.supprime ? 'border border-dashed border-line bg-transparent italic text-ink-faint'
                : moi ? 'bg-brand-soft text-ink' : 'border border-line bg-white text-ink'} ${envoi ? 'opacity-60' : ''}`}>
            {m.supprime ? t('Message supprimé') : <MathText text={m.texte} />}
          </div>
        )}
        {(finGroupe || m.echec) && (
          <p className="fd-nums mt-0.5 flex items-center gap-1.5 px-1 text-[11.5px] text-ink-faint">
            {m.echec ? (
              <button type="button" onClick={onReessayer} className="font-medium text-[#a23b34] hover:underline">{t('Non envoyé · Réessayer')}</button>
            ) : envoi ? t('Envoi…') : (
              <>{heure(m.created_at)}{vu && <span className="inline-flex items-center gap-0.5 text-brand"><Check className="h-3 w-3" aria-hidden />{t('Vu')}</span>}</>
            )}
          </p>
        )}
      </div>
      {/* Actions au survol (ordinateur) ou à l'appui (téléphone : boutons toujours visibles mais discrets). */}
      {!m.supprime && m.id > 0 && m.type === 'texte' && (
        <div className="mb-5 flex shrink-0 opacity-0 transition-opacity focus-within:opacity-100 group-hover/b:opacity-100 [@media(pointer:coarse)]:opacity-60">
          {moi ? (
            <button type="button" onClick={onSupprimer} aria-label={t('Supprimer le message')} title={t('Supprimer')}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint hover:bg-[#f2f1ee] hover:text-[#a23b34]">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button type="button" onClick={onSignaler} aria-label={t('Signaler le message')} title={t('Signaler à l’équipe')}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint hover:bg-[#f2f1ee] hover:text-ink">
              <Flag className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Choisir des personnes parmi ses abonnés mutuels : nouvelle conversation (une personne), groupe (plusieurs, 6 avec
 * soi au plus), ajout à un groupe, ou salle de travail sur un sujet.
 */
export const ChoixContacts: React.FC<{
  open: boolean; onClose: () => void; titre: string; action: string; exclure?: number[]; max?: number;
  avecTitre?: boolean; onValider: (noms: string[], titre: string) => Promise<void>;
}> = ({ open, onClose, titre, action, exclure = [], max = 5, avecTitre = false, onValider }) => {
  const id = useId();
  const [q, setQ] = useState('');
  const [contacts, setContacts] = useState<Membre[] | null>(null);
  const [choix, setChoix] = useState<string[]>([]);
  const [nom, setNom] = useState('');
  const [envoi, setEnvoi] = useState(false);
  useEffect(() => {
    if (!open) return;
    setChoix([]); setNom(''); setQ(''); setContacts(null);
    messagerieApi.contacts().then(setContacts).catch(() => setContacts([]));
  }, [open]);
  const visibles = useMemo(() => (contacts ?? []).filter((c) => !exclure.includes(c.id)
    && (!q || `${c.username} ${c.display_name ?? ''}`.toLowerCase().includes(q.trim().toLowerCase()))), [contacts, exclure, q]);
  const basculer = (u: string) => setChoix((c) => (c.includes(u) ? c.filter((x) => x !== u) : c.length >= max ? c : [...c, u]));
  const valider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!choix.length || envoi) return;
    setEnvoi(true);
    try { await onValider(choix, nom.trim()); } finally { setEnvoi(false); }
  };
  return (
    <ModalShell open={open} onClose={onClose} title={titre} labelId={id} onSubmit={valider}
      subtitle={t('Tu peux écrire aux membres que tu suis et qui te suivent.')}>
      <label className="relative block">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Rechercher un nom ou un pseudo')} aria-label={t('Rechercher un nom ou un pseudo')}
          className="h-11 w-full rounded-xl border border-line bg-white ps-9 pe-3 text-[14px] focus:border-brand focus:outline-none" />
      </label>
      <div className="mt-3 max-h-[46vh] min-h-[120px] overflow-y-auto rounded-xl border border-line">
        {contacts === null ? (
          <p className="flex items-center justify-center gap-2 py-10 text-[13.5px] text-ink-faint"><Loader2 className="h-4 w-4 animate-spin" /> {t('Chargement')}</p>
        ) : visibles.length === 0 ? (
          <div className="px-4 py-8 text-center text-[13.5px] text-ink-soft">
            {contacts.length === 0 ? (
              <>
                <p>{t('Personne pour l’instant : il faut vous suivre tous les deux pour vous écrire.')}</p>
                <Link to="/membres" onClick={onClose} className="mt-2 inline-block font-semibold text-brand hover:underline">{t('Trouver des membres')}</Link>
              </>
            ) : t('Aucun résultat.')}
          </div>
        ) : (
          <ul role="listbox" aria-multiselectable="true" aria-label={t('Contacts')}>
            {visibles.map((c) => {
              const pris = choix.includes(c.username);
              return (
                <li key={c.id} role="option" aria-selected={pris}>
                  <button type="button" onClick={() => basculer(c.username)}
                    className={`flex min-h-12 w-full items-center gap-3 px-3 py-2 text-start transition-colors hover:bg-[#f7f6f3] ${pris ? 'bg-brand-soft/60' : ''}`}>
                    <Avatar user={{ username: c.username, avatar: c.avatar ?? null }} size={34} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium text-ink">{nomAffiche(c)}</span>
                      {c.level && <span className="block truncate text-[12px] text-ink-faint">{c.level}</span>}
                    </span>
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${pris ? 'border-brand bg-brand text-white' : 'border-line bg-white'}`} aria-hidden>
                      {pris && <Check className="h-3.5 w-3.5" />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {avecTitre && choix.length > 1 && (
        <input value={nom} onChange={(e) => setNom(e.target.value.slice(0, 80))} placeholder={t('Nom du groupe (facultatif)')}
          aria-label={t('Nom du groupe')} className="mt-3 h-11 w-full rounded-xl border border-line bg-white px-3 text-[14px] focus:border-brand focus:outline-none" />
      )}
      <div className="mt-4 flex items-center justify-end gap-2">
        {choix.length >= max && <span className="me-auto text-[12.5px] text-ink-faint">{t('{n} personnes au plus', { n: max })}</span>}
        <button type="button" onClick={onClose} className="fd-btn-ghost min-h-10">{t('Annuler')}</button>
        <button type="submit" disabled={!choix.length || envoi} className="fd-btn-primary min-h-10 disabled:opacity-50">
          {envoi && <Loader2 className="h-4 w-4 animate-spin" />} {action}
        </button>
      </div>
    </ModalShell>
  );
};
