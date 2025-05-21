import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  const FASTAPI_URL = env.VITE_FASTAPI_URL || 'http://127.0.0.1:8000';
  
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'), // Alias for @/*
        '@lib': path.resolve(__dirname, './src/lib'), // Alias for @lib/*
      },
    },
    server: {
      open: true,
      host: true,
      allowedHosts: [FASTAPI_URL],
    },
    build: {
      outDir: 'dist',
    }
  };
});