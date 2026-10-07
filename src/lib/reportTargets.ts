// Endroits qu'un élève peut désigner en signalant une erreur, avec la numérotation qu'il voit à
// l'écran (ExerciseRenderer : « 2. », « 2.1. » ; examens : un exercice par partie ; leçons :
// parties numérotées). Les chemins sont ceux de la progression (« q2 », « q2.sq1 »).

export interface ReportTarget { path: string; label: string }
export interface ReportTargetGroup { title: string | null; items: ReportTarget[] }

const plain = (html?: string) => (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const short = (text: string, max = 48) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

export function reportTargets(contentType: 'exercise' | 'exam' | 'lesson', structure: any): ReportTargetGroup[] {
  if (!structure) return [];

  if (contentType === 'lesson') {
    const items: ReportTarget[] = [];
    (structure.sections || []).forEach((s: any, i: number) => {
      if (!s?.id) return;
      items.push({ path: s.id, label: short(`Partie ${i + 1} · ${plain(s.title)}`) });
      (s.subSections || []).forEach((ss: any, j: number) => {
        if (ss?.id) items.push({ path: `${s.id}.${ss.id}`, label: short(`${i + 1}.${j + 1} · ${plain(ss.title)}`) });
      });
    });
    return items.length ? [{ title: null, items }] : [];
  }

  const groups: ReportTargetGroup[] = [];
  let current: ReportTargetGroup = { title: null, items: [] };
  let q = 0;
  let contexts = 0;
  // Dans un sujet en plusieurs exercices, le libellé nomme l'exercice : la liste refermée
  // n'affiche que l'option choisie (« Exercice 2 · Question 1.3 »).
  const named = (label: string) => (current.title ? `${current.title} · ${label}` : label);
  const flush = () => { if (current.items.length) groups.push(current); };

  for (const b of structure.blocks || []) {
    if (!b?.id) continue;
    if (b.type === 'section') {
      flush();
      const title = short(plain(b.content?.html) || `Partie ${groups.length + 1}`, 40);
      current = { title, items: [{ path: b.id, label: `${title} en entier` }] };
      q = 0;
      contexts = 0;
      continue;
    }
    if (b.type === 'context') {
      contexts += 1;
      current.items.push({ path: b.id, label: named(q === 0 ? (contexts > 1 ? 'Énoncé (suite)' : 'Énoncé') : `Texte après la question ${q}`) });
      continue;
    }
    if (b.type !== 'question') continue;
    q += 1;
    current.items.push({ path: b.id, label: named(`Question ${q}`) });
    (b.subQuestions || []).forEach((sq: any, k: number) => {
      if (sq?.id) current.items.push({ path: `${b.id}.${sq.id}`, label: named(`Question ${q}.${k + 1}`) });
    });
  }
  flush();
  return groups;
}

/**
 * Questions qu'on évalue, avec la numérotation vue à l'écran (ExerciseRenderer) : « 2 », « 2.1 » ; dans un
 * examen, `part` = titre de l'exercice (« Exercice 2 »), la numérotation repartant à 1 dans chaque exercice.
 */
export interface QuestionNumber { path: string; num: string; part: string | null }
export function questionNumbering(structure: any): QuestionNumber[] {
  const out: QuestionNumber[] = [];
  let part: string | null = null;
  let parts = 0;
  let q = 0;
  for (const b of structure?.blocks || []) {
    if (!b?.id) continue;
    if (b.type === 'section') {
      parts += 1;
      part = short(plain(b.content?.html) || `Partie ${parts}`, 32);
      q = 0;
      continue;
    }
    if (b.type !== 'question') continue;
    q += 1;
    const subs = (b.subQuestions || []).filter((sq: any) => sq?.id);
    if (subs.length) subs.forEach((sq: any, k: number) => out.push({ path: `${b.id}.${sq.id}`, num: `${q}.${k + 1}`, part }));
    else out.push({ path: b.id, num: String(q), part });
  }
  return out;
}

/** Libellé enregistré avec le signalement : « Exercice 2 · Question 1.3 ». */
export function targetLabel(groups: ReportTargetGroup[], path: string): string {
  for (const g of groups) {
    const item = g.items.find((it) => it.path === path);
    if (item) return item.label;
  }
  return '';
}
