import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import obfuscator from 'rollup-plugin-obfuscator';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // Only obfuscate in production
    ...(mode === 'production' ? [obfuscator({
      // Allégée : noms et chaînes restent illisibles, mais sans « control flow flattening »,
      // qui rendait le code 1,5 à 2 fois plus lent sur les appareils modestes des élèves.
      options: {
        compact: true,
        controlFlowFlattening: false,
        numbersToExpressions: true,
        simplify: true,
        stringArrayShuffle: true,
        splitStrings: true,
        stringArrayThreshold: 0.75,
        identifierNamesGenerator: 'hexadecimal',
      }
    })] : [])
  ],
  optimizeDeps: {
    include: [
      'framer-motion',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
 server: {
    port: 3000,
    allowedHosts: ['fidni.fr'],
    // fidni.fr est servi par ce serveur (tunnel Cloudflare) : il porte donc les
    // en-têtes de sécurité. Pas de script-src dans la CSP : Vite injecte des scripts inline.
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
      'Strict-Transport-Security': 'max-age=31536000',
      'Content-Security-Policy': "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
    },
    hmr: {
      overlay: true
    },
    watch: {
      usePolling: true,
    },
  },
  build: {
     minify: 'terser', // Enable minification
    
    outDir: 'dist',
    assetsDir: 'assets',
    // Amélioration de la gestion des erreurs de build
    rollupOptions: {
      // L'obfuscation est déjà appliquée par le plugin ci-dessus (mode production) ; un second
      // passage ici ré-obfusquait tout le code : plus lourd à télécharger et plus lent à exécuter.
      onwarn(warning, warn) {
        // Ignorer certains avertissements spécifiques si nécessaire
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') {
          return;
        }
        warn(warning);
      },
      // Réduire la taille des chunks
      output: {
        // Seul le socle React est regroupé (il sert à toutes les pages et change rarement :
        // le navigateur le garde en cache). Le reste (framer-motion, KaTeX, l'éditeur…) suit
        // les pages qui l'utilisent. Chakra UI et Recharts étaient listés ici sans être
        // utilisés : ils étaient téléchargés à chaque visite pour rien.
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        }
      }
      
    }
  },
}));