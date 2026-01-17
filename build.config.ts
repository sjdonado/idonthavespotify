import { build } from 'bun';
import { mkdir } from 'fs/promises';

interface BuildOptions {
  watch?: boolean;
  minify?: boolean;
}

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true }).catch(() => 'Directory already exists');
}

async function buildCSS(options: BuildOptions = {}) {
  await ensureDir('./public/assets');

  const tailwindCmd = [
    'bunx',
    '@tailwindcss/cli',
    '-i',
    './src/views/css/index.css',
    '-o',
    './public/assets/index.min.css',
  ];

  if (options.minify || isProduction) {
    tailwindCmd.push('--minify');
  }

  if (options.watch) {
    tailwindCmd.push('--watch');
  }

  try {
    const proc = Bun.spawn(tailwindCmd, {
      stdout: 'inherit',
      stderr: 'inherit',
    });

    if (!options.watch) {
      const result = await proc.exited;
      if (result === 0) {
        console.log('✅ CSS build completed');
      } else {
        console.error('CSS build failed');
        throw new Error('CSS build failed');
      }
    } else {
      console.log('👀 Tailwind CSS watcher started');
      // Keep process alive in watch mode
      return proc;
    }
  } catch (error) {
    console.error('CSS build error:', error);
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
      console.error('JavaScript build failed');
      if (result.logs && result.logs.length > 0) {
        result.logs.forEach(log => console.error(log));
      }
      throw new Error('JavaScript build failed');
    }
  } catch (error) {
    console.error('JavaScript build error:', error);
    throw error;
  }
}

async function watchJS(options: BuildOptions) {
  console.log('👀 Starting JS watcher...');

  const jsWatchCmd = [
    'bun',
    'build',
    './src/views/controllers/index.js',
    '--outdir',
    './public/assets',
    '--watch',
  ];

  if (options.minify || isProduction) {
    jsWatchCmd.push('--minify');
  }

  if (isDevelopment) {
    jsWatchCmd.push('--sourcemap=external');
  }

  jsWatchCmd.push('--target=browser');
  jsWatchCmd.push('--format=esm');

  const proc = Bun.spawn(jsWatchCmd, {
    stdout: 'inherit',
    stderr: 'inherit',
  });

  console.log('👀 JavaScript watcher started');
  return proc;
}

async function buildAssets(options: BuildOptions = {}) {
  console.log('🔨 Building assets...');

  if (options.watch) {
    console.log('👀 Starting watch mode...');

    // Initial builds
    try {
      // Build CSS once before starting watcher
      await buildCSS({ ...options, watch: false });
      await buildJS(options);
      console.log('✅ Initial build completed');
    } catch (error) {
      console.error('Initial build failed:', error);
      process.exit(1);
    }

    // Start watchers (both return processes that stay alive)
    const cssProc = await buildCSS({ ...options, watch: true });
    const jsProc = await watchJS(options);

    console.log('✅ Watch mode started - files will rebuild on changes');

    // Handle cleanup
    const cleanup = () => {
      console.log('\n🛑 Stopping build watchers...');
      cssProc?.kill();
      jsProc?.kill();
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    // Keep process alive
    await new Promise<never>(() => {
      // This promise never resolves, keeping the process alive
    });
  } else {
    // Build both in parallel for production
    try {
      await Promise.all([buildJS(options), buildCSS(options)]);
      console.log('📦 All assets built successfully');
    } catch (error) {
      console.error('Build failed:', error);
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
