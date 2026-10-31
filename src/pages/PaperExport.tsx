// Feuille A4 à exporter en PDF : exercices et examens façon sujet de maths, leçons et cahiers de
// cours façon polycopié. Ce n'est pas une impression de la page du site : la mise en page est
// propre au papier (en-tête Fidni, numérotation, barème, corrigé optionnel, pied de page paginé).
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Download, Loader2, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getRevisionList } from '@/lib/api';
import { getNotebookById } from '@/lib/api/notebookApi';
import { exerciseAPI } from '@/lib/api/contentApiFactory';
import { getJob } from '@/lib/api/iaApi';
import { getDifficultyLabel } from '@/lib/utils/difficultyHelpers';
import type { Difficulty } from '@/types';
import { TourHelpButton } from '@/components/tour/TourProvider';
import { SignupCard, useOpenSignup } from '@/components/auth/SignupPrompt';
import { trackAction } from '@/lib/usage';
import { printPage } from '@/lib/native';
import { SEO } from '@/components/layout/SEO';
import PagedSheet, { type SheetBlock, type SheetLayout } from '@/components/paper/PagedSheet';
import {
  Rich, answerKeyBlocks, sheetHeaderBlocks, exerciseBlocks, formatDuration, formatPoints, hasSolutions, itemPoints, lessonBlocks, toItem, uniq,
  type PaperData, type PaperItem, type SolutionsMode,
} from '@/components/paper/paperBlocks';

/** Ce que l'enseignant (ou l'élève) peut changer sur la feuille. */
interface PaperCustom {
  title: string;
  school: string;
  teacher: string;
  className: string;
  schoolYear: string;
  instructions: string;
  studentLine: boolean;
  showDifficulty: boolean;
  /** « Tenir sur une page » (12/10/2026, demandé par les profs pour les devoirs) : la feuille se resserre. */
  onePage: boolean;
}

// Réglages repris d'une feuille à l'autre (propres à ce navigateur) : établissement, enseignant, options.
const PREFS_KEY = 'fidni:paper-prefs';
const REMEMBERED: (keyof PaperCustom)[] = ['school', 'teacher', 'studentLine', 'showDifficulty', 'onePage'];

const loadPrefs = (userKey: string): Partial<PaperCustom> => {
  try {
    const all = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
    return all && typeof all === 'object' && all[userKey] && typeof all[userKey] === 'object' ? all[userKey] : {};
  } catch {
    return {};
  }
};

const savePrefs = (userKey: string, prefs: Partial<PaperCustom>) => {
  try {
    const all = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') || {};
    all[userKey] = Object.fromEntries(Object.entries(prefs).filter(([k]) => REMEMBERED.includes(k as keyof PaperCustom)));
    localStorage.setItem(PREFS_KEY, JSON.stringify(all));
  } catch { /* stockage indisponible : les réglages valent pour cette page seulement */ }
};

/** Année scolaire en cours : elle commence en septembre. */
const currentSchoolYear = () => {
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
};

interface PaperExportProps {
  /** ia-draft : brouillon de Pilotage › IA, imprimable avant publication (un devoir pas encore donné). */
  source: 'revision-list' | 'content' | 'notebook' | 'ia-draft';
}

const DRAFT_DIFFICULTY: Record<string, string> = { facile: 'easy', moyen: 'medium', difficile: 'hard' };

const contentKindLabel = (item: PaperItem) => (item.kind === 'exam'
  ? (item.nationalYear ? `Examen national ${item.nationalYear}` : 'Examen')
  : item.kind === 'lesson' ? 'Leçon' : 'Exercice');

