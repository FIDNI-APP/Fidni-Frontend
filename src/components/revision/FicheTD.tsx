// « Fiche TD » (11/10/2026) : depuis une liste d'exercices ou d'examens, regrouper ceux de son choix en une
// fiche imprimable, sans passer par la page Réviser. Un panneau suit l'écran (en bas à droite) ; on y glisse les
// cartes, ou on les ajoute avec « + Fiche ».
// Téléphone et tablette en portrait (barre d'onglets, < 768 px, 12/10/2026) : le panneau devient une barre
// compacte au-dessus des onglets (la liste reste visible pour toucher « + Fiche »), qui se déplie en feuille ;
// au doigt, pas de glisser-déposer : l'ordre se change avec ↑ ↓.
// « Créer la fiche » en fait une liste de révision étiquetée avec le niveau, la matière et le chapitre de la
// page (filtres de « Réviser »), puis la fiche s'envole vers « Réviser ».
// La fiche en cours est gardée dans ce navigateur : on peut changer de chapitre et continuer à la remplir.
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, Check, ChevronUp, ClipboardList, GripVertical, Loader2, Plus, Printer, X } from 'lucide-react';
import { t } from '@/i18n';
import { addItemToRevisionList, createRevisionList, getRevisionLists, type RevisionList } from '@/lib/api/revisionListApi';

export interface FicheItem { id: number; title: string; type: 'exercise' | 'exam' }
interface FicheState { open: boolean; name: string; items: FicheItem[] }
export interface FicheContext { levelIds: number[]; subjectIds: number[]; chapterIds: number[]; label: string | null }

const DRAG = 'application/x-fidni-contenu';
const key = (userId: string | number) => `fidni:fiche-td:${userId}`;
const empty: FicheState = { open: false, name: '', items: [] };

/** Vrai tant que la requête média est vérifiée (suit les changements : rotation, fenêtre redimensionnée). */
function useMedia(query: string) {
  const [on, setOn] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const apply = () => setOn(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [query]);
  return on;
}
/** Au-delà : la barre d'onglets du bas disparaît (MobileTabBar, md). */
const useWide = () => useMedia('(min-width: 768px)');
/** Souris ou pavé : le glisser-déposer a un sens ; au doigt, il gênerait le défilement. */
const useCanDrag = () => useMedia('(hover: hover) and (pointer: fine)');

/** État de la fiche en cours (gardé dans ce navigateur, par compte). */
export function useFicheTD(userId: string | number | undefined) {
  const [s, setS] = useState<FicheState>(empty);
  useEffect(() => {
    if (!userId) return;
    try { const raw = localStorage.getItem(key(userId)); setS(raw ? { ...empty, ...JSON.parse(raw) } : empty); } catch { setS(empty); }
  }, [userId]);
  const save = useCallback((next: FicheState) => {
    setS(next);
    if (userId) { try { localStorage.setItem(key(userId), JSON.stringify(next)); } catch { /* stockage bloqué : la fiche vit le temps de la page */ } }
  }, [userId]);
  return {
    ...s,
    has: (id: number) => s.items.some((x) => x.id === id),
    add: (it: FicheItem) => { if (!s.items.some((x) => x.id === it.id)) save({ ...s, open: true, items: [...s.items, it] }); },
    remove: (id: number) => save({ ...s, items: s.items.filter((x) => x.id !== id) }),
    move: (from: number, to: number) => {
      const items = [...s.items];
      const [it] = items.splice(from, 1);
      items.splice(to, 0, it);
      save({ ...s, items });
    },
    setOpen: (open: boolean) => save({ ...s, open }),
    setName: (name: string) => save({ ...s, name }),
    reset: () => save(empty),
    /** Fiche créée : on repart d'une fiche vide, panneau ouvert (le message de réussite y est). */
    restart: () => save({ ...empty, open: true }),
  };
}
export type FicheTD = ReturnType<typeof useFicheTD>;

