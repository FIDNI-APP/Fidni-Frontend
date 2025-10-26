import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import obfuscator from 'rollup-plugin-obfuscator';

export default defineConfig({
  plugins: [react(),
    obfuscator({
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
    })
  ],
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
    host: true ,
    watch: {
      usePolling: true, // Add this if you're on Windows/WSL
      interval: 100
    }
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
});