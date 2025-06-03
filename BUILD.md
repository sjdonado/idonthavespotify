# Build System

This project has migrated from Vite to Bun's native build system for better performance and simpler tooling.

## Overview

The build system handles two main asset types:
- **CSS**: Tailwind CSS processed via PostCSS 
- **JavaScript**: Stimulus controllers bundled with Bun

## Architecture

```
src/views/controllers/index.js  →  public/assets/index.js
src/views/css/index.css        →  public/assets/index.min.css
```

The Bun server (`src/index.ts`) serves these assets via the `/assets/*` route.

## Available Commands

### Development
```bash
# Start development server with file watching
bun run dev

# Alternative: run components separately  
bun run dev:simple

# Watch assets only
bun run watch:assets

# Watch server only
bun run watch:server
```

### Production
```bash
# Build optimized assets
bun run build
```

### Individual Asset Building
```bash
# Watch JavaScript only
bun run watch:js

# Watch CSS only  
bun run watch:css
```

## Build Configuration

The build system is configured in `build.config.ts`:

- **JavaScript**: Bundled using Bun's native bundler
- **CSS**: Processed using Tailwind CLI with PostCSS
- **Watching**: File changes trigger automatic rebuilds
- **Minification**: Enabled in production mode

## Stimulus Controllers

Controllers are registered manually in `src/views/controllers/loader.js` instead of using Vite's `import.meta.glob()`. This provides better compatibility with Bun's bundler.

## Key Differences from Vite

1. **No more Vite config** - Build logic moved to `build.config.ts`
2. **Separate CSS processing** - Tailwind runs independently 
3. **Manual controller registration** - Explicit imports instead of glob patterns
4. **Native Bun bundling** - Faster builds with zero config
5. **Simplified dependencies** - Removed Vite and related packages

## File Structure

```
build.config.ts                    # Build configuration
dev-server.ts                      # Development server
src/views/controllers/
  ├── index.js                     # Entry point (no CSS import)
  ├── loader.js                    # Manual controller registration
  └── *_controller.js              # Individual controllers
src/views/css/index.css            # CSS entry with Tailwind directives
public/assets/
  ├── index.js                     # Bundled JavaScript
  └── index.min.css               # Processed CSS
```

## Dependencies

### Runtime
- `@hotwired/stimulus` - Frontend framework
- `tailwindcss` - CSS framework
- `postcss` + `autoprefixer` - CSS processing

### Removed
- `vite` - Replaced with Bun
- `stimulus-vite-helpers` - Manual registration used
- `rollup-plugin-copy` - Not needed

## Performance Benefits

- **Faster builds**: Bun's native bundler is significantly faster than Rollup/Vite
- **Fewer dependencies**: Reduced node_modules size
- **Simpler toolchain**: Single runtime for both building and serving
- **Better watching**: More reliable file change detection