/** Une carte de la liste : glissable vers la fiche, et un bouton « + Fiche » quand la fiche est ouverte. */
export const FicheSlot: React.FC<{ fiche: FicheTD; item: FicheItem; children: React.ReactNode }> = ({ fiche, item, children }) => {
  const canDrag = useCanDrag();
  if (!fiche.open) return <>{children}</>;
  const inFiche = fiche.has(item.id);
  return (
    <div className="relative" draggable={canDrag}
      onDragStart={canDrag ? (e) => { e.dataTransfer.setData(DRAG, JSON.stringify(item)); e.dataTransfer.effectAllowed = 'copy'; } : undefined}>
      <div className={`rounded-2xl transition-shadow ${inFiche ? 'ring-2 ring-brand/60' : canDrag ? 'cursor-grab hover:ring-2 hover:ring-ink/15' : ''}`}>{children}</div>
      <button type="button" onClick={() => (inFiche ? fiche.remove(item.id) : fiche.add(item))}
        aria-pressed={inFiche} aria-label={inFiche ? t('Retirer « {title} » de la fiche', { title: item.title }) : t('Ajouter « {title} » à la fiche', { title: item.title })}
        className={`absolute -top-4 end-3 z-10 inline-flex h-9 items-center gap-1 rounded-full px-3.5 text-[13px] font-semibold shadow-sm transition-colors md:-top-3.5 md:end-4 md:h-8 md:px-3 md:text-[12.5px] ${
          inFiche ? 'bg-brand text-white [@media(hover:hover)]:hover:bg-brand-hover' : 'border border-line bg-white text-ink [@media(hover:hover)]:hover:border-ink'}`}>
        {inFiche ? <><Check className="h-3.5 w-3.5" /> {t('Dans la fiche')}</> : <><Plus className="h-3.5 w-3.5" /> {t('Fiche')}</>}
      </button>
    </div>
  );
};

