import path from 'path';
import copy from 'rollup-plugin-copy';
import { defineConfig } from 'vite';

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
        'assets/app': './src/views/controllers/index.js',
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
