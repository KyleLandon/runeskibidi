import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  server: {
    port: 3000,
    open: true,
    host: true,
    hmr: {
      // Reduce HMR sensitivity to prevent rapid reloads
      overlay: true,
      clientPort: 3000
    },
    watch: {
      // Add debouncing to file changes
      ignored: ['**/node_modules/**'],
      followSymlinks: false,
      // Debounce file changes by 1 second
      chokidar: {
        usePolling: false,
        interval: 1000,
        binaryInterval: 2000
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    target: 'es2020'
  },
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname
    }
  }
}) 