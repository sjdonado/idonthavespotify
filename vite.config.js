import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      '~/config/constants': path.resolve(__dirname, './src/config/constants.ts'),
    },
  },
  build: {
    target: 'esnext',
    outDir: 'public/assets',
    emptyOutDir: false,
    rollupOptions: {
      input: ['./src/views/controllers/index.js'],
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: `[name]-[hash].js`,
        assetFileNames: `[name].min.[ext]`,
      },
    },
  },
});