export const PaperExport: React.FC<PaperExportProps> = ({ source }) => {
  // Feuille façon sujet : toujours claire (impression), même en mode sombre.
  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains("dark");
    root.classList.remove("dark");
    return () => { if (wasDark) root.classList.add("dark"); };
  }, []);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<PaperData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const { user, isLoading: authLoading } = useAuth();
  const openSignup = useOpenSignup();
  // Visiteur : il voit un aperçu de la feuille (exercice, examen, leçon), mais télécharger demande un compte.
  const guest = !authLoading && !user;
  const userKey = user ? String(user.id) : 'guest';
  const [showCustomize, setShowCustomize] = useState(false);
  const [overrides, setOverrides] = useState<Partial<PaperCustom>>(() => loadPrefs(userKey));
  const [withNotes, setWithNotes] = useState(true);
  const [layout, setLayout] = useState<SheetLayout | null>(null);
  useEffect(() => { setOverrides(loadPrefs(userKey)); }, [userKey]);
  const fiche = searchParams.get('fiche'); // brouillon IA : une seule de ses fiches
  const mode = (['none', 'end', 'inline'].includes(searchParams.get('solutions') || '')
    ? searchParams.get('solutions') : 'none') as SolutionsMode;

  useEffect(() => {
    if (!id || (!user && source !== 'content')) return;
    let cancelled = false;
    (async () => {
      try {
        if (source === 'revision-list') {
          const list = await getRevisionList(Number(id));
          const items = (list.items || [])
            .filter((it) => it.content_object)
            .map((it) => toItem(it.content_object, String(it.id)));
          if (!cancelled) setData({ title: list.name, description: list.description, kindLabel: 'Série de révision', items });
        } else if (source === 'notebook') {
          // Cahier de cours : ses chapitres dans l'ordre, chacun avec ses leçons et les notes de l'élève.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const nb: any = await getNotebookById(id);
          const items: PaperItem[] = [];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          [...(nb.sections || [])].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)).forEach((sec: any) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const entries = [...(sec.lesson_entries || [])].sort((a: any, b: any) => (a.page_order ?? 0) - (b.page_order ?? 0))
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .filter((e: any) => e.lesson);
            if (!entries.length) return;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            entries.forEach((e: any, k: number) => {
              const it = toItem(e.lesson, `${sec.id}-${e.id}`);
              if (k === 0) { it.chapterHeading = sec.chapter?.name; it.chapterNotes = sec.user_notes || ''; }
              items.push(it);
            });
          });
          const sub = [nb.subject?.name, nb.class_level?.name].filter(Boolean).join(' · ');
          if (!cancelled) setData({ title: nb.title || 'Cahier de cours', description: sub, kindLabel: 'Cahier de cours', items, reading: true, isNotebook: true });
        } else if (source === 'ia-draft') {
          // Brouillon non publié : les fiches converties par le serveur (mêmes structures qu'un contenu publié).
          const job = await getJob(Number(id));
          const items = (job.apercus || [])
            .filter((a) => a.structure && !a.erreur && (!fiche || a.cle === fiche))
            .map((a) => toItem({
              type: a.type, title: a.titre, structure: a.structure, class_levels: a.niveaux,
              difficulty: DRAFT_DIFFICULTY[a.difficulte || ''], is_national_exam: a.examen?.national,
              national_year: a.examen?.annee, duration_minutes: a.examen?.duree_minutes,
            }, a.cle));
          if (!items.length) throw new Error('aucune fiche imprimable');
          const single = items.length === 1 ? items[0] : null;
          if (!cancelled) {
            setData(single
              ? { title: single.title, kindLabel: contentKindLabel(single), items, reading: single.kind === 'lesson' }
              : { title: job.document || 'Sujet', kindLabel: 'Sujet', items, reading: items.every((i) => i.kind === 'lesson') });
          }
        } else {
          const c = await exerciseAPI.getById(id);
          const item = toItem(c, String(id));
          if (!cancelled) setData({ title: item.title, kindLabel: contentKindLabel(item), items: [item], reading: item.kind === 'lesson' });
        }
      } catch {
        if (!cancelled) setError('Impossible de charger ce contenu.');
      }
    })();
    return () => { cancelled = true; };
  }, [id, source, user, fiche]);

  // Valeurs par défaut tirées du compte : établissement, nom de l'enseignant, classe.
  const defaults = useMemo<PaperCustom | null>(() => {
    if (!data) return null;
    const profile = user?.profile;
    const levels = uniq(data.items.map((i) => i.level));
    const fullName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim();
    return {
      title: data.title,
      school: profile?.school
        ? `${profile.school.name}${profile.school.city ? `, ${profile.school.city}` : ''}`
        : profile?.school_name || '',
      // « M. Alaoui » / « Mme Alaoui » : civilité d'après le sexe du compte enseignant.
      teacher: profile?.user_type === 'teacher' && fullName
        ? `${profile.gender === 'F' ? 'Mme ' : profile.gender === 'M' ? 'M. ' : ''}${fullName}`
        : '',
      className: levels.length === 1 ? levels[0] : profile?.class_level_name || '',
      schoolYear: currentSchoolYear(),
      instructions: '',
      studentLine: !data.reading,
      showDifficulty: !data.reading,
      onePage: !data.reading,
    };
  }, [data, user]);
  const custom: PaperCustom | null = defaults ? { ...defaults, ...overrides } : null;

  const setCustom = (patch: Partial<PaperCustom>) => {
    setOverrides((prev) => {
      const next = { ...prev, ...patch };
      savePrefs(userKey, next);
      return next;
    });
  };
  const resetCustom = () => { setOverrides({}); savePrefs(userKey, {}); };

  // Le titre de l'onglet devient le nom proposé pour le fichier PDF.
  const paperTitle = custom?.title.trim() || data?.title || '';
  useEffect(() => {
    if (!paperTitle) return;
    const previous = document.title;
    document.title = `${paperTitle} — Fidni`;
    return () => { document.title = previous; };
  }, [paperTitle]);

  const setMode = (m: SolutionsMode) => {
    const next = new URLSearchParams(searchParams);
    if (m === 'none') next.delete('solutions'); else next.set('solutions', m);
    setSearchParams(next, { replace: true });
  };

  const handleDownload = async () => {
    if (guest) { openSignup('signup'); return; }
    setPreparing(true);
    try {
      // Polices et images chargées avant de générer, sinon le PDF peut sortir incomplet.
      await document.fonts?.ready;
      await Promise.all([...document.querySelectorAll<HTMLImageElement>('.fp-pages img')]
        .map((img) => (img.complete ? Promise.resolve() : img.decode().catch(() => undefined))));
    } finally {
      setPreparing(false);
    }
    trackAction('imprimer');
    void printPage(custom?.title);
  };

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(source === 'revision-list' ? '/reviser#mes-listes'
      : source === 'notebook' ? (id ? `/notebooks?nb=${id}` : '/enregistrements?onglet=cahiers')
      : source === 'ia-draft' ? '/pilotage?onglet=ia' : '/');
  };

  // Cahiers et listes de révision sont privés : un visiteur voit directement l'invitation.
  if (guest && source !== 'content') {
    return (
      <div className="fp-desk fp-center">
        <SEO title="Aperçu du PDF – Fidni" noindex />
        <div style={{ maxWidth: 420, width: '100%' }}>
          <SignupCard title="Imprimer avec un compte"
            text="Le téléchargement en PDF (exercices, sujets, leçons, cahiers) est réservé aux membres. L’inscription est gratuite et prend une minute." />
          <button className="fp-back" style={{ margin: '14px auto 0', display: 'flex' }} onClick={goBack}>
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
        </div>
        <style>{styles()}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fp-desk fp-center">
        <SEO title="Aperçu du PDF – Fidni" noindex />
        <p style={{ color: '#6b6862', marginBottom: 16 }}>{error}</p>
        <button className="fd-btn-primary" onClick={goBack}>Retour</button>
        <style>{styles()}</style>
      </div>
    );
  }
  if (!data || !custom) {
    return (
      <div className="fp-desk fp-center">
        <SEO title="Aperçu du PDF – Fidni" noindex />
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: '#6b6862' }} />
        <style>{styles()}</style>
      </div>
    );
  }

  const { items } = data;
  const totalPoints = items.reduce((s, it) => s + itemPoints(it), 0);
  const duration = items.reduce((s, it) => s + (it.durationMinutes || 0), 0);
  const subjects = uniq(items.map((i) => i.subject));
  const levels = uniq(items.map((i) => i.level));
  const anySolution = items.some(hasSolutions);
  const effectiveMode: SolutionsMode = anySolution ? mode : 'none';
  const today = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  const chapterCount = items.filter((i) => i.chapterHeading).length;
  const partCount = items.reduce((n, i) => n + (i.sections?.length || 0), 0);
  const sectionCount = items.length === 1 ? items[0].blocks.filter((b) => b.type === 'section').length : 0;
  const exerciseCount = sectionCount > 1 ? sectionCount : items.length;
  // Contenu seul (un exercice, un devoir) : son bandeau « EXAMEN 1 · titre · points » répète le titre de la
  // feuille ; on le retire (place gagnée, demandée pour les devoirs sur une page) et la difficulté passe en tête.
  const soloHead = items.length === 1 && items[0].kind !== 'lesson' && !items[0].nationalYear;
  const facts = data.reading ? [
    data.isNotebook ? `${chapterCount} chapitre${chapterCount > 1 ? 's' : ''}` : null,
    data.isNotebook ? `${items.length} leçon${items.length > 1 ? 's' : ''}` : `${partCount} partie${partCount > 1 ? 's' : ''}`,
    today,
  ].filter(Boolean) : [
    // Un devoir seul découpé en « Exercice 1, 2, 3 » (parties) : on compte ses parties, pas « 1 exercice ».
    `${exerciseCount} ${exerciseCount > 1 ? 'exercices' : 'exercice'}`,
    totalPoints > 0 ? `${String(totalPoints).replace('.', ',')} points` : null,
    soloHead && custom.showDifficulty && items[0].difficulty ? getDifficultyLabel(items[0].difficulty as Difficulty) : null,
    duration > 0 ? `Durée : ${formatDuration(duration)}` : null,
    today,
  ].filter(Boolean);

  const fitOnePage = custom.onePage;
  // La feuille en blocs (jamais coupés d'une page à l'autre) : en-tête, titre, puis chaque exercice ou leçon.
  const blocks: SheetBlock[] = [];
  blocks.push(...sheetHeaderBlocks({
    ...custom, kindLabel: data.kindLabel, subjects, levels, title: paperTitle, description: data.description, facts,
  }));
  if (items.length === 0) {
    blocks.push({ key: 'empty', node: <p className="fp-empty">{data.isNotebook ? 'Ce cahier ne contient encore aucune leçon.' : 'Cette liste ne contient encore aucun exercice.'}</p> });
  }
  items.forEach((item, idx) => {
    if (item.kind === 'lesson') {
      // Leçon seule : le titre du document suffit. Cahier : un chapitre par page, puis ses leçons.
      const single = !data.isNotebook;
      const chapterIndex = items.slice(0, idx + 1).filter((i) => i.chapterHeading).length;
      if (item.chapterHeading) {
        blocks.push({ key: `${item.key}:chap`, keepWithNext: true, breakBefore: chapterIndex > 1, node: (
          <div className="fp-chap"><span>Chapitre {chapterIndex}</span> {item.chapterHeading}</div>
        ) });
      }
      if (!single) {
        blocks.push({ key: `${item.key}:head`, keepWithNext: true, node: (
          <header className="fp-ex-head"><span className="fp-ex-label">Leçon</span><span className="fp-ex-title">{item.title}</span></header>
        ) });
      }
      if (item.sections?.length) blocks.push(...lessonBlocks(item));
      else blocks.push({ key: `${item.key}:empty`, node: <p className="fp-empty">Leçon vide.</p> });
      // Notes de l'élève sur le chapitre : après sa dernière leçon.
      if (withNotes && data.isNotebook && (idx === items.length - 1 || items[idx + 1]?.chapterHeading)) {
        const owner = [...items.slice(0, idx + 1)].reverse().find((i) => i.chapterHeading);
        if (owner?.chapterNotes?.trim()) {
          blocks.push({ key: `${item.key}:notes`, node: (
            <div className="fp-notes"><span className="fp-sol-label">Mes notes</span><Rich content={{ html: owner.chapterNotes }} /></div>
          ) });
        }
      }
      return;
    }
    const pts = itemPoints(item);
    const meta = [
      item.nationalYear ? `Examen national ${item.nationalYear}` : null,
      items.length > 1 && subjects.length > 1 ? item.subject : null,
      custom.showDifficulty && item.difficulty ? getDifficultyLabel(item.difficulty as Difficulty) : null,
    ].filter(Boolean);
    if (!soloHead) blocks.push({ key: `${item.key}:head`, keepWithNext: true, node: (
      <>
        <header className="fp-ex-head">
          <span className="fp-ex-label">{item.kind === 'exam' ? 'Examen' : 'Exercice'} {idx + 1}</span>
          <span className="fp-ex-title">{item.title}</span>
          {pts > 0 && <span className="fp-ex-pts">{formatPoints(pts)}</span>}
        </header>
        {meta.length > 0 && <p className="fp-ex-meta">{meta.join(' · ')}</p>}
      </>
    ) });
    if (item.blocks.length) blocks.push(...exerciseBlocks(item, effectiveMode === 'inline'));
    else blocks.push({ key: `${item.key}:empty`, node: <p className="fp-empty">Énoncé indisponible.</p> });
  });
  if (effectiveMode === 'end') blocks.push(...answerKeyBlocks(items));
  // Ce qui change la mise en page (re-mesure) : tout ce qui est affiché sur la feuille.
  const blocksVersion = JSON.stringify([custom, effectiveMode, withNotes, paperTitle, items.map((i) => i.key), data.title]);

  return (
    <div className="fp-desk">
      {/* Aperçu à imprimer : doublon de la page du contenu, pas à indexer. */}
      <SEO title={`${paperTitle} – PDF | Fidni`} noindex />
      {/* Barre d'outils (écran seulement) */}
      <div className="fp-toolbar">
        <div className="fp-toolbar-inner">
          <button className="fp-back" onClick={goBack}>
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
          <div className="fp-toolbar-title">Aperçu du PDF</div>
          <div className="fp-toolbar-actions">
            <button className={`fp-back ${showCustomize ? 'is-on' : ''}`} onClick={() => (guest ? openSignup('signup') : setShowCustomize((v) => !v))} data-tour="pdf-personnaliser"
              aria-expanded={showCustomize}>
              <SlidersHorizontal className="w-4 h-4" /> Personnaliser
            </button>
            {data.isNotebook && items.some((i) => i.chapterNotes?.trim()) && (
              <label className="fp-check fp-back" style={{ cursor: 'pointer' }}>
                <input type="checkbox" checked={withNotes} onChange={(e) => setWithNotes(e.target.checked)} /> Mes notes
              </label>
            )}
            <div className="fp-seg" role="group" aria-label="Mise en page" title="Tenir sur une page : texte, interlignes et marges se resserrent (jamais sous 9 pt)">
              <button className={!fitOnePage ? 'is-active' : ''} onClick={() => setCustom({ onePage: false })}>Normale</button>
              <button className={fitOnePage ? 'is-active' : ''} onClick={() => setCustom({ onePage: true })}>Tenir sur 1 page</button>
            </div>
            {anySolution && (
              <div className="fp-seg" role="group" aria-label="Solutions" data-tour="pdf-corrige">
                {([['none', 'Sans corrigé'], ['end', 'Corrigé à la fin'], ['inline', 'Sous chaque question']] as const).map(([m, label]) => (
                  <button key={m} className={effectiveMode === m ? 'is-active' : ''} onClick={() => setMode(m)}>{label}</button>
                ))}
              </div>
            )}
            <TourHelpButton style={{ width: 34, height: 34 }} />
            <button className="fd-btn-primary" onClick={handleDownload} disabled={preparing} data-tour="pdf-telecharger">
              {preparing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Télécharger le PDF
            </button>
          </div>
        </div>
        <p className="fp-hint">
          {layout && (
            <b className={`fp-pagecount ${fitOnePage && layout.subjectPages > 1 ? 'is-warn' : ''}`}>
              {layout.pages} page{layout.pages > 1 ? 's' : ''}
              {fitOnePage && (layout.subjectPages <= 1
                ? (layout.densityIndex > 0 ? ` · resserrée (${String(layout.density.fs).replace('.', ',')} pt)` : '')
                : ` · trop long pour une page, même resserré (${String(layout.density.fs).replace('.', ',')} pt) : le sujet fait ${layout.subjectPages} pages`)}
              {fitOnePage && effectiveMode === 'end' && layout.subjectPages <= 1 ? ' · corrigé sur la page suivante' : ''}
            </b>
          )}
          {' '}{guest ? "Aperçu de la feuille : crée ton compte gratuit pour la télécharger en PDF." : "Ce que tu vois est exactement ce qui sera imprimé. Choisis « Enregistrer au format PDF » dans la fenêtre qui s’ouvre."}
        </p>
      </div>

      {showCustomize && (
        <section className="fp-panel" aria-label="Personnaliser la feuille">
          <div className="fp-panel-grid">
            <label className="fp-field fp-wide">
              <span>Titre</span>
              <input value={custom.title} onChange={(e) => setCustom({ title: e.target.value })} />
            </label>
            <label className="fp-field">
              <span>Établissement</span>
              <input value={custom.school} placeholder="Ex. : Lycée Moulay Youssef, Rabat"
                onChange={(e) => setCustom({ school: e.target.value })} />
            </label>
            <label className="fp-field">
              <span>Enseignant(e)</span>
              <input value={custom.teacher} placeholder="Ex. : M. Alaoui"
                onChange={(e) => setCustom({ teacher: e.target.value })} />
            </label>
            <label className="fp-field">
              <span>Classe</span>
              <input value={custom.className} placeholder="Ex. : 2ème Bac SM 3"
                onChange={(e) => setCustom({ className: e.target.value })} />
            </label>
            <label className="fp-field">
              <span>Année scolaire</span>
              <input value={custom.schoolYear} onChange={(e) => setCustom({ schoolYear: e.target.value })} />
            </label>
            <label className="fp-field fp-wide">
              <span>Consignes <em>(facultatif)</em></span>
              <textarea rows={2} value={custom.instructions}
                placeholder="Ex. : La calculatrice est autorisée. Rédigez avec soin."
                onChange={(e) => setCustom({ instructions: e.target.value })} />
            </label>
          </div>
          <div className="fp-panel-foot">
            <label className="fp-check">
              <input type="checkbox" checked={custom.studentLine} onChange={(e) => setCustom({ studentLine: e.target.checked })} />
              Cases « Nom et prénom » pour l’élève
            </label>
            <label className="fp-check">
              <input type="checkbox" checked={custom.showDifficulty} onChange={(e) => setCustom({ showDifficulty: e.target.checked })} />
              Afficher la difficulté
            </label>
            <button className="fp-reset" onClick={resetCustom}>
              <RotateCcw className="w-3.5 h-3.5" /> Réinitialiser
            </button>
          </div>
          <p className="fp-panel-note">Établissement, enseignant et options sont retenus pour tes prochaines feuilles.</p>
        </section>
      )}

      {/* La feuille, en vraies pages : l'impression reprend ces pages telles quelles. */}
      <div className={guest ? 'fp-teaser' : undefined}>
        <PagedSheet blocks={blocks} version={blocksVersion} density={fitOnePage ? 'fit' : 0}
          footer={paperTitle ? `Fidni · ${paperTitle}` : 'Fidni'} onLayout={setLayout} />
      </div>
      {guest && (
        <>
          <div className="fp-guest-cta">
            <SignupCard title="Télécharge cette feuille en PDF"
              text="Crée ton compte gratuit pour télécharger et imprimer la feuille complète, avec ou sans corrigé, à ton nom et à celui de ton établissement." />
          </div>
          <p className="fp-guest-print">Connecte-toi sur fidni.fr pour imprimer cette feuille.</p>
        </>
      )}

      <style>{styles()}</style>
    </div>
  );
};

