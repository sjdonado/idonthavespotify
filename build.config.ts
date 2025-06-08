import { build } from 'bun';
import { mkdir } from 'fs/promises';

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

  try {
    const tailwindCmd = ['bunx', '@tailwindcss/cli', '-i', inputCSS, '-o', outputCSS];

    if (options.minify || isProduction) {
      tailwindCmd.push('--minify');
    }

    if (options.watch) {
      tailwindCmd.push('--watch');
    }

    const proc = Bun.spawn(tailwindCmd, {
      stdout: 'pipe',
      stderr: 'pipe',
    });

    if (!options.watch) {
      const result = await proc.exited;
      if (result === 0) {
        console.log('✅ CSS build completed');
      } else {
        const stderr = await new Response(proc.stderr).text();
        console.error('❌ CSS build failed:', stderr);
        process.exit(1);
      }
    } else {
      console.log('👀 Watching CSS files...');
      return proc;
    }

    return proc;
  } catch (error) {
    console.error('❌ CSS build error:', error);
    process.exit(1);
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
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ JavaScript build error:', error);
    process.exit(1);
  }
}

async function buildAssets(options: BuildOptions = {}) {
  console.log('🔨 Building assets...');

  if (options.watch) {
    console.log('👀 Starting watch mode...');

    // Build JS once, then start CSS watch (CSS watch runs continuously)
    await buildJS(options);
    await buildCSS(options); // This starts the CSS watcher

    console.log('✅ Watch mode started - CSS and JS will rebuild on changes');
  } else {
    // Build both in parallel for production
    await Promise.all([buildJS(options), buildCSS(options)]);
    console.log('📦 All assets built successfully');
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

export { buildAssets, buildJS, buildCSS };
