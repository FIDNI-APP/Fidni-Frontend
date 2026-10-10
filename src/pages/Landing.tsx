import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, ArrowUpRight, BookOpen, GraduationCap,
  FileText, Check, ListChecks, Map, LineChart, Gift,
} from 'lucide-react';
import { SEO } from '@/components/layout/SEO';
import { HomeContentCard } from '@/components/content/HomeContentCard';
import { getClassLevels, getExercises } from '@/lib/api';
import { getHub, hubPath, type HubInfo } from '@/lib/api/hubApi';
import { useOpenSignup } from '@/components/auth/SignupPrompt';
import type { Content } from '@/types';

interface Level { id: string; name: string; slug: string }

/** Dernier niveau choisi par le visiteur (sommaire du programme). */
const LEVEL_KEY = 'fidni:accueil:niveau';
const DEFAULT_LEVEL = '2eme-bac-sm';
const rememberLevel = (slug: string) => { try { localStorage.setItem(LEVEL_KEY, slug); } catch { /* préférence facultative */ } };
const rememberedLevel = () => { try { return localStorage.getItem(LEVEL_KEY); } catch { return null; } };

/**
 * Public homepage (shown to logged-out visitors).
 *
 * Design direction — "ink & paper", maths-textbook vernacular:
 *  · The hero is a real worked exercise that unfolds its solution on load —
 *    the product demonstrates its value instead of asserting it.
 *  · The curriculum is a numbered table of contents, like a textbook sommaire.
 *  · Fraunces (display serif) rhymes with the mathematical typesetting;
 *    DM Sans carries body & UI; DM Mono carries figures.
 *  · Green marks action / progress only. No emojis, no gradients, flat + bordered.
 */
export function Landing() {
  const [popular, setPopular] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  // Les niveaux (Tronc commun → 2ème Bac) : « Tu es en : » et le sommaire. null = en chargement.
  const [levels, setLevels] = useState<Level[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getClassLevels('exercise')
      .then((data) => {
        if (cancelled) return;
        setLevels(data.map((l) => ({ id: String(l.id), name: l.name, slug: (l as { slug?: string }).slug ?? '' })).filter((l) => l.slug));
      })
      .catch(() => { if (!cancelled) setLevels([]); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ex = await getExercises({ sort: 'most_upvoted', per_page: 3 });
        if (!cancelled) setPopular(ex.results || []);
      } catch (err) {
        console.error('Landing: failed to load popular exercises', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Voting requires an account — nudge visitors to sign up.
  const openSignup = useOpenSignup('vote');
  const handleVote = () => openSignup();

  return (
    <div style={{ background: PAPER }}>
      <SEO
        title="Fidni – Exercices de maths corrigés, cours et examens | Lycée et Bac au Maroc"
        description="Exercices de maths corrigés, cours et devoirs surveillés pour les lycéens marocains : Tronc commun, 1ère Bac SM, 2ème Bac SM et PC (BIOF). Solutions détaillées, suivi de progression. Gratuit."
        keywords={['exercices maths maroc', 'exercices corrigés', '2 bac sm', '1 bac sm', 'tronc commun', 'bac maroc', 'cours de maths', 'devoirs surveillés']}
        ogType="website"
        canonicalUrl="/"
      />

      <Hero levels={levels} />
      <TrustRow />
      <Pillars />
      <HowItWorks />
      <Curriculum levels={levels} />
      <PopularPreview items={popular} loading={loading} onVote={handleVote} />
      <FinalCTA />
    </div>
  );
}

/* ═══════════════════════════════ Hero ═══════════════════════════════ */

/** Le lien garde /signup (clic molette, partage) ; un clic simple ouvre la fenêtre sur place. */
function useSignupClick(source: string) {
  const openSignup = useOpenSignup(source);
  return (e: React.MouseEvent) => { e.preventDefault(); openSignup(); };
}

function Hero({ levels }: { levels: Level[] | null }) {
  const onSignupClick = useSignupClick('hero');
  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 pt-12 md:pt-20 pb-10 md:pb-14">
      <div className="grid lg:grid-cols-[1fr_1.02fr] gap-10 lg:gap-14 items-center">
        {/* Copy */}
        <div>
          <span style={eyebrowChip}>
            <span style={{ width: 5, height: 5, borderRadius: 99, background: ACCENT }} />
            La plateforme de maths des lycéens
          </span>

          <h1 className="fd-display" style={heroTitle}>
            Les maths, enfin
            <br />
            <span style={{ color: ACCENT, fontStyle: 'italic', fontWeight: 500 }}>claires</span>
            {' '}étape par étape.
          </h1>

          <p style={heroLede}>
            Des exercices, des leçons et des sujets d'examen{' '}
            <span style={{ color: INK, fontWeight: 600 }}>corrigés en détail</span>, du Tronc commun
            au 2ème Bac, pour le programme marocain — avec un suivi qui te garde motivé jusqu'au jour J.
          </p>

          <div className="flex flex-wrap items-center" style={{ gap: 12, marginBottom: 26 }}>
            <Link to="/signup" onClick={onSignupClick} style={btnPrimary}>
              Créer un compte gratuit <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/exercises" style={btnSecondary}>
              Parcourir les exercices
            </Link>
          </div>

          <LevelPicker levels={levels} />

          <div className="flex items-center" style={{ gap: 9, fontSize: 13, color: FAINT, marginTop: 22 }}>
            <Check className="w-4 h-4" style={{ color: ACCENT }} />
            <span>Gratuit · inscription en moins d'une minute</span>
          </div>
        </div>

        {/* The signature: a worked exercise that solves itself on load */}
        <WorkedExample />
      </div>
    </section>
  );
}

/** « Tu es en : » — chaque niveau mène à sa page d'exercices, classés par chapitre. */
function LevelPicker({ levels }: { levels: Level[] | null }) {
  if (levels && levels.length === 0) return null; // niveaux indisponibles : on n'affiche rien
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: SOFT, marginBottom: 9 }}>Tu es en :</div>
      <div className="flex flex-wrap" style={{ gap: 8 }}>
        {levels === null
          ? [0, 1, 2, 3].map((i) => <span key={i} className="animate-pulse" style={{ ...levelChip, width: 110, background: LINE, borderColor: LINE }} />)
          : levels.map((l) => (
            <Link key={l.id} to={hubPath('exercises', l.slug)} onClick={() => rememberLevel(l.slug)} style={levelChip}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = INK; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = LINE; }}>
              {l.name}
            </Link>
          ))}
      </div>
    </div>
  );
}

