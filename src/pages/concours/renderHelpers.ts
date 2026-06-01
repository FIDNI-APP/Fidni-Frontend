/**
 * Helpers for rendering concours question HTML.
 *
 * The LLM-imported JSON often contains over-escaped LaTeX: a single LaTeX
 * command `\int` ends up as `\\int` (or even `\\\\int`) in the final HTML
 * string, because either the LLM doubled it manually OR our auto-repair did,
 * and on round-trips the duplication can happen again.
 *
 * KaTeX expects exactly ONE backslash before each command. This helper
 * collapses any sequence of multiple backslashes (>= 2) down to one — but
 * only inside `$...$` and `$$...$$` math zones, never in surrounding HTML
 * (where attribute values legitimately use single `\` for things like
 * Windows paths or escaped HTML entities).
 */
export function normalizeMathHtml(input: string): string {
  if (!input) return input;
  // Replace inside both inline `$...$` and display `$$...$$` math.
  // Use a lazy regex so we don't gobble across multiple math zones.
  // For `$$...$$` we match first (longer delimiter first).
  return input
    .replace(/\$\$([\s\S]+?)\$\$/g, (_m, inner) =>
      `$$${collapseBackslashes(inner)}$$`,
    )
    .replace(/(^|[^$])\$([^$\n]+?)\$(?!\$)/g, (_m, before, inner) =>
      `${before}$${collapseBackslashes(inner)}$`,
    );
}

function collapseBackslashes(s: string): string {
  // Collapse `\\\\\\` → `\` etc. Any run of 2+ backslashes becomes 1.
  return s.replace(/\\{2,}/g, '\\');
}
