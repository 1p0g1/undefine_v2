import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Log the API base URL for debugging
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
console.log('API Base URL:', apiBaseUrl || 'Using relative path in production');

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        // In development, proxy to a local Next.js server
        // In production (Vercel), use relative paths (/api will be served from the same domain)
        target: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
  define: {
    // Make environment variables available to the client
    'process.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL),
    'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY),
    'process.env.NEXT_PUBLIC_API_BASE_URL': JSON.stringify(apiBaseUrl),
  }
});
