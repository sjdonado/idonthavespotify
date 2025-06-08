import { build } from 'bun';
import { existsSync } from 'fs';
import { mkdir, watch } from 'fs/promises';

interface BuildOptions {
  watch?: boolean;
  minify?: boolean;
}

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

async function ensureDir(dir: string) {
  try {
    await mkdir(dir, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
}

async function buildCSS(options: BuildOptions = {}) {
  const inputCSS = './src/views/css/index.css';
  const outputCSS = './public/assets/index.min.css';

  await ensureDir('./public/assets');

  const tailwindCmd = ['bunx', '@tailwindcss/cli', '-i', inputCSS, '-o', outputCSS];

  if (options.minify || isProduction) {
    tailwindCmd.push('--minify');
  }

  try {
    const proc = Bun.spawn(tailwindCmd, {
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const result = await proc.exited;
    if (result === 0) {
      console.log('✅ CSS build completed');
    } else {
      const stderr = await new Response(proc.stderr).text();
      console.error('❌ CSS build failed:', stderr);
      throw new Error('CSS build failed');
    }
  } catch (error) {
    console.error('❌ CSS build error:', error);
    throw error;
  }
}

async function buildJS(options: BuildOptions = {}) {
  await ensureDir('public/assets');

  try {
    const result = await build({
      entrypoints: ['./src/views/controllers/index.js'],
      outdir: './public/assets',
      target: 'browser',
      format: 'esm',
      minify: options.minify || isProduction,
      splitting: false,
      sourcemap: isDevelopment ? 'external' : 'none',
      naming: {
        entry: 'index.js',
        chunk: '[name]-[hash].js',
        asset: '[name].[ext]',
      },
      define: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      },
      external: [],
    });

    if (result.success) {
      console.log('✅ JavaScript build completed');
      return result;
    } else {
      console.error('❌ JavaScript build failed');
      if (result.logs && result.logs.length > 0) {
        result.logs.forEach(log => console.error(log));
      }
      throw new Error('JavaScript build failed');
    }
  } catch (error) {
    console.error('❌ JavaScript build error:', error);
    throw error;
  }
}

async function watchFiles(options: BuildOptions) {
  console.log('👀 Starting file watchers...');

  let isBuilding = false;
  const debounceTime = 100;
  let buildTimeout: Timer | null = null;

  const debouncedBuild = async (type: 'js' | 'css' | 'both') => {
    if (buildTimeout) {
      clearTimeout(buildTimeout);
    }

    buildTimeout = setTimeout(async () => {
      if (isBuilding) return;
      isBuilding = true;

      try {
        console.log(`🔄 Rebuilding ${type}...`);

        if (type === 'js' || type === 'both') {
          await buildJS(options);
        }
        if (type === 'css' || type === 'both') {
          await buildCSS(options);
        }

        console.log(`✅ ${type.toUpperCase()} rebuild completed`);
      } catch (error) {
        console.error(`❌ ${type.toUpperCase()} rebuild failed:`, error);
      } finally {
        isBuilding = false;
      }
    }, debounceTime);
  };

  // Watch JavaScript files
  const jsWatchPaths = ['./src/views/controllers', './src/views/components'];

  for (const watchPath of jsWatchPaths) {
    if (existsSync(watchPath)) {
      try {
        const watcher = watch(watchPath, { recursive: true });
        console.log(`👀 Watching JS files in ${watchPath}`);

        (async () => {
          for await (const _event of watcher) {
            if (_event.filename?.endsWith('.js') || _event.filename?.endsWith('.ts')) {
              debouncedBuild('js');
            }
          }
        })().catch(console.error);
      } catch (error) {
        console.warn(`Could not watch ${watchPath}:`, error);
      }
    }
  }

  // Watch CSS files
  const cssWatchPaths = ['./src/views/css', './src/views/components'];

  for (const watchPath of cssWatchPaths) {
    if (existsSync(watchPath)) {
      try {
        const watcher = watch(watchPath, { recursive: true });
        console.log(`👀 Watching CSS files in ${watchPath}`);

        (async () => {
          for await (const _event of watcher) {
            if (_event.filename?.endsWith('.css') || _event.filename?.endsWith('.scss')) {
              debouncedBuild('css');
            }
          }
        })().catch(console.error);
      } catch (error) {
        console.warn(`Could not watch ${watchPath}:`, error);
      }
    }
  }

  // Also watch the main CSS file
  if (existsSync('./src/views/css/index.css')) {
    try {
      const cssWatcher = watch('./src/views/css/index.css');
      (async () => {
        for await (const _event of cssWatcher) {
          debouncedBuild('css');
        }
      })().catch(console.error);
    } catch (error) {
      console.warn('Could not watch main CSS file:', error);
    }
  }
}

async function buildAssets(options: BuildOptions = {}) {
  console.log('🔨 Building assets...');

  if (options.watch) {
    console.log('👀 Starting watch mode...');

    // Initial build
    try {
      await Promise.all([buildJS(options), buildCSS(options)]);
      console.log('✅ Initial build completed');
    } catch (error) {
      console.error('❌ Initial build failed:', error);
      process.exit(1);
    }

    // Start watchers
    await watchFiles(options);
    console.log('✅ Watch mode started - files will rebuild on changes');

    // Keep the process alive
    const keepAlive = () => {
      return new Promise<never>(() => {
        // This promise never resolves, keeping the process alive
      });
    };

    // Handle cleanup
    const cleanup = () => {
      console.log('\n🛑 Stopping build watcher...');
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    // Keep process alive
    await keepAlive();
  } else {
    // Build both in parallel for production
    try {
      await Promise.all([buildJS(options), buildCSS(options)]);
      console.log('📦 All assets built successfully');
    } catch (error) {
      console.error('❌ Build failed:', error);
      process.exit(1);
    }
  }
}

// CLI handling
const args = process.argv.slice(2);
const watchMode = args.includes('--watch');
const minifyMode = args.includes('--minify');

if (import.meta.main) {
  await buildAssets({
    watch: watchMode,
    minify: minifyMode,
  });
}

export { buildAssets, buildCSS, buildJS };
