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
    outDir: './dist',
    target: 'esnext',
    rollupOptions: {
      input: {
        'assets/js/search-bar': './src/views/js/search-bar.js',
        'assets/css/index': './src/views/css/index.css',
      },
      output: {
        entryFileNames: '[name].min.js',
        chunkFileNames: `[name].min.js`,
        assetFileNames: `[name].min.[ext]`,
      },
    },
  },
});
