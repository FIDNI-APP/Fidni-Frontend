// Contrôle du bundle de production (10/10/2026), lancé après `vite build` (npm run build, CI, Dockerfile).
// L'obfuscation (vite.config.ts) réécrit `import.meta.env.X` en import.meta['env']['X'] avant que Vite ne le
// remplace : dans le navigateur, import.meta.env n'existe pas → TypeError, page blanche. Un seul
// `import.meta.env.DEV` dans lib/usage.ts a ainsi vidé Pilotage, l'édition des contenus et les pages 404.
// Le build échoue donc s'il reste un `import.meta.env` ou un `import.meta[…]` dans le bundle.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// `import.meta.url` (écrit tel quel) existe dans le navigateur : permis. Interdits : `import.meta.env` et l'accès
// par crochets `import.meta[…]` que produit l'obfuscation (la clé y est illisible : souvent `env`).
const BROKEN = /import\.meta\s*(?:\.\s*env\b|\[)/;
const dir = process.argv[2] || 'dist/assets';
const bad = [];
for (const file of readdirSync(dir)) {
  if (!file.endsWith('.js')) continue;
  const code = readFileSync(join(dir, file), 'utf8');
  const m = BROKEN.exec(code);
  if (m) bad.push(`${file} : …${code.slice(Math.max(0, m.index - 60), m.index + 80)}…`);
}
if (bad.length) {
  console.error('✗ `import.meta.env` / `import.meta[…]` reste dans le bundle (undefined dans le navigateur) :');
  bad.forEach((b) => console.error('  ' + b));
  console.error('  → ne pas lire import.meta.env.DEV/PROD/MODE dans src/ ; voir src/lib/usage.ts.');
  process.exit(1);
}
console.log(`✓ bundle sans import.meta.env (${dir})`);