/* The maths is typeset in a serif italic so it reads natively as mathematics —
   the same world the Fraunces headings live in. */
function M({ children }: { children: React.ReactNode }) {
  return <span style={{ fontFamily: SERIF, fontStyle: 'italic' }}>{children}</span>;
}

function WorkedExample() {
  const steps = [
    {
      label: 'Étape 1',
      text: <>On dérive : <M>f′(x) = 3x² − 3 = 3(x − 1)(x + 1)</M></>,
    },
    {
      label: 'Étape 2',
      text: <>On résout : <M>f′(x) = 0 ⟺ x = −1</M> ou <M>x = 1</M></>,
    },
  ];

  return (
    <div className="fd-card" style={{ overflow: 'hidden', boxShadow: '0 18px 50px rgba(20,18,16,.08)' }}>
      {/* Header — looks like a real exercise sheet */}
      <div style={{ padding: '16px 22px', borderBottom: `1px solid ${LINE}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span className="fd-nums" style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.06em', color: FAINT, textTransform: 'uppercase' }}>
          Analyse · 2ème Bac
        </span>
        <span style={difficultyPill}>Moyen</span>
      </div>

      <div style={{ padding: '22px 24px 24px' }}>
        <p style={{ fontSize: 13.5, color: SOFT, lineHeight: 1.55, marginBottom: 4 }}>
          Étudier les variations de la fonction <M>f</M> définie sur <M>ℝ</M> par :
        </p>
        <div style={{ textAlign: 'center', fontSize: 21, color: INK, margin: '14px 0 4px' }}>
          <M>f(x) = x³ − 3x + 1</M>
        </div>

        {/* Solution steps — staggered reveal: watch the correction unfold */}
        <div style={{ marginTop: 18, display: 'grid', gap: 14 }}>
          {steps.map((s, i) => (
            <div
              key={s.label}
              className="animate-fade-up"
              style={{ animationDelay: `${0.25 + i * 0.45}s` }}
            >
              <div style={stepLabel}>
                <span style={{ width: 16, height: 1, background: LINE }} />
                {s.label}
              </div>
              <p style={{ fontSize: 13.5, color: SOFT, lineHeight: 1.55, marginTop: 6 }}>{s.text}</p>
            </div>
          ))}

          {/* Answer */}
          <div
            className="animate-fade-up"
            style={{
              animationDelay: '1.15s',
              background: ACCENT_SOFT, border: `1px solid ${BRAND_LINE}`,
              borderRadius: 12, padding: '13px 15px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
              <Check className="w-3.5 h-3.5" style={{ color: ACCENT_HOVER }} />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: ACCENT_HOVER }}>
                Réponse
              </span>
            </div>
            <p style={{ fontSize: 13, color: SOFT, lineHeight: 1.5 }}>
              <M>f</M> croît sur <M>]−∞, −1]</M>, décroît sur <M>[−1, 1]</M>, puis croît sur <M>[1, +∞[</M>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════ Trust row ═══════════════════════════════ */

// Des promesses que le site tient dès aujourd'hui. (Il affichait « 1 000+ exercices »,
// « 5 000+ élèves » et une note de 4,8/5 inventés : un visiteur qui clique voit l'écart,
// et la confiance est perdue.)
const PROMISES = [
  { icon: ListChecks, title: 'Corrigés pas à pas', text: 'Chaque question a sa solution détaillée.' },
  { icon: Map, title: 'Programme marocain', text: 'Du Tronc commun au 2ème Bac, par chapitre.' },
  { icon: LineChart, title: 'Ta progression suivie', text: 'Statistiques, révisions et objectifs.' },
  { icon: Gift, title: 'Gratuit', text: 'Un compte suffit, en moins d’une minute.' },
];

function TrustRow() {
  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6">
      {/* 1px gap over a line-coloured background draws clean separators in
          both the 2-col (mobile) and 4-col (desktop) layouts. */}
      <div className="fd-card grid grid-cols-2 md:grid-cols-4" style={{ overflow: 'hidden', background: LINE, gap: 1 }}>
        {PROMISES.map(({ icon: Icon, title, text }) => (
          <div key={title} style={{ padding: '18px 20px', background: SURFACE }}>
            <Icon className="w-5 h-5" style={{ color: ACCENT, marginBottom: 10 }} />
            <div style={{ fontSize: 14.5, fontWeight: 700, color: INK }}>{title}</div>
            <div style={{ fontSize: 12.5, color: FAINT, marginTop: 3, lineHeight: 1.45 }}>{text}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ═══════════════════════════════ Pillars ═══════════════════════════════ */

const PILLARS = [
  {
    icon: BookOpen,
    title: 'Exercices corrigés',
    desc: 'Chaque exercice est résolu étape par étape, pour comprendre la méthode — pas seulement le résultat.',
    sample: 'Fonctions · Suites · Probabilités',
    link: '/exercises',
    cta: "Voir les exercices",
  },
  {
    icon: GraduationCap,
    title: 'Leçons claires',
    desc: 'Des cours structurés qui vont à l\'essentiel, avec définitions, théorèmes et exemples travaillés.',
    sample: 'Tout le programme du lycée',
    link: '/lessons',
    cta: 'Lire les leçons',
  },
  {
    icon: FileText,
    title: 'Bac national corrigé',
    desc: 'Les sujets du Bac national corrigés en détail, pour t\'entraîner en conditions réelles, le chrono en main.',
    sample: '2ème Bac SM · 2ème Bac PC',
    link: '/exams/nationaux',
    cta: 'Voir les sujets du Bac',
  },
];

function Pillars() {
  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 py-14 md:py-20">
      <SectionHead
        eyebrow="Trois manières de progresser"
        title="Tout ce qu'il te faut, au même endroit"
        subtitle="Apprends la notion, entraîne-toi dessus, puis mets-toi à l'épreuve. Le tout corrigé."
      />
      <div className="grid md:grid-cols-3 gap-4 md:gap-5 mt-10">
        {PILLARS.map(p => {
          const Icon = p.icon;
          return (
            <Link key={p.title} to={p.link} className="fd-card group" style={pillarCard}>
              <div style={pillarIcon}><Icon className="w-5 h-5" /></div>
              <h3 className="fd-display" style={{ fontSize: 20, fontWeight: 600, color: INK, letterSpacing: '-0.015em', marginBottom: 8 }}>
                {p.title}
              </h3>
              <p style={{ fontSize: 13.5, color: FAINT, lineHeight: 1.55, marginBottom: 16, flexGrow: 1 }}>{p.desc}</p>
              <div style={{ fontFamily: MONO, fontSize: 11, color: '#9a958c', letterSpacing: '.02em', paddingTop: 14, borderTop: `1px solid ${LINE}`, marginBottom: 12 }}>
                {p.sample}
              </div>
              <span style={pillarCta}>
                {p.cta}
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/* ═══════════════════════════════ How it works ═══════════════════════════════ */

const STEPS = [
  { n: '01', title: 'Crée ton compte', desc: "Choisis ton niveau en moins d'une minute. C'est gratuit." },
  { n: '02', title: 'Entraîne-toi', desc: 'Exercices, leçons et examens adaptés à ton programme et corrigés.' },
  { n: '03', title: 'Progresse', desc: 'Suis tes statistiques, garde ta série et vise le bac avec confiance.' },
];

function HowItWorks() {
  return (
    <section style={{ background: SURFACE, borderTop: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}` }}>
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-14 md:py-20">
        <SectionHead eyebrow="Comment ça marche" title="Commence en trois étapes" />
        <div className="grid md:grid-cols-3 gap-8 md:gap-10 mt-12">
          {STEPS.map(s => (
            <div key={s.n}>
              <div className="fd-nums" style={{ fontFamily: MONO, fontSize: 13, fontWeight: 500, color: ACCENT, letterSpacing: '.08em', marginBottom: 14 }}>
                {s.n}
              </div>
              <h3 className="fd-display" style={{ fontSize: 19, fontWeight: 600, color: INK, letterSpacing: '-0.01em', marginBottom: 8, paddingTop: 14, borderTop: `1px solid ${INK}` }}>
                {s.title}
              </h3>
              <p style={{ fontSize: 13.5, color: FAINT, lineHeight: 1.6, maxWidth: 300 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════ Curriculum (table of contents) ═══════════════════════════════ */

const MAX_CHAPTERS = 10;

/** Le vrai sommaire d'un niveau : ses chapitres et leur nombre d'exercices, chacun vers sa page. */
function Curriculum({ levels }: { levels: Level[] | null }) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [hub, setHub] = useState<HubInfo | null>(null);
  // Niveau dont le sommaire n'a pas pu être chargé (pas d'attente infinie).
  const [failed, setFailed] = useState<string | null>(null);

  // Niveau affiché : celui choisi ici, sinon le dernier choisi, sinon le 2ème Bac SM.
  const slug = levels?.length
    ? [chosen, rememberedLevel(), DEFAULT_LEVEL].find((s) => s && levels.some((l) => l.slug === s)) ?? levels[0].slug
    : null;

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    getHub('exercises', slug)
      .then((data) => { if (!cancelled) { setHub(data); setFailed((f) => (f === slug ? null : f)); } })
      .catch(() => { if (!cancelled) setFailed(slug); });
    return () => { cancelled = true; };
  }, [slug]);

  const choose = (s: string) => { setChosen(s); rememberLevel(s); };
  const level = levels?.find((l) => l.slug === slug);
  const ready = !!slug && hub?.level.slug === slug;
  const chapters = ready && hub ? hub.chapters : [];
  // En attente : les niveaux, puis le sommaire du niveau affiché (sans afficher « bientôt » entre les deux).
  const waiting = levels === null || (!!slug && !ready && failed !== slug);
  const unavailable = !slug || failed === slug;
  const levelUrl = slug ? hubPath('exercises', slug) : '/exercises';

  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 py-14 md:py-20">
      <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-10 lg:gap-16">
        <div>
          <SectionHead
            align="left"
            eyebrow="Le programme"
            title="Du Tronc commun au Bac, ton sommaire de maths"
            subtitle="Choisis ton niveau, puis un chapitre : tu tombes directement sur ses exercices corrigés."
          />
          <Link to={levelUrl} style={{ ...btnSecondary, marginTop: 22 }}>
            {level ? `Tous les exercices · ${level.name}` : 'Tout explorer'} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div>
          {levels && levels.length > 0 && (
            <div role="tablist" aria-label="Niveau" className="flex flex-wrap" style={{ gap: 8, marginBottom: 14 }}>
              {levels.map((l) => {
                const on = l.slug === slug;
                return (
                  <button key={l.id} type="button" role="tab" aria-selected={on} onClick={() => choose(l.slug)}
                    style={{ ...levelChip, cursor: 'pointer', background: on ? INK : SURFACE, color: on ? '#fff' : SOFT, borderColor: on ? INK : LINE }}>
                    {l.name}
                  </button>
                );
              })}
            </div>
          )}

          {/* Numbered index — like the front matter of a textbook */}
          {waiting ? (
            <div aria-hidden>
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse" style={{ height: 22, margin: '14px', borderRadius: 6, background: LINE, width: `${70 - i * 8}%` }} />
              ))}
            </div>
          ) : chapters.length === 0 ? (
            <p style={{ fontSize: 14, color: FAINT, padding: '14px' }}>
              {unavailable ? 'Le sommaire n’a pas pu s’afficher.' : 'Les exercices de ce niveau arrivent bientôt.'}{' '}
              <Link to="/exercises" style={{ color: ACCENT, fontWeight: 600 }}>Voir tous les exercices</Link>
            </p>
          ) : (
            <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {chapters.slice(0, MAX_CHAPTERS).map((c, i, shown) => (
                <li key={c.id}>
                  <Link to={c.url} className="group" style={chapterRow}
                    onMouseEnter={(e) => { e.currentTarget.style.background = SURFACE; e.currentTarget.style.borderColor = LINE; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
                  >
                    <span className="fd-nums" style={{ fontFamily: MONO, fontSize: 12, color: '#9a958c', width: 26, flexShrink: 0 }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="fd-display" style={{ fontSize: 18, fontWeight: 500, color: INK, flexGrow: 1, letterSpacing: '-0.01em', minWidth: 0 }}>
                      {c.name}
                    </span>
                    <span className="fd-nums" style={{ fontSize: 12.5, color: FAINT, whiteSpace: 'nowrap' }}>
                      {c.count} exercice{c.count > 1 ? 's' : ''}
                    </span>
                    <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: ACCENT, flexShrink: 0 }} />
                  </Link>
                  {i < shown.length - 1 && <div style={{ height: 1, background: LINE }} />}
                </li>
              ))}
            </ol>
          )}
          {chapters.length > MAX_CHAPTERS && (
            <Link to={levelUrl} className="fd-btn-ghost" style={{ marginTop: 12 }}>
              Les {chapters.length} chapitres <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════ Popular preview ═══════════════════════════════ */

function PopularPreview({ items, loading, onVote }: {
  items: Content[]; loading: boolean; onVote: () => void;
}) {
  if (!loading && items.length === 0) return null;
  return (
    <section style={{ background: SURFACE, borderTop: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}` }}>
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-14 md:py-20">
        <div className="flex items-end justify-between mb-9 flex-wrap gap-3">
          <SectionHead align="left" eyebrow="Les préférés des élèves" title="Exercices les plus populaires" />
          <Link to="/exercises" className="fd-btn-ghost">Voir tout <ArrowRight className="w-3.5 h-3.5" /></Link>
        </div>
        {loading ? (
          <div className="grid md:grid-cols-3 gap-4">
            {[0, 1, 2].map(i => (
              <div key={i} className="fd-card animate-pulse" style={{ height: 260, background: SURFACE }} />
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            {items.slice(0, 3).map(item => (
              <HomeContentCard key={item.id} content={item} onVote={onVote} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ═══════════════════════════════ Final CTA ═══════════════════════════════ */

function FinalCTA() {
  const onSignupClick = useSignupClick('cta');
  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 py-16 md:py-24">
      <div style={{ borderRadius: 20, padding: '52px 32px', color: '#fff', background: ACCENT_HOVER, textAlign: 'center' }}>
        <h2 className="fd-display" style={{ fontSize: 'clamp(26px,3.5vw,36px)', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 14 }}>
          Prêt à progresser ?
        </h2>
        <p style={{ fontSize: 15.5, color: '#cfe6d8', maxWidth: 460, margin: '0 auto 28px', lineHeight: 1.6 }}>
          Crée ton compte gratuit et commence à t'entraîner dès aujourd'hui. Aucune carte requise.
        </p>
        <div className="flex flex-wrap items-center justify-center" style={{ gap: 12 }}>
          <Link to="/signup" onClick={onSignupClick} style={{ ...btnPrimary, background: '#fff', color: ACCENT_HOVER, border: '1px solid #fff' }}>
            Créer un compte gratuit <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/exercises" style={{ ...btnSecondary, background: 'transparent', borderColor: 'rgba(255,255,255,.28)', color: '#fff' }}>
            Explorer d'abord
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════ Shared ═══════════════════════════════ */

function SectionHead({ eyebrow, title, subtitle, align = 'center' }: {
  eyebrow: string; title: string; subtitle?: string; align?: 'center' | 'left';
}) {
  return (
    <div style={{ textAlign: align, maxWidth: align === 'center' ? 580 : undefined, margin: align === 'center' ? '0 auto' : undefined }}>
      <span style={{ fontFamily: MONO, fontSize: 11.5, color: ACCENT, fontWeight: 500, letterSpacing: '.06em', textTransform: 'uppercase' }}>
        {eyebrow}
      </span>
      <h2 className="fd-display" style={{ fontSize: 'clamp(24px,3vw,32px)', fontWeight: 600, color: INK, letterSpacing: '-0.02em', marginTop: 10 }}>
        {title}
      </h2>
      {subtitle && <p style={{ fontSize: 14.5, color: FAINT, lineHeight: 1.6, marginTop: 12 }}>{subtitle}</p>}
    </div>
  );
}

/* ── Tokens — aliases of the canonical CSS vars in src/index.css (:root),
      so this page shares one source of truth. (No SVG here, so var() is safe
      in every inline style.) ── */
const PAPER = 'var(--paper)';
const SURFACE = 'var(--surface)';
const INK = 'var(--ink)';
const SOFT = 'var(--ink-soft)';
const FAINT = 'var(--ink-faint)';
const LINE = 'var(--line)';
const ACCENT = 'var(--brand)';
const ACCENT_HOVER = 'var(--brand-hover)';
const ACCENT_SOFT = 'var(--brand-soft)';
const BRAND_LINE = 'var(--brand-line)';
const SERIF = "'Fraunces', Georgia, 'Times New Roman', serif";
const MONO = "'DM Mono', ui-monospace, monospace";

const heroTitle: React.CSSProperties = {
  fontSize: 'clamp(34px, 5vw, 54px)', fontWeight: 700, color: INK,
  letterSpacing: '-0.025em', lineHeight: 1.04, marginBottom: 20,
};
const heroLede: React.CSSProperties = {
  fontSize: 16.5, color: FAINT, lineHeight: 1.6, maxWidth: 500, marginBottom: 28,
};
const eyebrowChip: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 22,
  padding: '6px 13px', borderRadius: 99, background: ACCENT_SOFT,
  border: `1px solid ${BRAND_LINE}`, color: ACCENT_HOVER, fontSize: 12.5, fontWeight: 600,
};
const btnPrimary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 22px',
  borderRadius: 11, background: ACCENT, color: '#fff', border: `1px solid ${ACCENT}`,
  fontSize: 14.5, fontWeight: 600, textDecoration: 'none',
};
const btnSecondary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 7, padding: '13px 20px',
  borderRadius: 11, background: SURFACE, border: `1px solid ${LINE}`, color: SOFT,
  fontSize: 14.5, fontWeight: 600, textDecoration: 'none',
};
const difficultyPill: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: '#b07a1e', background: '#fdf6e9',
  border: '1px solid #f0e2c4', padding: '3px 10px', borderRadius: 99,
};
const stepLabel: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, fontFamily: MONO,
  fontSize: 10.5, fontWeight: 500, color: '#9a958c', letterSpacing: '.08em', textTransform: 'uppercase',
};
const pillarCard: React.CSSProperties = {
  padding: '24px 22px', display: 'flex', flexDirection: 'column',
  textDecoration: 'none', height: '100%',
};
const pillarIcon: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 44, height: 44, borderRadius: 12, background: ACCENT_SOFT, color: ACCENT_HOVER, marginBottom: 18,
};
const pillarCta: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  fontSize: 13, fontWeight: 600, color: ACCENT,
};
const levelChip: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', minHeight: 40, padding: '0 14px',
  borderRadius: 99, border: `1px solid ${LINE}`, background: SURFACE, color: INK,
  fontSize: 13.5, fontWeight: 600, textDecoration: 'none', transition: 'border-color .15s, background .15s',
};
const chapterRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 14px',
  textDecoration: 'none', border: '1px solid transparent', borderRadius: 10,
  transition: 'background .15s, border-color .15s',
};
