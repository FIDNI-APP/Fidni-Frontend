import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      'framer-motion',
      'react-router-dom',
      'lucide-react',
      'recharts',
      '@chakra-ui/react',
      'react-hot-toast',
      'react-toastify'
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': 'http://ec2-15-237-183-131.eu-west-3.compute.amazonaws.com',
    },
    host: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Amélioration de la gestion des erreurs de build
    rollupOptions: {
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
});