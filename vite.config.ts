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
      options: {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.75,
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
      plugins: [
        obfuscator() // Apply obfuscation during build
      ],
      onwarn(warning, warn) {
        // Ignorer certains avertissements spécifiques si nécessaire
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') {
          return;
        }
        warn(warning);
      },
      // Réduire la taille des chunks
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@chakra-ui/react', 'framer-motion'],
          charts: ['recharts'],
        }
      }
      
    }
  },
}));