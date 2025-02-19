import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // Alias for @/*
      '@lib': path.resolve(__dirname, './src/lib'), // Alias for @lib/*
    },
  },
});