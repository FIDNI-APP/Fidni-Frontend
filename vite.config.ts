import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const isProduction = mode === 'production'
  
  // Configuration du proxy commune pour le serveur de développement et la prévisualisation
  const proxyConfig = {
    '/api': {
      target: 'http://127.0.0.1:8000',
      changeOrigin: true,
      secure: false,
      rewrite: (path: string) => path.replace(/^\/api/, '/api'), // Assurer que les chemins ne sont pas modifiés
    },
    '/admin': {
      target: 'http://127.0.0.1:8000',
      changeOrigin: true,
      secure: false,
    },
  }
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3000,
      proxy: proxyConfig,
    },
    preview: {
      port: 3000,
      proxy: proxyConfig, // Utiliser la même configuration proxy pour preview
    },
    build: {
      outDir: 'dist',
      sourcemap: !isProduction,
      minify: isProduction,
    },
    // Base path for assets - use './' for relative paths
    base: './'
  }
})