/** Styles de la page d'aperçu (barre, réglages) ; la feuille elle-même : components/paper/sheetStyles. */
const styles = () => `
  /* Police de LaTeX (KaTeX_Main) ; °, « », № et € d'une serif classique (lib/paperFont). */
  .fp-desk { min-height: 100vh; background: #e9e7e3; padding: 0 16px 48px; }
  .fp-center { display: flex; flex-direction: column; align-items: center; justify-content: center; }

  .fp-toolbar { position: sticky; top: 0; z-index: 10; margin: 0 -16px 28px; padding: 12px 16px 10px;
    background: rgba(250, 249, 247, .96); border-bottom: 1px solid #e7e3dc; backdrop-filter: blur(6px); }
  .fp-toolbar-inner { max-width: 1040px; margin: 0 auto; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .fp-toolbar-title { font-weight: 700; font-size: 14px; color: #1a1a1a; }
  .fp-toolbar-actions { margin-left: auto; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  .fp-back { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: #6b6862;
    padding: 7px 10px; border-radius: 10px; border: 1px solid #e7e3dc; background: #fff; }
  .fp-back:hover { color: #1a1a1a; }
  .fp-seg { display: inline-flex; background: #f2f1ee; border-radius: 10px; padding: 3px; }
  .fp-seg button { font-size: 12.5px; padding: 6px 10px; border-radius: 8px; color: #6b6862; }
  .fp-seg button.is-active { background: #fff; color: #1a1a1a; font-weight: 600; box-shadow: 0 1px 2px rgba(0,0,0,.06); }
  .fp-hint { max-width: 1040px; margin: 6px auto 0; font-size: 12px; color: #9a958c; }
  .fp-back.is-on { border-color: #1a7a4a; color: #15633c; }
  .fp-pagecount { font-weight: 600; color: #15633c; }
  .fp-pagecount.is-warn { color: #9a6e1c; }

  .fp-panel { box-sizing: border-box; width: 210mm; max-width: 100%; margin: -12px auto 20px; padding: 16px 18px;
    background: #fff; border: 1px solid #e7e3dc; border-radius: 14px; font-family: 'DM Sans', system-ui, sans-serif; }
  .fp-panel-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 14px; }
  @media (max-width: 640px) { .fp-panel-grid { grid-template-columns: 1fr; } }
  .fp-field { display: flex; flex-direction: column; gap: 5px; font-size: 12.5px; font-weight: 600; color: #33302b; }
  .fp-field em { font-style: normal; font-weight: 400; color: #9a958c; }
  .fp-field input, .fp-field textarea { font: inherit; font-weight: 400; font-size: 13.5px; color: #1a1a1a;
    padding: 8px 11px; border: 1px solid #e7e3dc; border-radius: 10px; background: #faf9f7; resize: vertical; }
  .fp-field input:focus, .fp-field textarea:focus { outline: none; border-color: #1a7a4a; background: #fff;
    box-shadow: 0 0 0 3px rgba(26,122,74,.12); }
  .fp-wide { grid-column: 1 / -1; }
  .fp-panel-foot { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 18px; margin-top: 12px; }
  .fp-check { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; color: #33302b; cursor: pointer; }
  .fp-check input { accent-color: #1a7a4a; width: 15px; height: 15px; }
  .fp-reset { margin-left: auto; display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; color: #6b6862; }
  .fp-reset:hover { color: #1a1a1a; }
  .fp-panel-note { margin: 10px 0 0; font-size: 11.5px; color: #9a958c; }

  /* Aperçu pour un visiteur : le haut de la feuille, qui s'efface, puis l'invitation. */
  .fp-teaser { max-height: 250mm; overflow: hidden; -webkit-mask-image: linear-gradient(to bottom, #000 62%, transparent);
    mask-image: linear-gradient(to bottom, #000 62%, transparent); }
  .fp-guest-cta { position: relative; max-width: 440px; margin: -90px auto 0; font-family: 'DM Sans', system-ui, sans-serif;
    background: #fff; border-radius: 16px; box-shadow: 0 16px 40px rgba(20,18,16,.12); }
  .fp-guest-print { display: none; }

  @media print {
    /* Les conteneurs qui ENTOURENT la feuille (fond du site) deviennent blancs, et seulement eux : peindre tous
       les blocs de la page rendait opaque un calque fixe et transparent (messages, visites…), qui recouvrait
       alors le contenu de chaque page imprimée (PDF « blanc », 11/10/2026). */
    html, body, #root, #root div:has(.fp-pages) { background: #fff !important; min-height: 0 !important; }
    .fp-toolbar, .fp-panel, .fp-teaser, .fp-guest-cta { display: none !important; }
    .fp-guest-print { display: block; text-align: center; margin-top: 40mm; font-size: 14pt; }
    .fp-desk { background: none; padding: 0; min-height: 0; }
    .fp-hint { display: none; }
  }
`;

export default PaperExport;