/** L'envol vers « Réviser » : une pastille part du panneau et file vers le lien du menu, qui pulse à l'arrivée. */
function flyToRevise(from: DOMRect) {
  const targets = [...document.querySelectorAll<HTMLAnchorElement>('a[href="/reviser"]')]
    .filter((a) => { const r = a.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight; });
  const target = targets[0];
  if (!target || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const to = target.getBoundingClientRect();
  const dot = document.createElement('div');
  dot.setAttribute('aria-hidden', 'true');
  Object.assign(dot.style, {
    position: 'fixed', left: `${from.left + from.width / 2 - 22}px`, top: `${from.top + from.height / 2 - 22}px`, width: '44px', height: '44px',
    borderRadius: '14px', background: '#1a7a4a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: '200', boxShadow: '0 10px 30px rgba(26,122,74,.35)', pointerEvents: 'none', fontSize: '20px',
  });
  dot.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg>';
  document.body.appendChild(dot);
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const anim = dot.animate([
    { transform: 'translate(0,0) scale(1)', opacity: 1 },
    { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 80}px) scale(1.1)`, opacity: 1, offset: 0.5 },
    { transform: `translate(${dx}px, ${dy}px) scale(.35)`, opacity: 0.2 },
  ], { duration: 850, easing: 'cubic-bezier(.45,.05,.3,1)' });
  anim.onfinish = () => {
    dot.remove();
    target.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12)', background: '#e6f2ec' }, { transform: 'scale(1)' }],
      { duration: 500, easing: 'ease-out' });
  };
}

interface Created { id: number; name: string; count: number }

/** Le panneau de la fiche : la liste glissée, le nom, « Créer la fiche », et les listes déjà faites sur ce chapitre. */
export const FichePanel: React.FC<{ fiche: FicheTD; context: FicheContext }> = ({ fiche, context }) => {
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);
  const [related, setRelated] = useState<RevisionList[] | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  // Téléphone : barre compacte (la liste reste visible) ou feuille dépliée.
  const [expanded, setExpanded] = useState(false);
  const wide = useWide();
  const canDrag = useCanDrag();
  const panelRef = React.useRef<HTMLDivElement>(null);
  const chapterKey = context.chapterIds.join(',');

  // Ses listes déjà étiquetées avec ce chapitre (ou contenant ses exercices) : accès direct, sans aller dans « Réviser ».
  useEffect(() => {
    if (!fiche.open) return;
    let off = false;
    getRevisionLists().then((lists) => {
      if (off) return;
      const ids = new Set(context.chapterIds);
      setRelated(ids.size
        ? lists.filter((l) => (l.chapters || []).some((c) => ids.has(c.id)) || (context.label && (l.item_chapters || []).includes(context.label)))
        : lists.slice(0, 5));
    }).catch(() => setRelated([]));
    return () => { off = true; };
  }, [fiche.open, chapterKey, created?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Feuille dépliée : Échap la replie.
  useEffect(() => {
    if (wide || !expanded || !fiche.open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setExpanded(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [wide, expanded, fiche.open]);

  if (!fiche.open) return null;
  const close = () => { setCreated(null); setExpanded(false); fiche.setOpen(false); };
  const n = fiche.items.length;
  const defaultName = context.label ? t('Fiche TD — {label}', { label: context.label }) : t('Fiche TD');
  const name = fiche.name || defaultName;

  const drop = (e: React.DragEvent) => {
    e.preventDefault(); setOver(false);
    try { const it = JSON.parse(e.dataTransfer.getData(DRAG)) as FicheItem; if (it?.id) fiche.add(it); } catch { /* glissé d'ailleurs */ }
  };
  const create = async () => {
    if (!fiche.items.length) return;
    setBusy(true); setError(null);
    try {
      // Nom unique par compte : le nom proposé prend « (2) », « (3) »… s'il existe déjà ; un nom choisi reste tel quel.
      const labels = { class_level_ids: context.levelIds, subject_ids: context.subjectIds, chapter_ids: context.chapterIds };
      const base = name.trim().slice(0, 190);
      let list: RevisionList | null = null;
      for (let n = 1; !list; n += 1) {
        try {
          list = await createRevisionList({ name: n === 1 ? base : `${base} (${n})`, ...labels });
        } catch (err) {
          const dup = (err as { response?: { status?: number } })?.response?.status === 400;
          if (!dup || fiche.name || n >= 20) throw err;
        }
      }
      for (const it of fiche.items) await addItemToRevisionList(list.id, { content_type: it.type, object_id: it.id });
      if (panelRef.current) flyToRevise(panelRef.current.getBoundingClientRect());
      setCreated({ id: list.id, name: list.name, count: fiche.items.length });
      fiche.restart();
    } catch (e) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      setError(status === 400 ? t('Tu as déjà une liste avec ce nom : change le nom de la fiche.') : t('La fiche n’a pas pu être créée. Réessaie.'));
    } finally {
      setBusy(false);
    }
  };

  // Téléphone, feuille repliée : une barre au-dessus des onglets ; la liste reste visible pour toucher « + Fiche ».
  if (!wide && !expanded) {
    return (
      <>
        <div aria-hidden className="h-24" />
        <div ref={panelRef} role="region" aria-label={t('Fiche TD en cours')}
          className="fixed inset-x-3 bottom-[calc(var(--fd-tabbar-h,0px)+10px)] z-[45] flex items-center gap-1 rounded-2xl border border-line bg-white p-1.5 shadow-[0_10px_32px_rgba(20,18,16,.20)] print:hidden">
          <button type="button" onClick={() => setExpanded(true)} aria-expanded={false}
            className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-xl px-2 text-start active:bg-paper">
            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-white">
              <ClipboardList className="h-[18px] w-[18px]" aria-hidden />
              {n > 0 && <span className="fd-nums absolute -end-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gold px-1 text-[11px] font-bold text-white ring-2 ring-white">{n}</span>}
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block text-[14px] font-semibold text-ink">{created && !n ? t('Fiche créée') : t('Fiche TD')}</span>
              <span className="block truncate text-[12px] text-ink-soft">
                {n ? (n > 1 ? t('{n} exercices · touche pour voir et créer', { n }) : t('{n} exercice · touche pour voir et créer', { n })) : created ? t('Elle est dans Réviser · touche pour l’imprimer') : t('Touche « + Fiche » sur un exercice')}
              </span>
            </span>
            <ChevronUp className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden />
          </button>
          <button type="button" onClick={close} aria-label={t('Fermer la fiche (elle est gardée)')}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink-faint active:bg-paper"><X className="h-4 w-4" /></button>
        </div>
      </>
    );
  }

  const sheet = !wide; // téléphone, feuille dépliée
  return (
    <>
    {sheet && <div aria-hidden className="h-24" />}
    {sheet && <div aria-hidden className="fixed inset-0 z-[44] bg-[rgba(20,18,16,.32)] print:hidden" onClick={() => setExpanded(false)} />}
    <div ref={panelRef} role={sheet ? 'dialog' : 'region'} aria-label={t('Fiche TD en cours')} aria-modal={sheet || undefined}
      className={sheet
        ? 'fixed inset-x-0 bottom-[var(--fd-tabbar-h,0px)] z-[45] flex max-h-[min(78dvh,600px)] flex-col overflow-hidden rounded-t-2xl border-t border-line bg-white shadow-[0_-12px_40px_rgba(20,18,16,.18)] print:hidden'
        : 'fixed bottom-5 end-5 z-[45] flex max-h-[min(70vh,640px)] w-[340px] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_12px_40px_rgba(20,18,16,.18)] print:hidden'}>
      {sheet && <div aria-hidden className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-[#dcd8d0]" />}
      <div className="flex shrink-0 items-center gap-2 border-b border-line px-4 py-3">
        <ClipboardList className="h-4 w-4 text-brand" aria-hidden />
        <p className="flex-1 text-[14px] font-semibold text-ink">{t('Fiche TD')}{n ? <span className="fd-nums ms-1.5 font-normal text-ink-faint">· {n}</span> : null}</p>
        {sheet && (
          <button type="button" onClick={() => setExpanded(false)} className="inline-flex h-9 items-center rounded-lg px-2.5 text-[13px] font-medium text-ink-soft active:bg-paper">
            {t('Ajouter des exercices')}
          </button>
        )}
        <button type="button" onClick={close} aria-label={t('Fermer la fiche (elle est gardée)')}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-faint hover:bg-[#f2f1ee] hover:text-ink"><X className="h-4 w-4" /></button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {created && (
          <div className="m-3 rounded-xl border border-brand-line bg-brand-soft px-3.5 py-3">
            <p className="flex items-center gap-1.5 text-[13.5px] font-semibold text-brand-hover"><Check className="h-4 w-4" /> {t('Fiche créée')}</p>
            <p className="mt-0.5 text-[12.5px] text-ink-soft">{created.count > 1 ? t('« {name} » ({n} contenus) est dans Réviser.', { name: created.name, n: created.count }) : t('« {name} » ({n} contenu) est dans Réviser.', { name: created.name, n: created.count })}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link to={`/revision-lists/${created.id}/pdf`} className="fd-btn-primary min-h-9 px-3 text-[12.5px]"><Printer className="h-3.5 w-3.5" /> {t('Imprimer')}</Link>
              <Link to={`/revision-lists/${created.id}`} className="inline-flex min-h-9 items-center rounded-xl border border-line bg-white px-3 text-[12.5px] font-medium text-ink hover:border-ink">{t('Ouvrir')}</Link>
            </div>
          </div>
        )}

        <div className="px-3 pb-3 pt-3">
          <label htmlFor="fiche-nom" className="sr-only">{t('Nom de la fiche')}</label>
          <input id="fiche-nom" value={fiche.name} placeholder={defaultName} onChange={(e) => fiche.setName(e.target.value)} maxLength={200}
            className="h-10 w-full rounded-xl border border-line px-3 text-[13.5px] font-medium text-ink placeholder:text-ink-soft focus:border-brand focus:outline-none" />

          <ol onDragOver={(e) => { if (e.dataTransfer.types.includes(DRAG)) { e.preventDefault(); setOver(true); } }}
            onDragLeave={() => setOver(false)} onDrop={drop}
            className={`mt-2 min-h-[88px] space-y-1.5 rounded-xl border-2 border-dashed p-1.5 transition-colors ${over ? 'border-brand bg-brand-soft/50' : 'border-[#e2ded6]'}`}>
            {fiche.items.length === 0 && (
              <li className="px-2 py-5 text-center text-[12.5px] leading-snug text-ink-faint">
                {canDrag
                  ? <>{t('Glisse des exercices ici,')}<br />{t('ou clique sur')} <b className="text-ink-soft">{t('+ Fiche')}</b> {t('sur une carte.')}</>
                  : <>{t('Touche')} <b className="text-ink-soft">{t('+ Fiche')}</b> {t('sur un exercice')}<br />{t('pour l’ajouter ici.')}</>}
              </li>
            )}
            {fiche.items.map((it, i) => (
              <li key={it.id} draggable={canDrag} onDragStart={canDrag ? () => setDragIndex(i) : undefined} onDragEnd={() => setDragIndex(null)}
                onDragOver={(e) => { if (dragIndex !== null && dragIndex !== i) { e.preventDefault(); fiche.move(dragIndex, i); setDragIndex(i); } }}
                className={`group flex items-center gap-1.5 rounded-lg bg-paper px-2 text-[13px] ${canDrag ? 'py-1.5' : 'py-1'}`}>
                {canDrag && <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-ink-faint" aria-hidden />}
                <span className="fd-nums w-4 shrink-0 text-[11.5px] text-ink-faint">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-ink" title={it.title}>{it.title}</span>
                {!canDrag && (
                  <>
                    <button type="button" onClick={() => fiche.move(i, i - 1)} disabled={i === 0} aria-label={t('Monter « {title} »', { title: it.title })}
                      className="flex h-9 w-8 items-center justify-center rounded-md text-ink-soft active:bg-white disabled:opacity-25"><ArrowUp className="h-4 w-4" /></button>
                    <button type="button" onClick={() => fiche.move(i, i + 1)} disabled={i === fiche.items.length - 1} aria-label={t('Descendre « {title} »', { title: it.title })}
                      className="flex h-9 w-8 items-center justify-center rounded-md text-ink-soft active:bg-white disabled:opacity-25"><ArrowDown className="h-4 w-4" /></button>
                  </>
                )}
                <button type="button" onClick={() => fiche.remove(it.id)} aria-label={t('Retirer « {title} »', { title: it.title })}
                  className={canDrag
                    ? 'rounded p-0.5 text-ink-faint opacity-60 hover:text-[#a23b34] group-hover:opacity-100'
                    : 'flex h-9 w-8 items-center justify-center rounded-md text-ink-faint active:bg-white active:text-[#a23b34]'}><X className="h-4 w-4 md:h-3.5 md:w-3.5" /></button>
              </li>
            ))}
          </ol>
          {context.label && <p className="mt-1.5 text-[11.5px] text-ink-faint">{t('Rangée dans Réviser avec le chapitre « {label} ».', { label: context.label })}</p>}
          {error && <p className="mt-2 text-[12.5px] text-[#9c3b2e]">{error}</p>}
          <button type="button" onClick={create} disabled={busy || !fiche.items.length}
            className="fd-btn-primary mt-2.5 min-h-11 w-full justify-center text-[14px] disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {t('Créer la fiche')}{fiche.items.length ? ` (${fiche.items.length})` : ''}
          </button>
        </div>

        {related && related.length > 0 && (
          <div className="border-t border-line px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[.08em] text-ink-faint">{context.chapterIds.length ? t('Tes listes sur ce chapitre') : t('Tes listes')}</p>
            <ul className="mt-1.5 space-y-1">
              {related.slice(0, 6).map((l) => (
                <li key={l.id} className="flex items-center gap-2 text-[13px]">
                  <Link to={`/revision-lists/${l.id}`} className="min-w-0 flex-1 truncate text-ink hover:underline">{l.name}</Link>
                  <span className="fd-nums shrink-0 text-[11.5px] text-ink-faint">{l.item_count}</span>
                  <Link to={`/revision-lists/${l.id}/pdf`} aria-label={t('Imprimer « {name} »', { name: l.name })} className="rounded p-1 text-ink-faint hover:text-ink"><Printer className="h-3.5 w-3.5" /></Link>
                </li>
              ))}
            </ul>
            <Link to="/reviser#mes-listes" className="mt-2 inline-block text-[12.5px] font-medium text-brand-hover hover:underline">{t('Toutes mes listes')}</Link>
          </div>
        )}
      </div>
    </div>
    </>
  );
};

/**
 * Bouton flottant, seul en bas à droite (11/10/2026 : dans l'en-tête, parmi les autres boutons blancs, on ne le
 * voyait pas). Vert comme une action principale, il suit l'écran et laisse sa place au panneau quand il s'ouvre.
 */
export const FicheButton: React.FC<{ fiche: FicheTD }> = ({ fiche }) => {
  if (fiche.open) return null;
  const n = fiche.items.length;
  // Téléphone (barre d'onglets, < md) : pastille compacte juste au-dessus des onglets, et une marge en fin de liste
  // pour que la dernière carte ne reste pas dessous.
  return (
    <>
    <div aria-hidden className="h-16 md:hidden" />
    <button type="button" onClick={() => fiche.setOpen(true)} data-tour="liste-fiche"
      aria-label={n ? (n > 1 ? t('Ma fiche TD : {n} contenus', { n }) : t('Ma fiche TD : {n} contenu', { n })) : t('Créer une fiche TD')}
      className="fixed bottom-[calc(var(--fd-tabbar-h,0px)+12px)] end-3 z-[45] inline-flex min-h-12 items-center gap-2 rounded-full bg-brand ps-2 pe-4 text-white shadow-[0_10px_28px_rgba(26,122,74,.38)] transition-transform focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/30 active:scale-[.97] print:hidden md:bottom-6 md:end-6 md:gap-2.5 md:ps-4 md:pe-5 [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:bg-brand-hover">
      <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
        <ClipboardList className="h-[18px] w-[18px]" aria-hidden />
        {n > 0 && (
          <span className="fd-nums absolute -end-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gold px-1 text-[11px] font-bold text-white ring-2 ring-brand">{n}</span>
        )}
      </span>
      <span className="text-start leading-tight">
        <span className="block text-[14px] font-semibold"><span className="md:hidden">{t('Fiche TD')}</span><span className="hidden md:inline">{n ? t('Ma fiche TD') : t('Créer une fiche TD')}</span></span>
        <span className="hidden text-[11.5px] text-white/80 md:block">{n ? (n > 1 ? t('{n} exercices · à imprimer', { n }) : t('{n} exercice · à imprimer', { n })) : t('Regroupe des exercices à imprimer')}</span>
      </span>
    </button>
    </>
  );
};
