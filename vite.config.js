import path from 'path';

import { defineConfig } from 'vite';
import copy from 'rollup-plugin-copy';

export default defineConfig({
  plugins: [
    copy({
      targets: [
        {
          src: 'dist/*',
          dest: 'public',
          copyOnce: false,
        },
      ],
      hook: 'writeBundle',
    }),
  ],
  resolve: {
    alias: {
      '~/config/constants': path.resolve(__dirname, './src/config/constants.ts'),
    },
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      input: {
        'assets/entry': './src/views/js/entry.js',
        'assets/index': './src/views/css/index.css',
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: `[name]-[hash].js`,
        assetFileNames: `[name].min.[ext]`,
      },
    },
  },
});
