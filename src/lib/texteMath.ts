// Texte simple avec formules $…$ / $$…$$ (signalements, réponses de l'équipe, extraits de la cloche).
// Rendu : components/skilliq/MathText (texte échappé, puis KaTeX). Pas de « lookbehind » dans les
// expressions régulières : les anciens Safari refusent tout le fichier (page blanche).

/** Texte coupé au milieu d'une formule restée ouverte : on s'arrête avant son « $ » (copie de
 *  notifications/services.sans_formule_coupee). Un « \$ » n'est pas une formule. */
export function sansFormuleCoupee(text: string): string {
  let ouverte: { at: number; delim: string } | null = null;
  for (const m of text.matchAll(/\\\$|\$\$|\$/g)) {
    if (m[0] === '\\$') continue;
    if (!ouverte) ouverte = { at: m.index ?? 0, delim: m[0] };
    else if (m[0] === ouverte.delim) ouverte = null;
  }
  return ouverte ? text.slice(0, ouverte.at).trimEnd() : text;
}

/** Extrait d'une ligne : formule centrée ramenée en ligne, formule coupée retirée (anciens extraits). */
export const extraitMath = (text: string) => {
  const une = text.replace(/\$\$/g, '$');
  const s = sansFormuleCoupee(une);
  return s === une ? une : `${s.replace(/…$/, '')}…`;
};

/** HTML éventuel (explication de l'IA) → texte simple, formules gardées (copie de ia/pipeline.explication_texte). */
export function texteDepuisHtml(html: string): string {
  const brut = html.replace(/<br\s*\/?>|<\/p>|<\/li>/gi, '\n').replace(/<[^>]+>/g, '');
  const el = document.createElement('textarea');
  el.innerHTML = brut;  // décode les entités (&lt; &nbsp;…) sans rien exécuter
  return el.value.split('\n').map((l) => l.split(/\s+/).filter(Boolean).join(' ')).join('\n')
    .replace(/\n{3,}/g, '\n\n').trim();
}

/** Le texte contient-il une formule à montrer en aperçu ? */
export const aDesFormules = (text: string) => text.replace(/\\\$/g, '').includes('$');
