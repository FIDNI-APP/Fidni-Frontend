/**
 * Astuces (bêta du 27/11/2026) — Natsu : « une section astuces : pour chaque chapitre, des techniques
 * selon le type de question […] expliquer pourquoi on a utilisé l'absurde […] très clair, bien catégorisé, avec des
 * filtres ». Première version : 2ème Bac SM, chapitres des DS n° 1 et n° 2.
 *
 * Une astuce se lit en six blocs : quand y penser (les indices de l'énoncé), pourquoi ça marche, la méthode, un exemple
 * corrigé, le piège, et les questions du site où elle sert. Filtres : chapitre, type de question, technique, recherche ;
 * gardés dans l'adresse (?chapitre=…&astuce=…) pour pouvoir partager un lien précis.
 *
 * Équipe (27/11/2026, Natsu : « un bouton admin pour activer ou désactiver la vue pour les autres […] qu'on puisse
 * modifier chaque astuce, comme les contenus ») : interrupteur « Visible par », « Nouvelle astuce », « Modifier » sur
 * chaque astuce (AstuceEditeur), astuces masquées sur fond gris. Les autres membres n'y accèdent que si c'est ouvert.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight, ChevronDown, Eye, EyeOff, Lightbulb, Pencil, Plus, Search, Users, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { isModerator } from '@/lib/features';
import {
  creerAstuce, getAstuces, modifierAstuce, retirerAstuce, setAstucesOuvertes,
  type AstuceEquipe as Astuce, type AstuceSaisie, type AstucesReponse,
} from '@/lib/api/astucesApi';
import { AstuceEditeur } from '@/components/astuces/AstuceEditeur';
import { signalerChangementAstuces } from '@/components/astuces/etatAstuces';
import { renderContentHtml } from '@/components/editor/TipTapRenderer';
import { ReadingStyles } from '@/components/content/viewer/ReadingStyles';
import { trackAction } from '@/lib/usage';
import { t } from '@/i18n';

const Html: React.FC<{ html: string; className?: string; as?: 'div' | 'span' }> = ({ html, className = '', as = 'div' }) => {
  const Tag = as;
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: renderContentHtml(html) }} />;
};

const sansAccents = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function Astuces() {
  const { user, isLoading } = useAuth();
  const [donnees, setDonnees] = useState<AstucesReponse | null>(null);
  const [erreur, setErreur] = useState(false);
  const [refuse, setRefuse] = useState(false);
  // Équipe : astuce en cours de modification (slug), ou « nouvelle ».
  const [edition, setEdition] = useState<string | null>(null);
  const [params, setParams] = useSearchParams();
  const chapitre = params.get('chapitre') || '';
  const type = params.get('type') || '';
  const technique = params.get('technique') || '';
  const q = params.get('q') || '';
  const ouverte = params.get('astuce') || '';

  const admin = isModerator(user);
  useEffect(() => {
    if (isLoading) return;
    getAstuces().then(setDonnees).catch((e) => (e?.response?.status === 403 ? setRefuse(true) : setErreur(true)));
  }, [isLoading, user?.id]);
  const equipe = !!donnees?.peut_modifier && admin;

  const basculerOuverture = async () => {
    if (!donnees) return;
    const r = await setAstucesOuvertes(!donnees.ouvert);
    setDonnees({ ...donnees, ouvert: r.ouvert });
    signalerChangementAstuces(r.ouvert);
  };
  const remplacer = (a: Astuce, ancien?: string) => setDonnees((d) => {
    if (!d) return d;
    const liste = ancien ? d.astuces.map((x) => (x.slug === ancien ? a : x)) : [...d.astuces, a];
    return { ...d, astuces: [...liste].sort((x, y) => (x.rang_chapitre ?? 99) - (y.rang_chapitre ?? 99) || (x.ordre ?? 0) - (y.ordre ?? 0)) };
  });
  const enregistrer = async (slug: string | null, saisie: AstuceSaisie) => {
    const a = slug ? await modifierAstuce(slug, saisie) : await creerAstuce(saisie);
    remplacer(a, slug ?? undefined);
    setEdition(null);
    changer('astuce', a.slug);
  };
  const retirer = async (a: Astuce) => {
    await retirerAstuce(a.slug);
    setDonnees((d) => d && { ...d, astuces: a.source === 'admin' ? d.astuces.filter((x) => x.slug !== a.slug)
      : d.astuces.map((x) => (x.slug === a.slug ? { ...x, publie: false } : x)) });
    setEdition(null);
  };

  const changer = (cle: string, valeur: string) => {
    const p = new URLSearchParams(params);
    if (valeur) p.set(cle, valeur); else p.delete(cle);
    if (cle !== 'astuce') p.delete('astuce');
    setParams(p, { replace: true });
  };

  const visibles = useMemo(() => {
    const mots = sansAccents(q).split(/\s+/).filter(Boolean);
    return (donnees?.astuces ?? []).filter((a) => (!chapitre || a.chapitre === chapitre)
      && (!type || a.type_question === type) && (!technique || a.technique === technique)
      && mots.every((m) => sansAccents(`${a.titre} ${a.resume} ${a.technique} ${a.type_question} ${a.signaux.join(' ')}`).includes(m)));
  }, [donnees, chapitre, type, technique, q]);

  const parChapitre = useMemo(() => {
    const groupes: { nom: string; astuces: Astuce[] }[] = [];
    for (const a of visibles) {
      const g = groupes.find((x) => x.nom === a.chapitre);
      if (g) g.astuces.push(a); else groupes.push({ nom: a.chapitre, astuces: [a] });
    }
    return groupes;
  }, [visibles]);

  // Chapitres du filtre : comptés sur la liste (ils suivent les modifications de l'équipe).
  const chapitresFiltre = useMemo(() => {
    const out: { nom: string; nombre: number }[] = [];
    for (const a of donnees?.astuces ?? []) {
      const c = out.find((x) => x.nom === a.chapitre);
      if (c) c.nombre++; else out.push({ nom: a.chapitre, nombre: 1 });
    }
    return out;
  }, [donnees]);
  const tousTypes = [...new Set((donnees?.astuces ?? []).map((a) => a.type_question))].sort();
  const toutesTechniques = [...new Set((donnees?.astuces ?? []).map((a) => a.technique))].sort();
  // Types et techniques proposés : ceux du chapitre choisi seulement.
  const dansChapitre = (donnees?.astuces ?? []).filter((a) => !chapitre || a.chapitre === chapitre);
  const types = [...new Set(dansChapitre.map((a) => a.type_question))].sort();
  const techniques = [...new Set(dansChapitre.map((a) => a.technique))].sort();
  const filtre = !!(chapitre || type || technique || q);

  if (isLoading) return null;
  if (refuse) return <Navigate to="/" replace />;

  return (
    <main className="mx-auto w-full max-w-[920px] px-4 pb-16 pt-6 sm:pt-8">
      <ReadingStyles />
      <header>
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-[28px] font-semibold leading-tight text-ink sm:text-[32px]">{t('Astuces')}</h1>
          {equipe && <span className="rounded-full bg-gold-soft px-2.5 py-0.5 text-[12px] font-semibold text-gold-strong">{t('bêta')}</span>}
        </div>
        <p className="mt-1.5 text-[15px] text-ink-soft">{t('Les techniques à connaître, rangées par type de question.')}</p>
        <p className="mt-0.5 text-[13px] text-ink-faint">{t('2ème Bac SM · chapitres des DS n° 1 et n° 2')}</p>
      </header>

      {/* Équipe : qui voit la section, et nouvelle astuce. */}
      {equipe && donnees && (
        <section className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-gold-line bg-gold-soft/50 px-4 py-3" aria-label={t('Réglages de l’équipe')}>
          <Users className="h-4 w-4 shrink-0 text-gold-strong" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-ink">{donnees.ouvert ? t('Visible par tous les membres') : t('Visible par l’équipe seulement')}</p>
            <p className="text-[12.5px] text-ink-soft">{donnees.ouvert ? t('Les élèves voient « Astuces » dans le menu.') : t('Les élèves ne voient pas encore cette page.')}</p>
          </div>
          <button type="button" role="switch" aria-checked={donnees.ouvert} onClick={basculerOuverture}
            aria-label={t('Montrer les astuces à tous les membres')}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${donnees.ouvert ? 'bg-brand' : 'bg-[#d8d3ca]'}`}>
            <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-[inset-inline-start] ${donnees.ouvert ? 'start-[22px]' : 'start-0.5'}`} />
          </button>
          <button type="button" onClick={() => setEdition('nouvelle')}
            className="fd-btn-primary min-h-10 px-3.5"><Plus className="h-4 w-4" /> {t('Nouvelle astuce')}</button>
        </section>
      )}
      {equipe && edition === 'nouvelle' && (
        <section className="mt-5 overflow-hidden rounded-2xl border border-[#cfc9bf] bg-white">
          <p className="px-4 pt-3.5 text-[15px] font-semibold text-ink sm:px-5">{t('Nouvelle astuce')}</p>
          <AstuceEditeur chapitres={donnees?.chapitres_niveau ?? []} types={tousTypes} techniques={toutesTechniques} chapitreParDefaut={chapitre}
            onEnregistrer={(x) => enregistrer(null, x)} onAnnuler={() => setEdition(null)} />
        </section>
      )}

      {/* Filtres */}
      <section className="mt-6 rounded-2xl border border-line bg-white p-4 sm:p-5" aria-label={t('Filtres')}>
        <label className="relative block">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
          <input value={q} onChange={(e) => changer('q', e.target.value)} placeholder={t('Chercher : absurde, TVI, suite…')}
            className="h-11 w-full rounded-xl border border-line bg-[#fcfbf9] ps-9 pe-3 text-[14.5px] text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none" />
        </label>
        <div className="mt-3.5 flex flex-wrap gap-1.5" role="radiogroup" aria-label={t('Chapitre')}>
          {[{ nom: '', nombre: donnees?.astuces.length ?? 0 }, ...chapitresFiltre].map((c) => {
            const actif = chapitre === c.nom;
            return (
              <button key={c.nom || 'tous'} type="button" role="radio" aria-checked={actif}
                onClick={() => { const p = new URLSearchParams(params); if (c.nom) p.set('chapitre', c.nom); else p.delete('chapitre'); p.delete('type'); p.delete('technique'); p.delete('astuce'); setParams(p, { replace: true }); }}
                className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13.5px] font-medium transition-colors ${
                  actif ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-soft hover:border-[#cfc9bf] hover:text-ink'}`}>
                {c.nom ? t(c.nom) : t('Tous les chapitres')}
                <span className={`fd-nums text-[12px] ${actif ? 'text-white/70' : 'text-ink-faint'}`}>{c.nombre}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Choix label={t('Type de question')} valeur={type} tous={t('Tous les types de question')} options={types} onChange={(v) => changer('type', v)} />
          <Choix label={t('Technique')} valeur={technique} tous={t('Toutes les techniques')} options={techniques} onChange={(v) => changer('technique', v)} />
        </div>
        {filtre && (
          <div className="mt-3 flex items-center justify-between text-[13px]">
            <span className="text-ink-faint fd-nums">{visibles.length > 1 ? t('{n} astuces', { n: visibles.length }) : t('{n} astuce', { n: visibles.length })}</span>
            <button type="button" onClick={() => setParams(new URLSearchParams(), { replace: true })}
              className="inline-flex items-center gap-1 font-medium text-ink-soft hover:text-ink"><X className="h-3.5 w-3.5" /> {t('Effacer les filtres')}</button>
          </div>
        )}
      </section>

      {erreur && <p className="mt-8 text-center text-[14px] text-ink-faint">{t('Les astuces ne se chargent pas. Réessaie plus tard.')}</p>}
      {!donnees && !erreur && <p className="mt-8 text-center text-[14px] text-ink-faint">{t('Chargement…')}</p>}
      {donnees && !visibles.length && <p className="mt-8 text-center text-[14px] text-ink-faint">{t('Aucune astuce avec ces filtres.')}</p>}

      {parChapitre.map((g) => (
        <section key={g.nom} className="mt-9">
          <h2 className="mb-3 flex items-baseline gap-2 text-[19px] font-semibold text-ink">
            {t(g.nom)} <span className="text-[13px] font-normal text-ink-faint fd-nums">{g.astuces.length}</span>
          </h2>
          <ul className="flex flex-col gap-2.5">
            {g.astuces.map((a) => (
              <li key={a.slug}><CarteAstuce astuce={a} ouverte={ouverte === a.slug || edition === a.slug}
                onBasculer={() => { if (ouverte !== a.slug) trackAction('astuce-ouverte'); changer('astuce', ouverte === a.slug ? '' : a.slug); }}
                onModifier={equipe ? () => { setEdition(a.slug); changer('astuce', a.slug); } : undefined}
                editeur={equipe && edition === a.slug ? (
                  <AstuceEditeur astuce={a} chapitres={donnees?.chapitres_niveau ?? []} types={tousTypes} techniques={toutesTechniques}
                    onEnregistrer={(x) => enregistrer(a.slug, x)} onAnnuler={() => setEdition(null)} onRetirer={() => retirer(a)} />
                ) : undefined} /></li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}

const Choix: React.FC<{ label: string; valeur: string; tous: string; options: string[]; onChange: (v: string) => void }> = ({ label, valeur, tous, options, onChange }) => (
  <label className="block">
    <span className="sr-only">{label}</span>
    <select value={valeur} onChange={(e) => onChange(e.target.value)} aria-label={label}
      className={`h-10 w-full rounded-xl border px-3 text-[14px] focus:border-brand focus:outline-none ${valeur ? 'border-brand-line bg-brand-soft text-brand-hover font-medium' : 'border-line bg-white text-ink-soft'}`}>
      <option value="">{tous}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  </label>
);

const Titre: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="mb-2 text-[12.5px] font-semibold text-ink-faint">{children}</h3>
);

const CarteAstuce: React.FC<{ astuce: Astuce; ouverte: boolean; onBasculer: () => void; onModifier?: () => void; editeur?: React.ReactNode }> = ({
  astuce: a, ouverte, onBasculer, onModifier, editeur,
}) => {
  const [solution, setSolution] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // Lien direct vers une astuce (?astuce=…) : elle s'ouvre et vient à l'écran.
  useEffect(() => { if (ouverte) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [ouverte]);
  useEffect(() => { if (!ouverte) setSolution(false); }, [ouverte]);
  return (
    <div ref={ref} className={`scroll-mt-24 overflow-hidden rounded-2xl border transition-colors ${a.publie === false ? 'bg-[#f7f6f3]' : 'bg-white'} ${ouverte ? 'border-[#cfc9bf]' : 'border-line hover:border-[#d8d3ca]'}`}>
      <button type="button" onClick={onBasculer} aria-expanded={ouverte} className="flex w-full items-start gap-3 px-4 py-3.5 text-start sm:px-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[12px] font-semibold text-brand-hover">{a.technique}</span>
            <span className="text-[12.5px] text-ink-faint">{a.type_question}</span>
            {a.publie === false && <span className="rounded-full bg-[#ebe8e2] px-2 py-0.5 text-[11.5px] font-semibold text-ink-soft">{t('Masquée')}</span>}
          </div>
          <Html as="div" html={a.titre} className="mt-1.5 text-[16px] font-semibold leading-snug text-ink" />
          {a.resume && <Html as="div" html={a.resume} className="mt-1 text-[14px] leading-snug text-ink-soft" />}
        </div>
        <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-ink-faint transition-transform ${ouverte ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      {editeur}
      {ouverte && !editeur && (
        <div className="relative space-y-5 border-t border-line px-4 pb-5 pt-4 text-[14.5px] leading-relaxed text-ink sm:px-5">
          {onModifier && (
            <button type="button" onClick={onModifier}
              className="absolute end-3 top-3 inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-white px-3 text-[13px] font-medium text-ink-soft hover:border-[#cfc9bf] hover:text-ink sm:end-4">
              <Pencil className="h-3.5 w-3.5" /> {t('Modifier')}
            </button>
          )}
          <section>
            <Titre>{t('Quand y penser')}</Titre>
            <ul className="space-y-1.5">
              {a.signaux.map((s, i) => (
                <li key={i} className="flex gap-2"><Lightbulb className="mt-1 h-3.5 w-3.5 shrink-0 text-gold" aria-hidden /><Html as="span" html={s} /></li>
              ))}
            </ul>
          </section>

          {a.pourquoi && (
            <section>
              <Titre>{t('Pourquoi ça marche')}</Titre>
              <Html html={a.pourquoi} className="text-ink-soft" />
            </section>
          )}

          <section>
            <Titre>{t('La méthode')}</Titre>
            <ol className="space-y-2">
              {a.methode.map((m, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink text-[11.5px] font-semibold text-white fd-nums">{i + 1}</span>
                  <Html as="span" html={m} />
                </li>
              ))}
            </ol>
          </section>

          {a.exemple.enonce && (
            <section>
              <Titre>{t('Exemple')}</Titre>
              <div className="fd-read overflow-hidden rounded-xl border border-line bg-[#fcfbf9]">
                <div className="fd-sol px-4 py-3"><div className="tiptap-full-renderer"><Html html={`<p>${a.exemple.enonce}</p>`} className="ProseMirror" /></div></div>
                <div className="border-t border-line px-3 py-2">
                  <button type="button" onClick={() => setSolution(!solution)}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold ${solution ? 'bg-[#f2f1ee] text-ink-soft' : 'bg-brand-soft text-brand-hover hover:bg-brand-line'}`}>
                    {solution ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {solution ? t('Masquer la solution') : t('Voir la solution')}
                  </button>
                </div>
                {solution && (
                  <div className="relative border-t border-line bg-white">
                    <span className="absolute inset-y-0 start-0 w-[3px] bg-brand" aria-hidden />
                    <div className="fd-sol px-4 py-3"><div className="tiptap-full-renderer"><Html html={`<p>${a.exemple.solution}</p>`} className="ProseMirror" /></div></div>
                  </div>
                )}
              </div>
            </section>
          )}

          {a.piege && (
            <section className="flex gap-2.5 rounded-xl border border-gold-line bg-gold-soft/60 px-3.5 py-3">
              <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-gold-strong" aria-hidden />
              <div><span className="font-semibold text-gold-strong">{t('Le piège')} · </span><Html as="span" html={a.piege} /></div>
            </section>
          )}

          {a.sur_le_site.length > 0 && (
            <section>
              <Titre>{t('Sur Fidni')}</Titre>
              <ul className="space-y-1.5">
                {a.sur_le_site.map((l, i) => (
                  <li key={i}>
                    <Link to={l.url} className="group flex items-start gap-2 rounded-lg px-2 py-1.5 -mx-2 hover:bg-[#f5f3ef]">
                      <ArrowUpRight className="mt-1 h-3.5 w-3.5 shrink-0 text-brand-hover" aria-hidden />
                      <span className="min-w-0">
                        <span className="font-medium text-ink group-hover:underline">{l.titre}</span>
                        <span className="text-ink-faint">
                          {l.exercice ? ` · ${t('partie {n}', { n: l.exercice })}` : ''}
                          {l.question ? ` · ${t('question {n}', { n: l.question })}` : ''}
                          {l.note ? ` · ${l.note}` : ''}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
};
